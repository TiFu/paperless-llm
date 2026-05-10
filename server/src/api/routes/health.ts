import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { TransactionManager } from '../../infrastructure/TransactionManager';

export function createHealthRouter(txManager: TransactionManager, logger: pino.Logger): Router {
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
   * Detailed system status with database connectivity check
   */
  router.get('/api/system/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const dbHealthy = await checkDatabaseHealth(txManager);

      const status = {
        status: dbHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        components: {
          database: {
            status: dbHealthy ? 'healthy' : 'unhealthy',
          },
        },
      };

      const statusCode = dbHealthy ? 200 : 503;
      res.status(statusCode).json(status);
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      next(error);
    }
  });

  return router;
}

async function checkDatabaseHealth(txManager: TransactionManager): Promise<boolean> {
  await using context = await txManager.createContext();
  try {
    await context.start();
    await context.getRepositoryRegistry().getJobs().list(1);
    await context.rollback();
    return true;
  } catch (error) {
    await context.rollback();
    return false;
  }
}
