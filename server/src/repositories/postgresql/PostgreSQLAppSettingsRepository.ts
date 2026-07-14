import { PoolClient } from 'pg';
import { AppSettingsRecord, IAppSettingsRepository } from '../../domain/settings/IAppSettingsRepository.js';
import { AppSettingsData } from '../../domain/settings/AppSettingsTypes.js';
import { normalizeAutoProcessTags } from '../../domain/settings/SettingsDomainService.js';
import { DocumentField } from '../../domain/steps/StepFactory.js';
import { LogArea, LogLevel } from '../../utils/LogArea.js';

interface AppSettingsRow {
  paperless_tags: string | null;
  paperless_auto_process_tags: Array<{ tag: string; fields?: DocumentField[]; workflowType?: string }>;
  step_execution_enabled: boolean;
  step_execution_batch_size: number;
  step_execution_poll_interval_ms: number;
  stuck_step_reset_enabled: boolean;
  stuck_step_reset_timeout_ms: number;
  stuck_step_reset_check_interval_ms: number;
  entity_sync_enabled: boolean;
  entity_sync_poll_interval_ms: number;
  auto_queue_enabled: boolean;
  auto_queue_poll_interval_ms: number;
  retry_max_retries: number;
  retry_delay_in_ms: number;
  retry_exponent: number;
  llm_model: string;
  llm_temperature: number;
  llm_timeout_ms: number;
  logging_default: string;
  logging_levels: Partial<Record<string, string>>;
  updated_at: Date;
  updated_by: string | null;
}

export class PostgreSQLAppSettingsRepository implements IAppSettingsRepository {
  constructor(private readonly client: PoolClient) {}

  private static fromRow(row: AppSettingsRow): AppSettingsRecord {
    return {
      paperlessTags: row.paperless_tags ?? undefined,
      paperlessAutoProcessTags: normalizeAutoProcessTags(row.paperless_auto_process_tags),
      stepExecution: {
        enabled: row.step_execution_enabled,
        batchSize: row.step_execution_batch_size,
        pollIntervalMs: row.step_execution_poll_interval_ms,
      },
      stuckStepReset: {
        enabled: row.stuck_step_reset_enabled,
        timeoutMs: row.stuck_step_reset_timeout_ms,
        checkIntervalMs: row.stuck_step_reset_check_interval_ms,
      },
      entitySync: {
        enabled: row.entity_sync_enabled,
        pollIntervalMs: row.entity_sync_poll_interval_ms,
      },
      autoQueue: {
        enabled: row.auto_queue_enabled,
        pollIntervalMs: row.auto_queue_poll_interval_ms,
      },
      retry: {
        maxRetries: row.retry_max_retries,
        retryDelayInMs: row.retry_delay_in_ms,
        retryExponent: row.retry_exponent,
      },
      llmModel: row.llm_model,
      llmTemperature: row.llm_temperature,
      llmTimeoutMs: row.llm_timeout_ms,
      logging: {
        default: row.logging_default as LogLevel,
        levels: row.logging_levels as Partial<Record<LogArea, LogLevel>>,
      },
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    };
  }

  async get(): Promise<AppSettingsRecord> {
    const result = await this.client.query<AppSettingsRow>('SELECT * FROM app_settings WHERE id = 1');
    return PostgreSQLAppSettingsRepository.fromRow(result.rows[0]);
  }

  async update(input: AppSettingsData, updatedBy: string | null): Promise<AppSettingsRecord> {
    const result = await this.client.query<AppSettingsRow>(
      `UPDATE app_settings SET
         paperless_tags = $1,
         paperless_auto_process_tags = $2,
         step_execution_enabled = $3,
         step_execution_batch_size = $4,
         step_execution_poll_interval_ms = $5,
         stuck_step_reset_enabled = $6,
         stuck_step_reset_timeout_ms = $7,
         stuck_step_reset_check_interval_ms = $8,
         entity_sync_enabled = $9,
         entity_sync_poll_interval_ms = $10,
         auto_queue_enabled = $11,
         auto_queue_poll_interval_ms = $12,
         retry_max_retries = $13,
         retry_delay_in_ms = $14,
         retry_exponent = $15,
         llm_model = $16,
         llm_temperature = $17,
         llm_timeout_ms = $18,
         logging_default = $19,
         logging_levels = $20,
         updated_at = NOW(),
         updated_by = $21
       WHERE id = 1
       RETURNING *`,
      [
        input.paperlessTags ?? null,
        JSON.stringify(input.paperlessAutoProcessTags),
        input.stepExecution.enabled,
        input.stepExecution.batchSize,
        input.stepExecution.pollIntervalMs,
        input.stuckStepReset.enabled,
        input.stuckStepReset.timeoutMs,
        input.stuckStepReset.checkIntervalMs,
        input.entitySync.enabled,
        input.entitySync.pollIntervalMs,
        input.autoQueue.enabled,
        input.autoQueue.pollIntervalMs,
        input.retry.maxRetries,
        input.retry.retryDelayInMs,
        input.retry.retryExponent,
        input.llmModel,
        input.llmTemperature,
        input.llmTimeoutMs,
        input.logging.default,
        JSON.stringify(input.logging.levels),
        updatedBy,
      ],
    );
    return PostgreSQLAppSettingsRepository.fromRow(result.rows[0]);
  }
}
