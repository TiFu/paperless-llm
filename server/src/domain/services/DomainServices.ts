import { TransactionContext } from '../../infrastructure/TransactionManager.js';
import { IDocumentManagementSystem } from '../document/IDocumentManagementSystem.js';
import { ILLMService } from '../llm/ILLMService.js';
import { IPromptDomainService } from '../prompt/IPromptDomainService.js';
import { PromptService } from '../prompt/PromptDomainService.js';
import { StepExecutorService } from './StepExecutorService.js';

/**
 * DomainServices - collection of all domain services.
 * Provides unified access to pure business logic services.
 * Created per request to support future request-scoped context (logging, tracing).
 */
export class DomainServices {
  public readonly prompt: IPromptDomainService;
  public readonly stepExecution: StepExecutorService


  constructor(context: TransactionContext, dms: IDocumentManagementSystem, llm: ILLMService) {
    this.prompt = new PromptService(context);
    this.stepExecution = new StepExecutorService(context, dms, llm, this.prompt);
  }
}
