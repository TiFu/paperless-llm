
import { Router, Request, Response, NextFunction } from 'express';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { createChildLogger } from '../../utils/logger.js';
import { QueueController } from '../../web/controllers.js';




export function createQueueRouter(appFactory: ApplicationServiceFactory): Router {
  const logger = createChildLogger({ name: "queue-router" });
  const router = Router();
  const controller = new QueueController(appFactory);

  // GET /api/queue/stats
  router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await controller.getQueueStats(req.user!);
      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch queue stats');
      next(error);
    }
  });

  // GET /api/queue/items
  router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const cursor = req.query.cursor as string | undefined;
      const status = req.query.status as string | undefined;
      const includeAuditLog = req.query.includeAuditLog === 'true';

      // Validate status if provided
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'retrying', 'in_fallout'];
      if (status && !validStatuses.includes(status)) {
        res.status(400).json({
          type: 'about:blank',
          title: 'Invalid Parameter',
          status: 400,
          detail: `Status must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      logger.info({ limit, cursor, status, includeAuditLog }, "Requesting queue items");
      const result = await controller.listQueueItems(req.user!, limit, cursor, status, includeAuditLog);
      res.json(result);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch queue items');
      next(error);
    }
  });

  return router;
}
