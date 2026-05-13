import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { createChildLogger } from '../../utils/logger.js';

export function createStatsRouter(appFactory: ApplicationServiceFactory): Router {
  const logger = createChildLogger({ name: 'stats-router' });
  const router = Router();

  /**
   * GET /api/stats/dashboard
   * Get unified dashboard statistics (queue, approvals, and job stats)
   */
  router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const dashboardStatsService = appFactory.createDashboardStatsApplicationService();
      const stats = await dashboardStatsService.getDashboardStats();

      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch dashboard stats');
      next(error);
    }
  });

  return router;
}
