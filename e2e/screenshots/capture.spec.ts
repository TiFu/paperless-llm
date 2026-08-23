import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { paperlessLogin, uploadDocument, waitForDocumentByTitle, getOrCreateTag } from '../tests/helpers/paperless.js';
import { login, waitForJobState } from '../tests/helpers/server.js';
import { STUB_LLM_TAG, DEFAULT_TAG_FILTER } from '../tests/helpers/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = join(__dirname, '../../dev/consume/invoice_Greg Tran_10403.pdf');
const OUTPUT_DIR = join(__dirname, 'output');

// Same rationale as approval-workflow-ui.spec.ts: the stub LLM always returns the same
// canned tag-array string, so only the tags field produces a sensible result.
const FIELDS_TO_DESELECT = ['title', 'correspondent', 'document_type', 'created_date'];

/**
 * Not a correctness test — this generates the screenshots embedded in README.md and
 * docs/user_guide/screenshots.md by driving one example document through the real
 * approval workflow. Run via `npm run screenshots`, published to the `docs-screenshots`
 * branch by the `screenshots` job in .github/workflows/master.yml.
 */
test('capture application screenshots', async ({ page }) => {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const jwt = await login('admin', 'admin');
  const paperlessToken = await paperlessLogin('admin', 'admin');

  await getOrCreateTag(paperlessToken, STUB_LLM_TAG);
  const documentsPageTagId = await getOrCreateTag(paperlessToken, DEFAULT_TAG_FILTER);

  const title = `screenshot-example-${Date.now()}`;
  await uploadDocument(paperlessToken, SAMPLE_PDF, title, [documentsPageTagId]);
  await waitForDocumentByTitle(paperlessToken, title, 60_000);

  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/documents$/);

  await page.getByRole('row', { name: new RegExp(title) }).click();
  await page.screenshot({ path: join(OUTPUT_DIR, 'documents.png') });

  await page.getByRole('radio', { name: /approval workflow/i }).click();
  for (const field of FIELDS_TO_DESELECT) {
    const label = new RegExp(`^${field.replace(/_/g, ' ')}$`, 'i');
    await page.getByRole('checkbox', { name: label }).uncheck();
  }
  await page.getByRole('button', { name: /submit 1 document/i }).click();

  const viewJobLink = page.getByRole('link', { name: /view job/i });
  await expect(viewJobLink).toBeVisible();
  const href = await viewJobLink.getAttribute('href');
  const jobId = href?.split('/jobs/')[1];
  if (!jobId) throw new Error(`Could not parse job id from "View Job" link href: ${href}`);

  await page.goto('/jobs');
  await expect(page.getByRole('row', { name: new RegExp(jobId.slice(0, 8)) }).first()).toBeVisible();
  await page.screenshot({ path: join(OUTPUT_DIR, 'jobs.png') });

  await waitForJobState(jwt, jobId, ['pending_approval'], 60_000);

  await page.goto('/approvals');
  const approvalCard = page.locator('.MuiCard-root', { hasText: `Job #${jobId.slice(0, 8)}` });
  await expect(approvalCard).toBeVisible();
  await page.screenshot({ path: join(OUTPUT_DIR, 'approval.png') });

  await approvalCard.getByRole('button', { name: 'APPROVED' }).click();
  await expect(approvalCard).toBeHidden();

  await waitForJobState(jwt, jobId, ['completed'], 60_000);

  await page.goto(`/jobs/${jobId}`);
  await expect(page.getByText(/completed/i).first()).toBeVisible();
  await page.screenshot({ path: join(OUTPUT_DIR, 'job-details.png') });

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  await page.screenshot({ path: join(OUTPUT_DIR, 'settings.png') });
});
