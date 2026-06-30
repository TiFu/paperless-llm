import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  paperlessLogin,
  getOrCreateTag,
  uploadDocument,
  waitForDocumentByTitle,
  getDocument,
  getTagNamesByIds,
} from './helpers/paperless.js';
import { login, waitForJobForDocument, waitForJobState, getJobAuditLog } from './helpers/server.js';
import { AUTO_QUEUE_TAG, STUB_LLM_TAG } from './helpers/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Reuses an existing fixture rather than adding a new one — see dev/consume/ for the full set.
const SAMPLE_PDF = join(__dirname, '../../dev/consume/invoice_Greg Tran_6712.pdf');

test('automated workflow: a tagged document is auto-queued, processed by the LLM step, and re-tagged in Paperless', async () => {
  // Logging in server-side first matters: DocumentAutoQueueApplicationService only
  // looks for documents on behalf of users that already exist in its `users` table.
  const jwt = await login('admin', 'admin');
  const paperlessToken = await paperlessLogin('admin', 'admin');

  // The LLM-proposed tag must already exist in Paperless — updateDocument resolves
  // tag names to existing ids, it never creates new tags on the app's behalf.
  await getOrCreateTag(paperlessToken, STUB_LLM_TAG);

  const title = `e2e-automated-${Date.now()}`;
  const triggerTagId = await getOrCreateTag(paperlessToken, AUTO_QUEUE_TAG);
  await uploadDocument(paperlessToken, SAMPLE_PDF, title, [triggerTagId]);
  const document = await waitForDocumentByTitle(paperlessToken, title, 60_000);

  const job = await waitForJobForDocument(jwt, document.id, 60_000);
  expect(job.jobType).toBe('automated');

  const completedJob = await waitForJobState(jwt, job.id, ['completed'], 60_000);
  expect(completedJob.status).toBe('completed');

  const updatedDocument = await getDocument(paperlessToken, document.id);
  const tagNames = await getTagNamesByIds(paperlessToken, updatedDocument.tags);
  // Applied by the stub LLM's deterministic response (e2e/stub-llm/server.mjs).
  expect(tagNames).toContain(STUB_LLM_TAG);
  // Removed by the workflow's removing_tags step once processing completes.
  expect(tagNames).not.toContain(AUTO_QUEUE_TAG);

  const auditLog = await getJobAuditLog(jwt, job.id);
  expect(auditLog.length).toBeGreaterThan(0);
});
