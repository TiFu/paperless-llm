import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import pino from 'pino';
import { TransactionManager } from '../infrastructure/TransactionManager';
import { PaperlessService } from '../services/PaperlessService';
import { errorHandler } from './middleware/errorHandler';
import { createPromptsRouter } from './routes/prompts';
import { createJobsRouter } from './routes/jobs';
import { createQueueRouter } from './routes/queue';
import { createAuditRouter } from './routes/audit';
import { createHealthRouter } from './routes/health';
import { createDocumentsRouter } from './routes/documents';

export interface ApiServerConfig {
  port: number;
  corsOrigins: string[];
}

export function createApiServer(
  config: ApiServerConfig,
  txManager: TransactionManager,
  paperlessService: PaperlessService,
  logger: pino.Logger,
): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cors({ origin: config.corsOrigins }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info(
      {
        method: req.method,
        path: req.path,
        query: req.query,
      },
      'API request',
    );
    next();
  });

  // Health check (outside /api prefix)
  app.use('/', createHealthRouter(txManager, logger));

  // API routes
  app.use('/api/documents', createDocumentsRouter(paperlessService, logger));
  app.use('/api/prompts', createPromptsRouter(txManager, logger));
  app.use('/api/jobs', createJobsRouter(txManager, logger));
  app.use('/api/queue', createQueueRouter(txManager, logger));
  app.use('/api/audit', createAuditRouter(txManager, logger));

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource was not found',
    });
  });

  // Error handler (must be last)
  app.use(errorHandler(logger));

  return app;
}
