import { withRepositoryTransaction } from '../helpers/db.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { AppSettingsData } from '../../../src/domain/settings/AppSettingsTypes.js';

// Migration 022 seeds a singleton row (id=1) with literal defaults — every
// test starts from that seeded row (per-test transactions roll back, but the
// seed itself is migration-time data, same caveat as prompts).
describe('PostgreSQLAppSettingsRepository (integration)', () => {
  it('get() returns the migration-seeded defaults', async () => {
    await withRepositoryTransaction(async (repos) => {
      const settings = await repos.getSettings().get();

      expect(settings.stepExecution).toEqual({ enabled: true, batchSize: 5, pollIntervalMs: 30000 });
      expect(settings.stuckStepReset).toEqual({ enabled: true, timeoutMs: 300000, checkIntervalMs: 30000 });
      expect(settings.entitySync).toEqual({ enabled: true, pollIntervalMs: 900000 });
      expect(settings.autoQueue).toEqual({ enabled: false, pollIntervalMs: 60000 });
      expect(settings.llmModel).toBe('qwen3:4b');
      expect(settings.paperlessTags).toBe('paperless-llm');
      expect(settings.paperlessAutoProcessTags).toEqual([
        { tag: 'paperless-llm-auto', fields: ['title'], workflowType: WorkflowType.APPROVAL },
      ]);
      expect(settings.updatedBy).toBeNull();
    });
  });

  it('update() persists every field and returns the updated row, including updatedBy', async () => {
    await withRepositoryTransaction(async (repos) => {
      await repos.getUsers().upsert('alice', 'token');

      const input: AppSettingsData = {
        paperlessTags: 'llm-process',
        paperlessAutoProcessTags: [{ tag: 'llm-auto-process', fields: ['title', 'tags'], workflowType: WorkflowType.APPROVAL }],
        stepExecution: { enabled: false, batchSize: 10, pollIntervalMs: 5000 },
        stuckStepReset: { enabled: false, timeoutMs: 600000, checkIntervalMs: 60000 },
        entitySync: { enabled: false, pollIntervalMs: 1800000 },
        autoQueue: { enabled: true, pollIntervalMs: 30000 },
        retry: { maxRetries: 5, retryDelayInMs: 10000, retryExponent: 3 },
        llmModel: 'qwen3:4b',
        llmTemperature: 0.3,
        llmTimeoutMs: 60000,
      };

      const updated = await repos.getSettings().update(input, 'alice');

      expect(updated).toMatchObject(input);
      expect(updated.updatedBy).toBe('alice');

      const reread = await repos.getSettings().get();
      expect(reread).toMatchObject(input);
    });
  });

  it('update() with updatedBy=null clears updatedBy (system-initiated change)', async () => {
    await withRepositoryTransaction(async (repos) => {
      await repos.getUsers().upsert('alice', 'token');
      const input: AppSettingsData = {
        paperlessTags: undefined,
        paperlessAutoProcessTags: [],
        stepExecution: { enabled: true, batchSize: 5, pollIntervalMs: 3000 },
        stuckStepReset: { enabled: true, timeoutMs: 300000, checkIntervalMs: 30000 },
        entitySync: { enabled: true, pollIntervalMs: 900000 },
        autoQueue: { enabled: false, pollIntervalMs: 60000 },
        retry: { maxRetries: 3, retryDelayInMs: 30000, retryExponent: 2 },
        llmModel: 'llama3',
        llmTemperature: 0.7,
        llmTimeoutMs: 30000,
      };

      await repos.getSettings().update(input, 'alice');
      const updated = await repos.getSettings().update(input, null);

      expect(updated.updatedBy).toBeNull();
    });
  });
});
