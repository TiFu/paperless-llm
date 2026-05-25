import { Router } from 'express';
import { createChildLogger } from '../../utils/logger.js';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';

// GET /fallouts - List fallout steps (in_fallout) with audit log attached

export function createFalloutsRouter(appFactory: ApplicationServiceFactory) {
  const logger = createChildLogger({ name: "fallout-router"})
  const router = Router();

    // Updated: Use getQueueItems with status 'in_fallout' and enrich with audit log
  router.get('/', async (req, res) => {
    try {
      const queueService = appFactory.createQueueApplicationService();
      const auditLogService = appFactory.createAuditLogApplicationService();
      const enriched = await queueService.getFallouts(auditLogService);
      res.json({ items: enriched, count: enriched.length });
    } catch (err) {
      res.status(500).json({ error: (err as any).message });
    }
  });

  return router
}
