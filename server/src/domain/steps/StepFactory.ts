import { IStep, StepStatus, StepType } from './IStep';
import { LLMGenerateTitleStep } from './automated/LLMGenerateTitleStep';
import { UpdateDocumentStep } from './automated/UpdateDocumentStep';
import { IDocumentManagementSystem } from '../document/IDocumentManagementSystem';
import { OllamaService } from '../../services/OllamaService';
import { IPromptsRepository } from '../prompt/IPromptsRepository';
import { ApprovalInteractionStep } from './userinteraction/UserInteractionStep';

/**
 * Type-safe dependency interfaces for each step type
 */
export interface LLMGenerateTitleStepDependencies {
  dmsService: IDocumentManagementSystem;
  ollamaService: OllamaService;
  promptsRepo: IPromptsRepository;
}

export interface UpdateDocumentStepDependencies {
  dmsService: IDocumentManagementSystem;
}

/**
 * Factory for creating step implementations with type-safe dependencies
 */
export class StepFactory {
  /**
   * Generic create method that routes to specific factory methods
   * Used by StepExecutorService
   */
  static create(
    stepId: string | null,
    jobId: string,
    type: StepType, stepState: StepStatus): IStep {
    switch (type) {
      case StepType.LLM_GENERATE_TITLE:
        return new LLMGenerateTitleStep(stepId, jobId, stepState);

      case StepType.REQUIRE_APPROVAL:
        return new ApprovalInteractionStep(stepId, jobId, stepState);

      case StepType.UPDATE_DOCUMENT:
        return new UpdateDocumentStep(stepId, jobId, stepState);

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
}
