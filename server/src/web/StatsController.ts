import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import type { DashboardStats } from './dtos/models/DashboardStats.js';
import { UserContext } from '../domain/auth/UserContext.js';

export class StatsController {
  private readonly appFactory: ApplicationServiceFactory;

  constructor(appFactory: ApplicationServiceFactory) {
    this.appFactory = appFactory;
  }

  async getDashboardStats(user: UserContext): Promise<DashboardStats> {
    const dashboardStatsService = this.appFactory.createDashboardStatsApplicationService();
    const stats = await dashboardStatsService.getDashboardStats(user);
    return stats;
  }
}
