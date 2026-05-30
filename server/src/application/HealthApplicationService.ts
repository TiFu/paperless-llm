import { UoWFactory } from '../infrastructure/UoW.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';

export class HealthApplicationService {
  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly paperlessService: IDocumentManagementSystem,
    private readonly llmService: ILLMService,
  ) {}

  async checkDatabaseHealth(): Promise<boolean> {
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();
      await context.getJobs().list(1);
      await context.rollback();
      return true;
    } catch {
      return false;
    }
  }

  async checkPaperlessHealth(): Promise<boolean> {
    try {
      await this.paperlessService.getDocumentsByTag('__health_check__', 1);
      return true;
    } catch {
      return false;
    }
  }

  async checkLLMHealth(): Promise<boolean> {
    return this.llmService.checkHealth();
  }
}
