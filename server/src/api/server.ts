import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import pino from 'pino';
import {pinoHttp} from 'pino-http';
import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { PaperlessService } from '../services/PaperlessService.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createPromptsRouter } from './routes/prompts.js';
import { createJobsRouter } from './routes/jobs.js';
import { createQueueRouter } from './routes/queue.js';
import { createHealthRouter } from './routes/health.js';
import { createDocumentsRouter } from './routes/documents.js';
import { createApprovalsRouter } from './routes/approvals.js';
import { createStepsRouter } from './routes/steps.js';

export interface ApiServerConfig {
  port: number;
  corsOrigins: string[];
}

export function createApiServer(
  config: ApiServerConfig,
  appFactory: ApplicationServiceFactory,
  txManager: TransactionManager,
  paperlessService: PaperlessService,
  llmService: ILLMService,
  logger: pino.Logger,
): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  
  // Handle CORS origins - convert ["*"] to "*" for cors package
  // The cors middleware expects "*" as a string for wildcard, not in an array
  let corsOrigin: string | string[] | boolean = config.corsOrigins;
  if (Array.isArray(config.corsOrigins) && config.corsOrigins.length === 1 && config.corsOrigins[0] === '*') {
    corsOrigin = '*';
  }
  app.use(cors({ origin: corsOrigin }));

  // HTTP request logging with pino-http
  app.use(
    pinoHttp({
      logger: logger as any,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/api/health',
      },
      customLogLevel: (_req, res, err?: Error) => {
        if (res.statusCode >= 500 || err) {
          return 'error';
        }
        if (res.statusCode >= 400) {
          return 'warn';
        }
        return 'info';
      },
    }),
  );

  // Health check (outside /api prefix)
  app.use('/', createHealthRouter(txManager, paperlessService, llmService, logger));

  // API routes
  app.use('/api/documents', createDocumentsRouter(paperlessService));
  app.use('/api/prompts', createPromptsRouter(appFactory));
  app.use('/api/jobs', createJobsRouter(appFactory));
  app.use('/api/approvals', createApprovalsRouter(appFactory));
  app.use('/api/steps', createStepsRouter(appFactory));
  app.use('/api/queue', createQueueRouter(appFactory));

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
