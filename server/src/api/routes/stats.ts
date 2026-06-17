
import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { StatsController } from '../../web/StatsController.js';

export function createStatsRouter(appFactory: ApplicationServiceFactory): Router {
  const router = Router();
  const controller = new StatsController(appFactory);

  router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await controller.getDashboardStats(req.user!);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
