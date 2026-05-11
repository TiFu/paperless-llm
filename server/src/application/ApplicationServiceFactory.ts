import { JobApplicationService } from './JobApplicationService.js';
import { StepExecutorApplicationService } from './StepExecutorApplicationService.js';
import { ApprovalApplicationService } from './ApprovalApplicationService.js';
import { PromptApplicationService } from './PromptApplicationService.js';
import { QueueApplicationService } from './QueueApplicationService.js';
import { StuckStepResetApplicationService } from './StuckStepResetApplicationService.js';
import { StepRetryApplicationService } from './StepRetryApplicationService.js';
import { StepCancelApplicationService } from './StepCancelApplicationService.js';
import { DocumentAutoQueueApplicationService } from './DocumentAutoQueueApplicationService.js';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { DomainServices } from '../domain/services/DomainServices.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { WorkflowOrchestratorService } from './WorkflowOrchestratorService.js';
import { RetryConfig } from '../domain/steps/IStep.js';
import { AutoQueueConfig } from '../config/AppConfig.js';

/**
 * ApplicationServiceFactory - creates application service instances per request.
 * Singleton factory initialized at startup with dependencies.
 * Uses DomainServiceFactory internally to create domain services.
 */
export class ApplicationServiceFactory {
  constructor(
    private readonly txManager: TransactionManager,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly llmService: ILLMService,
    private readonly paperlessBaseUrl: string,
    private readonly retryConfig: RetryConfig
  ) {}

  /**
   * Create a new JobApplicationService instance.
   */
  createJobApplicationService(): JobApplicationService {
    return new JobApplicationService(this.txManager);
  }

  /**
   * Create a new WorkflowApplicationService instance.
   */
  createWorkflowApplicationService(): WorkflowOrchestratorService {
    return new WorkflowOrchestratorService();
  }

  /**
   * Create a new StepExecutorApplicationService instance.
   */
  createStepExecutorApplicationService(): StepExecutorApplicationService {
    const workflowAppService = this.createWorkflowApplicationService();

    return new StepExecutorApplicationService(
      this.txManager,
      workflowAppService,
      this.dmsService,
      this.llmService,
      this.retryConfig
    );
  }

  /**
   * Create a new ApprovalApplicationService instance.
   */
  createApprovalApplicationService(): ApprovalApplicationService {
    const workflowAppService = this.createWorkflowApplicationService();
    
    return new ApprovalApplicationService(
      this.txManager,
      workflowAppService,
      this.paperlessBaseUrl,
    );
  }

  /**
   * Create a new PromptApplicationService instance.
   */
  createPromptApplicationService(): PromptApplicationService {
    return new PromptApplicationService(this.txManager);
  }

  /**
   * Create a new QueueApplicationService instance.
   */
  createQueueApplicationService(): QueueApplicationService {
    return new QueueApplicationService(this.txManager);
  }

  /**
   * Create a new StuckStepResetApplicationService instance.
   * @param timeoutMs Time in milliseconds before a step is considered stuck
   * @param maxRetries Maximum number of retry attempts before marking as failed
   */
  createStuckStepResetApplicationService(
    timeoutMs: number,
    maxRetries: number,
  ): StuckStepResetApplicationService {
    return new StuckStepResetApplicationService(this.txManager, timeoutMs, this.retryConfig);

  }
  /**
   * Create a new StepRetryApplicationService instance.
   * Used for manual retry of steps in fallout or retry state.
   */
  createStepRetryApplicationService(): StepRetryApplicationService {
    return new StepRetryApplicationService(this.txManager);
  }

  /**
   * Create a new StepCancelApplicationService instance.
   * Used for manual cancellation of steps in fallout or retry state.
   */
  createStepCancelApplicationService(): StepCancelApplicationService {
    const workflowAppService = this.createWorkflowApplicationService();
    return new StepCancelApplicationService(this.txManager, workflowAppService);
  }

  /**
   * Create a new DocumentAutoQueueApplicationService instance.
   * Used for automated document pickup and job creation.
   * @param autoQueueConfig Configuration for the auto-queue feature
   */
  createDocumentAutoQueueApplicationService(
    autoQueueConfig: AutoQueueConfig,
  ): DocumentAutoQueueApplicationService {
    const jobAppService = this.createJobApplicationService();
    return new DocumentAutoQueueApplicationService(
      this.txManager,
      this.dmsService,
      jobAppService,
      autoQueueConfig,
    );
  }

}
