
import { HealthApplicationService } from './HealthApplicationService.js';
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
import { DocumentApplicationService } from './DocumentApplicationService.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { AppConfig, IRetryConfig, IWorkersConfig, IPaperlessConfig } from '../config/AppConfig.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { SettingsApplicationService } from './SettingsApplicationService.js';

/**
 * ApplicationServiceFactory - creates application service instances per request.
 * Singleton factory initialized at startup with dependencies.
 * Uses DomainServiceFactory internally to create domain services.
 */
export class ApplicationServiceFactory {
  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly usersRepo: IUsersRepository,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly llmService: ILLMService,
    private readonly paperlessBaseUrl: string,
    private readonly retryConfig: IRetryConfig,
    private readonly workersConfig: IWorkersConfig,
    private readonly paperlessConfig: IPaperlessConfig,
    private readonly config: AppConfig,
  ) {}

  getPaperlessBaseUrl(): string {
    return this.paperlessBaseUrl;
  }

  /**
   * Create a new HealthApplicationService instance.
   */
  createHealthApplicationService(): HealthApplicationService {
    return new HealthApplicationService(this.uowFactory, this.dmsService, this.llmService);
  }

  /**
   * Create a new JobApplicationService instance.
   */
  createJobApplicationService(): JobApplicationService {
    return new JobApplicationService(this.uowFactory);
  }


  /**
   * Create a new StepExecutorApplicationService instance.
   */
  createStepExecutorApplicationService(): StepExecutorApplicationService {
    return new StepExecutorApplicationService(
      this.uowFactory,
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
      this.paperlessBaseUrl,
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
    return new QueueApplicationService(this.uowFactory);
  }

  /**DashboardStatsApplicationService instance.
   * Provides unified statistics for dashboard views.
   */
  createDashboardStatsApplicationService(): DashboardStatsApplicationService {
    return new DashboardStatsApplicationService(this);
  }

  /**
   * Create a new StuckStepResetApplicationService instance.
   * @param timeoutMs Time in milliseconds before a step is considered stuck
   */
  createStuckStepResetApplicationService(): StuckStepResetApplicationService {
    return new StuckStepResetApplicationService(this.uowFactory, this.workersConfig, this.retryConfig);
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
   * Used for automated document pickup and job creation. Reads which tags
   * trigger auto-processing live from paperlessConfig on every run.
   */
  createDocumentAutoQueueApplicationService(): DocumentAutoQueueApplicationService {
    const jobAppService = this.createJobApplicationService();
    return new DocumentAutoQueueApplicationService(
      this.uowFactory,
      this.usersRepo,
      jobAppService,
      this.paperlessConfig,
    );
  }

  /**
   * Create a new AuditLogApplicationService instance.
   * Used for logging all job and step lifecycle events.
   */
  createAuditLogApplicationService(): AuditLogApplicationService {
    return new AuditLogApplicationService(this.uowFactory);
  }

  /**
   * Create a new DocumentApplicationService instance.
   * Accesses Paperless documents/entities scoped to the requesting user's own token.
   */
  createDocumentApplicationService(): DocumentApplicationService {
    return new DocumentApplicationService(this.uowFactory);
  }

  /**
   * Create a new SettingsApplicationService instance.
   * Reads/writes the non-technical, live-editable settings.
   */
  createSettingsApplicationService(): SettingsApplicationService {
    return new SettingsApplicationService(this.uowFactory, this.config);
  }

}
