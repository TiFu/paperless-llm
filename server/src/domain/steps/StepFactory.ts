import { IStep, StepStatus, StepType } from './IStep.js';
import crypto from 'node:crypto';
import { LLMGenerateTitleStep } from './automated/LLMGenerateTitleStep.js';
import { LLMGenerateTagsStep } from './automated/LLMGenerateTagsStep.js';
import { LLMGenerateCorrespondentStep } from './automated/LLMGenerateCorrespondentStep.js';
import { LLMGenerateDocumentTypeStep } from './automated/LLMGenerateDocumentTypeStep.js';
import { LLMGenerateCreatedDateStep } from './automated/LLMGenerateCreatedDateStep.js';
import { UpdateDocumentStep } from './automated/UpdateDocumentStep.js';
import { RemoveTagsStep } from './automated/RemoveTagsStep.js';
import { IDocumentManagementSystem } from '../document/IDocumentManagementSystem.js';
import { OllamaService } from '../../services/OllamaService.js';
import { IPromptsRepository } from '../prompt/IPromptsRepository.js';
import { ApprovalInteractionStep, ManualStep } from './userinteraction/ManualStep.js';
import { CompositeStep } from './automated/CompositeStep.js';
import { ExecutableStep } from './automated/ExecutableStep.js';

/**
 * Type-safe dependency interfaces for each step type
 */
export interface WorkflowContext {
  dmsService: IDocumentManagementSystem;
  ollamaService: OllamaService;
  promptsRepo: IPromptsRepository;
}

export const DOCUMENT_FIELDS = [ "title", "tags", "correspondent", "document_type", "created_date"] as const;
export type DocumentFieldTuple = typeof DOCUMENT_FIELDS
export type DocumentField = DocumentFieldTuple[number]
/**
 * Factory for creating step implementations with type-safe dependencies
 */
export class StepFactory {
  private readonly FIELD_TO_STEP_TYPE_MAP: Record<string, StepType> = {
    'title': StepType.LLM_GENERATE_TITLE,
    'tags': StepType.LLM_GENERATE_TAGS,
    'correspondent': StepType.LLM_GENERATE_CORRESPONDENT,
    'document_type': StepType.LLM_GENERATE_DOCUMENT_TYPE,
    'created_date': StepType.LLM_GENERATE_CREATED_DATE,
  };


  /**
   * Generic create method that routes to specific factory methods
   * Used by StepExecutorApplicationService
   */
  create(
    stepId: string | null,
    jobId: string,
    type: StepType, 
    stepState: StepStatus, 
    childSteps: Array<IStep>,
    retryCount: number = 0,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, unknown> | null = null
  ): IStep {
    // If no stepId provided, generate one app side
    stepId = stepId ? stepId : crypto.randomUUID();
    switch (type) {
      case StepType.LLM_GENERATE_TITLE:
        return new LLMGenerateTitleStep(stepId, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);

      case StepType.LLM_GENERATE_FIELDS:
        return new CompositeStep(stepId, StepType.LLM_GENERATE_FIELDS, jobId, stepState, retryCount, childSteps, retryAfter, startedAt, parentStepId, configuration);

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

 private generateChildStepsForLLMGenerateFieldsStep(jobId: string, parentStepId: string, config: Record<string, unknown>): IStep[] {
    if (!config || !Array.isArray(config.fields)) {
      throw new Error('LLMGenerateFieldsStep requires configuration with "fields" array');
    }
    const childSteps: IStep[] = [];
    const fields = config.fields as string[];

    for (const fieldName of fields) {
      const stepType = this.FIELD_TO_STEP_TYPE_MAP[fieldName];
      if (!stepType) {
        throw new Error(`Unknown field name: ${fieldName}. Supported: ${Object.keys(this.FIELD_TO_STEP_TYPE_MAP).join(', ')}`);
      }

      // Create child step with parent reference
      const childStep = this.create(
        crypto.randomUUID(), // No ID yet, will be assigned on insert
        jobId,
        stepType,
        StepStatus.WAITING,
        [],
        0, // No retries yet
        null, // No retry timer
        null, // No started at
        parentStepId, // Injected later
        null // No configuration
      );

      childSteps.push(childStep);
    }

    return childSteps;  
 }

  /**
   * Shorthand: Create a new LLM Generate Fields step (composite, not yet persisted)
   */
  newLLMGenerateFieldsStep(jobId: string, fields: DocumentField[]): CompositeStep {
    const configuration = { fields };
    const parentId = crypto.randomUUID();
    const children = this.generateChildStepsForLLMGenerateFieldsStep(jobId, parentId, configuration)
    return new CompositeStep(parentId, StepType.LLM_GENERATE_FIELDS, jobId, StepStatus.WAITING, 0, children, null, null, null, configuration)
  }

  /**
   * Shorthand: Create a new LLM Generate Title step (not yet persisted)
   */
  newLLMGenerateTitleStep(jobId: string): ExecutableStep {
    return new LLMGenerateTitleStep(crypto.randomUUID(), jobId, StepStatus.WAITING);
  }

  /**
   * Shorthand: Create a new Require Approval step (not yet persisted)
   */
  newRequireApprovalStep(jobId: string): ManualStep {
    return new ApprovalInteractionStep(crypto.randomUUID(), jobId, StepStatus.WAITING);
  }

  /**
   * Shorthand: Create a new Update Document step (not yet persisted)
   */
  newUpdateDocumentStep(jobId: string): ExecutableStep {
    return new UpdateDocumentStep(crypto.randomUUID(), jobId, StepStatus.WAITING);
  }

  /**
   * Shorthand: Create a new Remove Tags step (not yet persisted)
   */
  newRemoveTagsStep(jobId: string): ExecutableStep {
    return new RemoveTagsStep(crypto.randomUUID(), jobId, StepStatus.WAITING);
  }

  /**
   * Create a step instance from a database row
   * Maps snake_case column names to the appropriate IStep subclass
   */
  static fromDb(row: Record<string, unknown>, children: IStep[]): IStep {
    const stepId = row.id as string;
    const jobId = row.job_id as string;
    const type = row.type as StepType;
    const status = row.status as StepStatus;
    const retryCount = (row.retry_count as number) || 0;
    const retryAfter = row.retry_after ? new Date(row.retry_after as string) : null;
    const startedAt = row.started_at ? new Date(row.started_at as string) : null;
    const parentStepId = (row.parent_id as string) || null;
    const configuration = (row.configuration as Record<string, unknown>) || null;

    const factory = new StepFactory()
    return factory.create(stepId, jobId, type, status, children, retryCount, retryAfter, startedAt, parentStepId, configuration);
  }
}
