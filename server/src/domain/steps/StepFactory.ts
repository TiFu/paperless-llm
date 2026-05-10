import { IStep, StepStatus, StepType } from './IStep.js';
import { LLMGenerateTitleStep } from './automated/LLMGenerateTitleStep.js';
import { UpdateDocumentStep } from './automated/UpdateDocumentStep.js';
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
    type: StepType, stepState: StepStatus, retryCount: number = 0): IStep {
    switch (type) {
      case StepType.LLM_GENERATE_TITLE:
        return new LLMGenerateTitleStep(stepId, jobId, stepState, retryCount);

      case StepType.REQUIRE_APPROVAL:
        return new ApprovalInteractionStep(stepId, jobId, stepState, retryCount);

      case StepType.UPDATE_DOCUMENT:
        return new UpdateDocumentStep(stepId, jobId, stepState, retryCount);

      default:
        throw new Error(`Unknown step type: ${type}`);
    }
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
   * Create a step instance from a database row
   * Maps snake_case column names to the appropriate IStep subclass
   */
  static fromDb(row: any): IStep {
    const stepId = row.id;
    const jobId = row.job_id;
    const type = row.type as StepType;
    const status = row.status as StepStatus;
    const retryCount = row.retry_count || 0;

    return StepFactory.create(stepId, jobId, type, status, retryCount);
  }
}
