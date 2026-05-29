
import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { StatsController } from '../../web/StatsController.js';

export function createStatsRouter(appFactory: ApplicationServiceFactory): Router {
  const router = Router();
  const controller = new StatsController(appFactory);

  /**
   * GET /api/stats/dashboard
   * Get unified dashboard statistics (queue, approvals, and job stats)
   */
  router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await controller.getDashboardStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
