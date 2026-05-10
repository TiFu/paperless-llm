import { JobApplicationService } from './JobApplicationService';
import { StepExecutorApplicationService } from './StepExecutorApplicationService';
import { ApprovalApplicationService } from './ApprovalApplicationService';
import { PromptApplicationService } from './PromptApplicationService';
import { QueueApplicationService } from './QueueApplicationService';
import { TransactionManager } from '../infrastructure/TransactionManager';
import { DomainServices } from '../domain/services/DomainServices';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem';
import { ILLMService } from '../domain/llm/ILLMService';
import { WorkflowOrchestratorService } from './WorkflowOrchestratorService';

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
      this.dmsService,
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
}
