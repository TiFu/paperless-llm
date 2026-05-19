import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { IDocumentManagementSystem } from '../../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../../domain/llm/ILLMService.js';
import { UoW, UoWFactory } from '../../infrastructure/UoW.js';

export function createHealthRouter(
  uowFactory: UoWFactory,
  paperlessService: IDocumentManagementSystem,
  llmService: ILLMService,
  logger: pino.Logger,
): Router {
  const router = Router();

  /**
   * GET /health
   * Simple health check endpoint
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/system/status
   * Detailed system status with all service health checks
   */
  router.get('/api/system/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Run all health checks in parallel
      const [dbHealthy, paperlessHealthy, llmHealthy] = await Promise.all([
        checkDatabaseHealth(uowFactory, logger),
        checkPaperlessHealth(paperlessService, logger),
        checkLLMHealth(llmService, logger),
      ]);

      const allHealthy = dbHealthy && paperlessHealthy && llmHealthy;

      const status = {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        components: {
          database: {
            status: dbHealthy ? 'healthy' : 'unhealthy',
          },
          paperless: {
            status: paperlessHealthy ? 'healthy' : 'unhealthy',
          },
          llm: {
            status: llmHealthy ? 'healthy' : 'unhealthy',
          },
        },
      };

      const statusCode = 200;
      res.status(statusCode).json(status);
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      next(error);
    }
  });

  return router;
}

async function checkDatabaseHealth(
  uowFactory: UoWFactory,
  logger: pino.Logger,
): Promise<boolean> {
  try {
    await using context = await uowFactory.createUoW();
    await context.start();
    await context.getJobs().list(1);
    await context.rollback();
    return true;
  } catch (error) {
    return false;
  }
}

async function checkPaperlessHealth(
  paperlessService: IDocumentManagementSystem,
  logger: pino.Logger,
): Promise<boolean> {
  try {
    await paperlessService.getDocumentsByTag('__health_check__', 1);
    return true;
  } catch (error) {
    return false;
  }
}

async function checkLLMHealth(llmService: ILLMService, logger: pino.Logger): Promise<boolean> {
  return llmService.checkHealth();
}
