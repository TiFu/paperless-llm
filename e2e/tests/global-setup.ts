import { login, waitForHealthy, SERVER_URL } from './helpers/server.js';
import { AUTO_QUEUE_TAG, DEFAULT_TAG_FILTER } from './helpers/constants.js';

/**
 * Non-technical settings (auto-process tags, worker timing, retry policy,
 * LLM model/temperature/timeout) used to be hardcoded in docker/e2e-config.yaml
 * for fast, deterministic e2e runs. They now live in the database and are
 * only editable via PUT /api/settings (see server/src/api/routes/settings.ts),
 * so this one-time setup logs in as the Paperless superuser (the same
 * admin/admin the specs already use — see docker/docker-compose.e2e.yml's
 * PAPERLESS_ADMIN_USER/PASSWORD, which is auto-granted the 'settings'
 * permission on login) and configures them before any spec runs.
 */
export default async function globalSetup(): Promise<void> {
  await waitForHealthy();
  const jwt = await login('admin', 'admin');

  const response = await fetch(`${SERVER_URL}/api/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      paperless: {
        tags: DEFAULT_TAG_FILTER,
        autoProcessTags: [{ tag: AUTO_QUEUE_TAG, fields: ['tags'], workflowType: 'automated' }],
      },
      workers: {
        stepExecution: { enabled: true, batchSize: 5, pollIntervalMs: 1000 },
        stuckStepReset: { enabled: true, timeoutMs: 300000, checkIntervalMs: 30000 },
        entitySync: { enabled: true, pollIntervalMs: 900000 },
        autoQueue: { enabled: true, pollIntervalMs: 3000 },
      },
      retry: { maxRetries: 3, retryDelayInMs: 1000, retryExponent: 2 },
      llm: { model: 'stub-model', temperature: 0, timeoutMs: 10000 },
      logging: { defaultLevel: 'info', levels: {} },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to configure e2e settings: ${response.status} ${await response.text()}`);
  }
}
