import { WorkflowType } from '../workflows/WorkflowType.js';
import { DOCUMENT_FIELDS, DocumentField } from '../steps/StepFactory.js';
import { AppSettingsData, AutoProcessTagConfig } from './AppSettingsTypes.js';

/**
 * Validates a full non-technical settings payload, collecting every
 * violation instead of throwing on the first — callers get one clear list
 * of everything wrong with a submitted value, rather than a single error at
 * a time. Ported from AppConfig's former validate()/validateLLMConfig()/
 * validateAutoQueueConfig() (fail-fast boot-time checks), now applied both
 * to incoming API writes and to AppConfig's own periodic re-read of the DB row.
 */
export function validateAppSettings(input: AppSettingsData): string[] {
  const errors: string[] = [];

  if (input.stepExecution.batchSize < 1) {
    errors.push('workers.stepExecution.batchSize must be greater than 0');
  }
  if (input.stepExecution.pollIntervalMs < 100) {
    errors.push('workers.stepExecution.pollIntervalMs must be at least 100ms');
  }
  if (input.stuckStepReset.timeoutMs < 1000) {
    errors.push('workers.stuckStepReset.timeoutMs must be at least 1000ms');
  }
  if (input.stuckStepReset.checkIntervalMs < 1000) {
    errors.push('workers.stuckStepReset.checkIntervalMs must be at least 1000ms');
  }
  if (input.autoQueue.pollIntervalMs < 1000) {
    errors.push('workers.autoQueue.pollIntervalMs must be at least 1000ms');
  }
  if (input.llmTemperature < 0 || input.llmTemperature > 2) {
    errors.push('llm.temperature must be between 0 and 2');
  }

  if (input.paperlessAutoProcessTags.some(({ tag }) => !tag || tag.trim().length === 0)) {
    errors.push('paperless.autoProcessTags[].tag must be a non-empty string');
  }
  const tagNames = input.paperlessAutoProcessTags.map(t => t.tag);
  const duplicates = tagNames.filter((tag, index) => tagNames.indexOf(tag) !== index);
  if (duplicates.length > 0) {
    errors.push(`paperless.autoProcessTags contains duplicate tag(s): ${[...new Set(duplicates)].join(', ')}`);
  }

  if (input.autoQueue.enabled && input.paperlessAutoProcessTags.length === 0) {
    errors.push('workers.autoQueue.enabled is true but paperless.autoProcessTags is empty');
  }

  return errors;
}

/**
 * Applies the same defaulting rules AppConfig's constructor used to apply
 * inline: fields default to every document field, workflowType defaults to
 * AUTOMATED. Used both when parsing an incoming write and when loading a row
 * back out of the database.
 */
export function normalizeAutoProcessTags(
  raw: Array<{ tag: string; fields?: DocumentField[]; workflowType?: string }>,
): AutoProcessTagConfig[] {
  return raw.map(t => ({
    tag: t.tag,
    fields: t.fields ?? [...DOCUMENT_FIELDS],
    workflowType: parseWorkflowType(t.workflowType) ?? WorkflowType.AUTOMATED,
  }));
}

function parseWorkflowType(value: string | undefined): WorkflowType | undefined {
  if (!value) return undefined;

  const normalized = value.toLowerCase();
  if (normalized === 'automated') return WorkflowType.AUTOMATED;
  if (normalized === 'approval') return WorkflowType.APPROVAL;

  throw new Error(`Invalid workflow type: ${value}. Must be 'automated' or 'approval'`);
}
