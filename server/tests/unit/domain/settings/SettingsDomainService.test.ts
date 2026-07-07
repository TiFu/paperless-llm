import { validateAppSettings, normalizeAutoProcessTags } from '../../../../src/domain/settings/SettingsDomainService.js';
import { AppSettingsData } from '../../../../src/domain/settings/AppSettingsTypes.js';
import { DOCUMENT_FIELDS } from '../../../../src/domain/steps/StepFactory.js';
import { WorkflowType } from '../../../../src/domain/workflows/WorkflowType.js';

function validSettings(overrides: Partial<AppSettingsData> = {}): AppSettingsData {
  return {
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
    ...overrides,
  };
}

describe('validateAppSettings', () => {
  it('returns no errors for valid settings', () => {
    expect(validateAppSettings(validSettings())).toEqual([]);
  });

  it('rejects a non-positive step batch size', () => {
    const errors = validateAppSettings(validSettings({ stepExecution: { enabled: true, batchSize: 0, pollIntervalMs: 3000 } }));
    expect(errors).toContain('workers.stepExecution.batchSize must be greater than 0');
  });

  it('rejects a step poll interval below 100ms', () => {
    const errors = validateAppSettings(validSettings({ stepExecution: { enabled: true, batchSize: 5, pollIntervalMs: 50 } }));
    expect(errors).toContain('workers.stepExecution.pollIntervalMs must be at least 100ms');
  });

  it('rejects stuck-step timeout/checkInterval below 1000ms', () => {
    const errors = validateAppSettings(validSettings({ stuckStepReset: { enabled: true, timeoutMs: 500, checkIntervalMs: 500 } }));
    expect(errors).toContain('workers.stuckStepReset.timeoutMs must be at least 1000ms');
    expect(errors).toContain('workers.stuckStepReset.checkIntervalMs must be at least 1000ms');
  });

  it('rejects an auto-queue poll interval below 1000ms', () => {
    const errors = validateAppSettings(validSettings({ autoQueue: { enabled: false, pollIntervalMs: 500 } }));
    expect(errors).toContain('workers.autoQueue.pollIntervalMs must be at least 1000ms');
  });

  it('rejects an out-of-range llm temperature', () => {
    expect(validateAppSettings(validSettings({ llmTemperature: -0.1 }))).toContain(
      'llm.temperature must be between 0 and 2',
    );
    expect(validateAppSettings(validSettings({ llmTemperature: 2.1 }))).toContain(
      'llm.temperature must be between 0 and 2',
    );
  });

  it('rejects an empty auto-process tag name', () => {
    const errors = validateAppSettings(
      validSettings({ paperlessAutoProcessTags: [{ tag: '', fields: [...DOCUMENT_FIELDS], workflowType: WorkflowType.AUTOMATED }] }),
    );
    expect(errors).toContain('paperless.autoProcessTags[].tag must be a non-empty string');
  });

  it('rejects duplicate auto-process tag names', () => {
    const tag = { tag: 'dup', fields: [...DOCUMENT_FIELDS], workflowType: WorkflowType.AUTOMATED };
    const errors = validateAppSettings(validSettings({ paperlessAutoProcessTags: [tag, tag] }));
    expect(errors.some((e) => e.includes('duplicate tag'))).toBe(true);
  });

  it('rejects auto-queue enabled with no auto-process tags', () => {
    const errors = validateAppSettings(
      validSettings({ autoQueue: { enabled: true, pollIntervalMs: 60000 }, paperlessAutoProcessTags: [] }),
    );
    expect(errors).toContain('workers.autoQueue.enabled is true but paperless.autoProcessTags is empty');
  });

  it('collects every violation at once rather than failing fast', () => {
    const errors = validateAppSettings(
      validSettings({
        stepExecution: { enabled: true, batchSize: 0, pollIntervalMs: 3000 },
        llmTemperature: 5,
      }),
    );
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('normalizeAutoProcessTags', () => {
  it('defaults fields to all DOCUMENT_FIELDS and workflowType to automated when omitted', () => {
    expect(normalizeAutoProcessTags([{ tag: 'llm-auto-process' }])).toEqual([
      { tag: 'llm-auto-process', fields: [...DOCUMENT_FIELDS], workflowType: WorkflowType.AUTOMATED },
    ]);
  });

  it('honors explicit fields/workflowType overrides per tag', () => {
    expect(normalizeAutoProcessTags([{ tag: 'llm-invoice', fields: ['title', 'tags'], workflowType: 'approval' }])).toEqual([
      { tag: 'llm-invoice', fields: ['title', 'tags'], workflowType: WorkflowType.APPROVAL },
    ]);
  });

  it('throws for an invalid workflowType string', () => {
    expect(() => normalizeAutoProcessTags([{ tag: 't', workflowType: 'bogus' }])).toThrow(/Invalid workflow type/);
  });
});
