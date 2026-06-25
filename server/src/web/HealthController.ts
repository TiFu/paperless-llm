import type { SystemHealthResponse } from './dtos/models/SystemHealthResponse.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { ServiceStatus } from './dtos/models/ServiceStatus.js';
import { HealthStatus, HealthStatusStatusEnum } from './dtos/models/HealthStatus.js';
import { SystemStatus } from './dtos/models/SystemStatus.js';

export class HealthController {
  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly paperlessService: IDocumentManagementSystem,
    private readonly llmService: ILLMService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    return {
      status: HealthStatusStatusEnum.ok,
      timestamp: new Date(),
    };
  }

  private getServiceStatus(status: boolean): ServiceStatus {
    return status ? ServiceStatus.healthy : ServiceStatus.healthy
  }
  async getSystemStatus(): Promise<SystemHealthResponse> {
    const [dbHealthy, paperlessHealthy, llmHealthy] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkPaperlessHealth(),
      this.checkLLMHealth(),
    ]);
    const allHealthy = dbHealthy && paperlessHealthy && llmHealthy;
    return {
      status: allHealthy ? SystemStatus.healthy : SystemStatus.degraded,
      timestamp: new Date(),
      components: {
        database: { status: this.getServiceStatus(dbHealthy) },
        paperless: { status: this.getServiceStatus(paperlessHealthy) },
        llm: { status: this.getServiceStatus(llmHealthy) },
      },
    };
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Use a unit of work to check DB connectivity
      // (matches original route logic)
      await using context = await this.uowFactory.createSystemUoW();
      await context.start();
      await context.rollback();
      return true;
    } catch {
      return false;
    }
  }

  private async checkPaperlessHealth(): Promise<boolean> {
    try {
      await this.paperlessService.healthCheck();
      return true;
    } catch {
      return false;
    }
  }

  private async checkLLMHealth(): Promise<boolean> {
    return this.llmService.checkHealth();
  }
}
