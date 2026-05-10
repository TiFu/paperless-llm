import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';

export function createQueueRouter(appFactory: ApplicationServiceFactory, logger: pino.Logger): Router {
  const router = Router();

  /**
   * GET /api/queue/stats
   * Get unified queue statistics for all automated steps
   */
  router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const queueAppService = appFactory.createQueueApplicationService();
      const stats = await queueAppService.getQueueStats();

      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch queue stats');
      next(error);
    }
  });

  /**
   * GET /api/queue/items
   * List all automated queue items with cursor-based pagination
   * Query params: limit (default 50, max 100), cursor (optional), status (optional)
   * Status values: pending, processing, completed, failed
   */
  router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
      const cursor = req.query.cursor as string | undefined;
      const status = req.query.status as string | undefined;

      // Validate status if provided
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      if (status && !validStatuses.includes(status)) {
        res.status(400).json({
          type: 'about:blank',
          title: 'Invalid Parameter',
          status: 400,
          detail: `Status must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      const queueAppService = appFactory.createQueueApplicationService();
      const result = await queueAppService.getQueueItems(limit, cursor, status);

      res.json({
        items: result.items,
        pagination: {
          limit,
          nextCursor: result.nextCursor,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch queue items');
      next(error);
    }
  });

  return router;
}
