import { TransactionContext } from '../../infrastructure/TransactionManager';
import { IPromptDomainService } from '../prompt/IPromptDomainService';
import { PromptDomainService } from '../prompt/PromptDomainService';

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
