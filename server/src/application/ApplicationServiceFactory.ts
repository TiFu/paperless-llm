import { JobApplicationService } from './JobApplicationService.js';
import { StepExecutorApplicationService } from './StepExecutorApplicationService.js';
import { ManualStepApplicationService } from './ApprovalApplicationService.js';
import { PromptApplicationService } from './PromptApplicationService.js';
import { QueueApplicationService } from './QueueApplicationService.js';
import { StuckStepResetApplicationService } from './StuckStepResetApplicationService.js';
import { StepRetryApplicationService } from './StepRetryApplicationService.js';
import { StepCancelApplicationService } from './StepCancelApplicationService.js';
import { DocumentAutoQueueApplicationService } from './DocumentAutoQueueApplicationService.js';
import { AuditLogApplicationService } from './AuditLogApplicationService.js';
import { DashboardStatsApplicationService } from './DashboardStatsApplicationService.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { RetryConfig } from '../domain/steps/IStep.js';
import { AutoQueueConfig } from '../config/AppConfig.js';
import { UoWFactory } from '../infrastructure/UoW.js';

/**
 * ApplicationServiceFactory - creates application service instances per request.
 * Singleton factory initialized at startup with dependencies.
 * Uses DomainServiceFactory internally to create domain services.
 */
export class ApplicationServiceFactory {
  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly llmService: ILLMService,
    private readonly paperlessBaseUrl: string,
    private readonly retryConfig: RetryConfig
  ) {}

  /**
   * Create a new JobApplicationService instance.
   */
  createJobApplicationService(): JobApplicationService {
    const auditLogService = this.createAuditLogApplicationService();
    return new JobApplicationService(this.uowFactory, this.dmsService);
  }


  /**
   * Create a new StepExecutorApplicationService instance.
   */
  createStepExecutorApplicationService(): StepExecutorApplicationService {

    return new StepExecutorApplicationService(
      this.uowFactory,
      this.dmsService,
      this.llmService,
      this.retryConfig
    );
  }

  /**
   * Create a new ApprovalApplicationService instance.
   */
  createApprovalApplicationService(): ManualStepApplicationService {
    
    return new ManualStepApplicationService(
      this.uowFactory,
      this.paperlessBaseUrl
    );
  }

  /**
   * Create a new PromptApplicationService instance.
   */
  createPromptApplicationService(): PromptApplicationService {
    return new PromptApplicationService(this.uowFactory);
  }

  /**
   * Create a new QueueApplicationService instance.
   */
  createQueueApplicationService(): QueueApplicationService {
    return new QueueApplicationService(this.uowFactory, this.dmsService);
  }

  /**DashboardStatsApplicationService instance.
   * Provides unified statistics for dashboard views.
   */
  createDashboardStatsApplicationService(): DashboardStatsApplicationService {
    return new DashboardStatsApplicationService(this);
  }

  /**
   * Create a new 
   * Create a new StuckStepResetApplicationService instance.
   * @param timeoutMs Time in milliseconds before a step is considered stuck
   * @param maxRetries Maximum number of retry attempts before marking as failed
   */
  createStuckStepResetApplicationService(
    timeoutMs: number,
    maxRetries: number,
  ): StuckStepResetApplicationService {
    return new StuckStepResetApplicationService(this.uowFactory, timeoutMs, this.retryConfig);

  }
  /**
   * Create a new StepRetryApplicationService instance.
   * Used for manual retry of steps in fallout or retry state.
   */
  createStepRetryApplicationService(): StepRetryApplicationService {
    return new StepRetryApplicationService(this.uowFactory);
  }

  /**
   * Create a new StepCancelApplicationService instance.
   * Used for manual cancellation of steps in fallout or retry state.
   */
  createStepCancelApplicationService(): StepCancelApplicationService {
    return new StepCancelApplicationService(this.uowFactory);
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
      this.uowFactory,
      this.dmsService,
      jobAppService,
      autoQueueConfig,
    );
  }

  /**
   * Create a new AuditLogApplicationService instance.
   * Used for logging all job and step lifecycle events.
   */
  createAuditLogApplicationService(): AuditLogApplicationService {
    return new AuditLogApplicationService(this.uowFactory);
  }

}
