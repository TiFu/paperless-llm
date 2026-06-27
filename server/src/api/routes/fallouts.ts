
import { Router, Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../../utils/logger.js';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { FalloutController } from '../../web/controllers.js';

export function createFalloutsRouter(appFactory: ApplicationServiceFactory): Router {
  const logger = createChildLogger({ name: "fallout-router" });
  const router = Router();
  const controller = new FalloutController(appFactory);

  // GET /fallouts - List fallout steps (in_fallout) with audit log attached
  router.get('/', async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const result = await controller.listFallouts(req.user!);
      res.json(result);
    } catch (err) {
      logger.error({ err }, 'Failed to fetch fallout items');
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
