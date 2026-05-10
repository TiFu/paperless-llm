import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { TransactionManager } from '../../infrastructure/TransactionManager.js';
import { IDocumentManagementSystem } from '../../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../../domain/llm/ILLMService.js';

export function createHealthRouter(
  txManager: TransactionManager,
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
        checkDatabaseHealth(txManager, logger),
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

      const statusCode = allHealthy ? 200 : 503;
      res.status(statusCode).json(status);
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      next(error);
    }
  });

  return router;
}

async function checkDatabaseHealth(
  txManager: TransactionManager,
  logger: pino.Logger,
): Promise<boolean> {
  await using context = await txManager.createContext();
  try {
    await context.start();
    await context.getRepositoryRegistry().getJobs().list(1);
    await context.rollback();
    return true;
  } catch (error) {
    logger.debug({ error }, 'Database health check failed');
    await context.rollback();
    return false;
  }
}

async function checkPaperlessHealth(
  paperlessService: IDocumentManagementSystem,
  logger: pino.Logger,
): Promise<boolean> {
  try {
    // Try to fetch documents with a non-existent tag (should return empty array, not error)
    await paperlessService.getDocumentsByTag('__health_check__');
    return true;
  } catch (error) {
    logger.debug({ error }, 'Paperless health check failed');
    return false;
  }
}

async function checkLLMHealth(llmService: ILLMService, logger: pino.Logger): Promise<boolean> {
  try {
    // Simple health check prompt
    await llmService.sendChatRequest('ping', 0.0);
    return true;
  } catch (error) {
    logger.debug({ error }, 'LLM health check failed');
    return false;
  }
}
