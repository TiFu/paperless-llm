import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { paperlessLogin, uploadDocument, waitForDocumentByTitle, getDocument } from './helpers/paperless.js';
import { login, submitJob, waitForJobState } from './helpers/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = join(__dirname, '../../dev/consume/invoice_Greg Matthias_15376.pdf');

test('approval workflow: an operator rejects the LLM-proposed tags, and Paperless is left untouched', async ({ page }) => {
  // Submitted via the API (workflowType: approval) — job creation through the UI is
  // already covered by approval-workflow-ui.spec.ts; this test is about the reject path.
  const jwt = await login('admin', 'admin');
  const paperlessToken = await paperlessLogin('admin', 'admin');

  const title = `e2e-rejection-${Date.now()}`;
  await uploadDocument(paperlessToken, SAMPLE_PDF, title, []);
  const document = await waitForDocumentByTitle(paperlessToken, title, 60_000);

  const job = await submitJob(jwt, document.id, 'approval', ['tags']);
  await waitForJobState(jwt, job.id, ['pending_approval'], 60_000);

  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/documents$/);

  await page.getByRole('link', { name: /approvals/i }).click();
  await expect(page).toHaveURL(/\/approvals$/);

  const approvalCard = page.locator('.MuiCard-root', { hasText: `Job #${job.id.slice(0, 8)}` });
  await expect(approvalCard).toBeVisible();
  // Unlike APPROVED, REJECTED isn't gated on proposedActions being non-empty —
  // see ApprovalCard.tsx's isApproveDisabled, which only disables the approve button.
  await approvalCard.getByRole('button', { name: 'REJECTED' }).click();
  await expect(approvalCard).toBeHidden();

  const rejectedJob = await waitForJobState(jwt, job.id, ['rejected'], 15_000);
  expect(rejectedJob.status).toBe('rejected');

  // PENDING_APPROVAL + REJECTED routes through the non-terminal cleanup_after_rejection
  // state first (see ApprovalWorkflow.ts), which runs a REMOVE_TAGS step so a rejected
  // document isn't left with its trigger tag for Auto-Queue to immediately re-pick-up.
  // The workflow never reaches UpdateDocumentStep, so document fields are untouched;
  // the document was uploaded with no tags, so the tag cleanup is a no-op here.
  const untouchedDocument = await getDocument(paperlessToken, document.id);
  expect(untouchedDocument.tags).toEqual([]);
});
