import { WorkflowType } from '../workflows/WorkflowType.js';
import { DocumentField } from '../steps/StepFactory.js';
import { RetryConfig } from '../steps/IStep.js';

/**
 * A single auto-processing tag configuration: documents carrying `tag` in
 * Paperless are picked up by the auto-queue and processed to generate
 * `fields`, using `workflowType`.
 */
export interface AutoProcessTagConfig {
  readonly tag: string;
  readonly fields: DocumentField[];
  readonly workflowType: WorkflowType;
}

export interface StepExecutionSettings {
  readonly enabled: boolean;
  readonly batchSize: number;
  readonly pollIntervalMs: number;
}

/**
 * Stuck-step-reset loop configuration. Retry limits for the steps it resets
 * come from RetryConfig, not from here.
 */
export interface StuckStepResetSettings {
  readonly enabled: boolean;
  readonly timeoutMs: number;
  readonly checkIntervalMs: number;
}

export interface EntitySyncSettings {
  readonly enabled: boolean;
  readonly pollIntervalMs: number;
}

/**
 * Automated document queue settings. Which tags trigger auto-processing (and
 * which fields/workflowType they use) is configured via autoProcessTags, not here.
 */
export interface AutoQueueSettings {
  readonly enabled: boolean;
  readonly pollIntervalMs: number;
}

/**
 * The full set of non-technical, live-editable settings — the shape shared by
 * AppConfig's internal snapshot, the settings repository, and the domain
 * validation logic.
 */
export interface AppSettingsData {
  readonly paperlessTags?: string;
  readonly paperlessAutoProcessTags: AutoProcessTagConfig[];
  readonly stepExecution: StepExecutionSettings;
  readonly stuckStepReset: StuckStepResetSettings;
  readonly entitySync: EntitySyncSettings;
  readonly autoQueue: AutoQueueSettings;
  readonly retry: RetryConfig;
  readonly llmModel: string;
  readonly llmTemperature: number;
  readonly llmTimeoutMs: number;
}
