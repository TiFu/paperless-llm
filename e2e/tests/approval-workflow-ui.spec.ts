import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { paperlessLogin, uploadDocument, waitForDocumentByTitle, getOrCreateTag } from './helpers/paperless.js';
import { login, waitForJobState } from './helpers/server.js';
import { STUB_LLM_TAG } from './helpers/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = join(__dirname, '../../dev/consume/invoice_Greg Tran_10403.pdf');

// Hardcoded in frontend/src/pages/DocumentsPage.tsx (DEFAULT_TAG) — the Documents
// page only ever lists documents carrying this tag, independent of server config.
const DOCUMENTS_PAGE_TAG = 'llm-process';

// Fields the Documents page selects by default (DocumentsPage.tsx's DEFAULT_FIELDS).
// We only want the tags field run: the stub LLM always returns the same canned
// tag-array string regardless of which step asked, so the title/correspondent/
// document_type steps would get nonsensical input. Worse, unlike tags,
// PaperlessService.updateDocument doesn't swallow a failed correspondent/document_type
// lookup, so leaving those fields checked would fail the job outright.
const FIELDS_TO_DESELECT = ['title', 'correspondent', 'document_type', 'created_date'];

test('approval workflow: an operator submits a job and approves the LLM-proposed tags, both through the UI', async ({ page }) => {
  // Still log in via the API too — needed for polling job state, which is faster
  // and less brittle than asserting against the UI for every intermediate step.
  const jwt = await login('admin', 'admin');
  const paperlessToken = await paperlessLogin('admin', 'admin');

  // The LLM-proposed tag must already exist in Paperless — updateDocument resolves
  // tag names to existing ids, it never creates new tags on the app's behalf.
  await getOrCreateTag(paperlessToken, STUB_LLM_TAG);
  const documentsPageTagId = await getOrCreateTag(paperlessToken, DOCUMENTS_PAGE_TAG);

  const title = `e2e-approval-${Date.now()}`;
  await uploadDocument(paperlessToken, SAMPLE_PDF, title, [documentsPageTagId]);
  await waitForDocumentByTitle(paperlessToken, title, 60_000);

  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/documents$/);

  // Select the uploaded document, choose the approval workflow, restrict to the
  // tags field, and submit — all through the real Documents page UI.
  await page.getByRole('row', { name: new RegExp(title) }).click();
  await page.getByRole('radio', { name: /approval workflow/i }).click();
  for (const field of FIELDS_TO_DESELECT) {
    await page.getByRole('checkbox', { name: field, exact: true }).uncheck();
  }
  await page.getByRole('button', { name: /submit 1 document/i }).click();

  const viewJobLink = page.getByRole('link', { name: /view job/i });
  await expect(viewJobLink).toBeVisible();
  const href = await viewJobLink.getAttribute('href');
  const jobId = href?.split('/jobs/')[1];
  if (!jobId) throw new Error(`Could not parse job id from "View Job" link href: ${href}`);

  await waitForJobState(jwt, jobId, ['pending_approval'], 60_000);

  await page.getByRole('link', { name: /approvals/i }).click();
  await expect(page).toHaveURL(/\/approvals$/);

  const approvalCard = page.locator('.MuiCard-root', { hasText: `Job #${jobId.slice(0, 8)}` });
  await expect(approvalCard).toBeVisible();
  await approvalCard.getByRole('button', { name: 'APPROVED' }).click();

  // The success toast auto-dismisses after a few seconds, so it's a racy thing to
  // assert on — the card disappearing from the pending list is the durable signal.
  await expect(approvalCard).toBeHidden();

  const completedJob = await waitForJobState(jwt, jobId, ['completed'], 60_000);
  expect(completedJob.status).toBe('completed');
});
