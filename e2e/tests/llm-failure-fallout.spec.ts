import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { paperlessLogin, uploadDocument, waitForDocumentByTitle, getDocument } from './helpers/paperless.js';
import { login, submitJob, waitForStepStatus, cancelStep, waitForJobState } from './helpers/server.js';
import { LLM_FAILURE_TRIGGER } from './helpers/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = join(__dirname, '../../dev/consume/invoice_Greg Hansen_23791.pdf');

test('LLM failure: a step that keeps failing exhausts retries, falls out, and an operator can manually fail the job', async () => {
  const jwt = await login('admin', 'admin');
  const paperlessToken = await paperlessLogin('admin', 'admin');

  // The title gets interpolated into the LLM_GENERATE_TAGS prompt template (see
  // server/migrations/017_update_minimal_prompts.sql, {{documentTitle}}), so the
  // stub LLM (e2e/stub-llm/server.mjs) deterministically fails every call made
  // while processing this document — no real LLM outage needed to test this path.
  const title = `e2e-llm-failure-${Date.now()} ${LLM_FAILURE_TRIGGER}`;
  await uploadDocument(paperlessToken, SAMPLE_PDF, title, []);
  const document = await waitForDocumentByTitle(paperlessToken, title, 60_000);

  const job = await submitJob(jwt, document.id, 'automated', ['tags']);

  // docker/e2e-config.yaml: retry.maxRetries=3, retryDelayInMs=1000, retryExponent=2
  // -> roughly a 2s then 4s backoff before the step exhausts its retries and falls out.
  const falloutStep = await waitForStepStatus(jwt, job.id, 'in_fallout', 30_000);

  // A fallout step doesn't fail the job on its own — it needs an operator to
  // intervene (retry or cancel), so the job is stuck in llm_processing until then.
  const stuckJob = await waitForJobState(jwt, job.id, ['llm_processing'], 5_000);
  expect(stuckJob.status).toBe('llm_processing');

  await cancelStep(jwt, falloutStep.stepId);
  const failedJob = await waitForJobState(jwt, job.id, ['failed'], 15_000);
  expect(failedJob.status).toBe('failed');

  // The workflow never reached UpdateDocumentStep, so Paperless was never touched.
  const untouchedDocument = await getDocument(paperlessToken, document.id);
  expect(untouchedDocument.tags).toEqual([]);
});
