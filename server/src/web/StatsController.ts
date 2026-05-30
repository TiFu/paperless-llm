import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import type { DashboardStats } from './dtos/models/DashboardStats.js';

export class StatsController {
  private readonly appFactory: ApplicationServiceFactory;

  constructor(appFactory: ApplicationServiceFactory) {
    this.appFactory = appFactory;
  }

  /**
   * Get unified dashboard statistics (queue, approvals, and job stats)
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const dashboardStatsService = this.appFactory.createDashboardStatsApplicationService();
    const stats = await dashboardStatsService.getDashboardStats();
    // If mapping is needed, do it here (currently, types should match DTO)
    return stats;
  }
}
