import { IStep, StepStatus, StepType } from './IStep.js';
import { LLMGenerateTitleStep } from './automated/LLMGenerateTitleStep.js';
import { LLMGenerateFieldsStep } from './automated/LLMGenerateFieldsStep.js';
import { LLMGenerateTagsStep } from './automated/LLMGenerateTagsStep.js';
import { LLMGenerateCorrespondentStep } from './automated/LLMGenerateCorrespondentStep.js';
import { LLMGenerateDocumentTypeStep } from './automated/LLMGenerateDocumentTypeStep.js';
import { LLMGenerateCreatedDateStep } from './automated/LLMGenerateCreatedDateStep.js';
import { UpdateDocumentStep } from './automated/UpdateDocumentStep.js';
import { RemoveTagsStep } from './automated/RemoveTagsStep.js';
import { IDocumentManagementSystem } from '../document/IDocumentManagementSystem.js';
import { OllamaService } from '../../services/OllamaService.js';
import { IPromptsRepository } from '../prompt/IPromptsRepository.js';
import { ApprovalInteractionStep } from './userinteraction/UserInteractionStep.js';

/**
 * Type-safe dependency interfaces for each step type
 */
export interface WorkflowContext {
  dmsService: IDocumentManagementSystem;
  ollamaService: OllamaService;
  promptsRepo: IPromptsRepository;
}

/**
 * Factory for creating step implementations with type-safe dependencies
 */
export class StepFactory {
  /**
   * Generic create method that routes to specific factory methods
   * Used by StepExecutorApplicationService
   */
  static create(
    stepId: string | null,
    jobId: string,
    type: StepType, 
    stepState: StepStatus, 
    retryCount: number = 0,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, any> | null = null
  ): IStep {
    switch (type) {
      case StepType.LLM_GENERATE_TITLE:
        return new LLMGenerateTitleStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      case StepType.LLM_GENERATE_FIELDS:
        return new LLMGenerateFieldsStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      case StepType.LLM_GENERATE_TAGS:
        return new LLMGenerateTagsStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      case StepType.LLM_GENERATE_CORRESPONDENT:
        return new LLMGenerateCorrespondentStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      case StepType.LLM_GENERATE_DOCUMENT_TYPE:
        return new LLMGenerateDocumentTypeStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      case StepType.LLM_GENERATE_CREATED_DATE:
        return new LLMGenerateCreatedDateStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      case StepType.REQUIRE_APPROVAL:
        return new ApprovalInteractionStep(stepId, jobId, stepState, retryCount, retryAfter);

      case StepType.UPDATE_DOCUMENT:
        return new UpdateDocumentStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      case StepType.REMOVE_TAGS:
        return new RemoveTagsStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      default:
        throw new Error(`Unknown step type: ${type}`);
    }
  }

  /**
   * Shorthand: Create a new LLM Generate Fields step (composite, not yet persisted)
   */
  static newLLMGenerateFieldsStep(jobId: string, fields: string[]): IStep {
    const configuration = { fields };
    return new LLMGenerateFieldsStep(null, jobId, StepStatus.WAITING, 0, null, null, null, configuration);
  }

  /**
   * Shorthand: Create a new LLM Generate Title step (not yet persisted)
   */
  static newLLMGenerateTitleStep(jobId: string): IStep {
    return new LLMGenerateTitleStep(null, jobId, StepStatus.WAITING);
  }

  /**
   * Shorthand: Create a new Require Approval step (not yet persisted)
   */
  static newRequireApprovalStep(jobId: string): IStep {
    return new ApprovalInteractionStep(null, jobId, StepStatus.WAITING);
  }

  /**
   * Shorthand: Create a new Update Document step (not yet persisted)
   */
  static newUpdateDocumentStep(jobId: string): IStep {
    return new UpdateDocumentStep(null, jobId, StepStatus.WAITING);
  }

  /**
   * Shorthand: Create a new Remove Tags step (not yet persisted)
   */
  static newRemoveTagsStep(jobId: string): IStep {
    return new RemoveTagsStep(null, jobId, StepStatus.WAITING);
  }

  /**
   * Create a step instance from a database row
   * Maps snake_case column names to the appropriate IStep subclass
   */
  static fromDb(row: any): IStep {
    const stepId = row.id;
    const jobId = row.job_id;
    const type = row.type as StepType;
    const status = row.status as StepStatus;
    const retryCount = row.retry_count || 0;
    const retryAfter = row.retry_after ? new Date(row.retry_after) : null;
    const startedAt = row.started_at ? new Date(row.started_at) : null;
    const parentStepId = row.parent_step_id || null;
    const configuration = row.configuration || null;

    return StepFactory.create(stepId, jobId, type, status, retryCount, retryAfter, startedAt, parentStepId, configuration);
  }
}
