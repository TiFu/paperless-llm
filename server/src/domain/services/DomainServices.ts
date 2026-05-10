import { TransactionContext } from '../../infrastructure/TransactionManager.js';
import { IPromptDomainService } from '../prompt/IPromptDomainService.js';
import { PromptDomainService } from '../prompt/PromptDomainService.js';

/**
 * DomainServices - collection of all domain services.
 * Provides unified access to pure business logic services.
 * Created per request to support future request-scoped context (logging, tracing).
 */
export class DomainServices {
  public readonly prompt: IPromptDomainService;

  constructor(context: TransactionContext) {
    this.prompt = new PromptDomainService();
  }
}
