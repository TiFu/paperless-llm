import { IStep } from '../interfaces/IStep';
import { StepType } from '../enums/StepType';
import { LLMGenerateTitleStep } from './LLMGenerateTitleStep';
import { UpdateDocumentStep } from './UpdateDocumentStep';
import { IDocumentManagementSystem } from '../interfaces/IDocumentManagementSystem';
import { OllamaService } from '../../services/OllamaService';
import { IPromptsRepository } from '../interfaces/IPromptsRepository';

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
   * Create LLM Generate Title step
   */
  static createLLMGenerateTitleStep(deps: LLMGenerateTitleStepDependencies): LLMGenerateTitleStep {
    return new LLMGenerateTitleStep(deps.dmsService, deps.ollamaService, deps.promptsRepo);
  }

  /**
   * Create Update Document step
   */
  static createUpdateDocumentStep(deps: UpdateDocumentStepDependencies): UpdateDocumentStep {
    return new UpdateDocumentStep(deps.dmsService);
  }

  /**
   * Generic create method that routes to specific factory methods
   * Used by StepExecutorService
   */
  static create(
    type: StepType,
    dependencies: LLMGenerateTitleStepDependencies | UpdateDocumentStepDependencies,
  ): IStep {
    switch (type) {
      case StepType.LLM_GENERATE_TITLE:
        return this.createLLMGenerateTitleStep(
          dependencies as LLMGenerateTitleStepDependencies,
        );

      case StepType.REQUIRE_APPROVAL:
        return this.createRequireApprovalStep();

      case StepType.UPDATE_DOCUMENT:
        return this.createUpdateDocumentStep(
          dependencies as UpdateDocumentStepDependencies,
        );

      default:
        throw new Error(`Unknown step type: ${type}`);
    }
  }
}
