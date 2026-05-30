
import { Router, Request, Response, NextFunction } from 'express';
import { UoWFactory } from '../../infrastructure/UoW.js';
import { IDocumentManagementSystem } from '../../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../../domain/llm/ILLMService.js';
import { HealthController } from '../../web/controllers.js';

export function createHealthRouter(
  uowFactory: UoWFactory,
  paperlessService: IDocumentManagementSystem,
  llmService: ILLMService,
): Router {
  const router = Router();
  const controller = new HealthController(uowFactory, paperlessService, llmService);

  // GET /health
  router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.getHealth();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // GET /api/system/status
  router.get('/api/system/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await controller.getSystemStatus();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

