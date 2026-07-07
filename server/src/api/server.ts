import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import pino from 'pino';
import {pinoHttp, Options as PinoHttpOptions} from 'pino-http';
import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { ILLMService } from '../domain/llm/ILLMService.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAuthMiddleware } from './middleware/authenticate.js';
import { createPromptsRouter } from './routes/prompts.js';
import { createJobsRouter } from './routes/jobs.js';
import { createQueueRouter } from './routes/queue.js';
import { createHealthRouter } from './routes/health.js';
import { createDocumentsRouter } from './routes/documents.js';
import { createApprovalsRouter } from './routes/approvals.js';
import { createStepsRouter } from './routes/steps.js';
import { createStatsRouter } from './routes/stats.js';
import { createDocsRouter } from './routes/docs.js';
import { createEntityDescriptionsRouter } from './routes/entityDescriptions.js';
import { createWorkerExecutionsRouter } from './routes/workerExecutions.js';
import { createAuthRouter } from './routes/auth.js';
import { createSettingsRouter } from './routes/settings.js';
import * as OpenAPIValidator from 'express-openapi-validator';
import { UoWFactory } from '../infrastructure/UoW.js';
import { IEntityDescriptionsRepository } from '../domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { EntitySyncApplicationService } from '../application/EntitySyncApplicationService.js';
import { IPaperlessAuthService } from '../domain/auth/IPaperlessAuthService.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { AuthConfig } from '../config/AppConfig.js';

export interface ApiServerConfig {
  port: number;
  corsOrigins: string[];
  apiSpec: string
}
export function createApiServer(
  config: ApiServerConfig,
  appFactory: ApplicationServiceFactory,
  uowFactory: UoWFactory,
  paperlessService: IDocumentManagementSystem,
  paperlessAuth: IPaperlessAuthService,
  usersRepo: IUsersRepository,
  authConfig: AuthConfig,
  llmService: ILLMService,
  entityDescriptionsRepo: IEntityDescriptionsRepository,
  entitySyncService: EntitySyncApplicationService,
  logger: pino.Logger,
): Express {
  const apiSpec = config.apiSpec
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
      // pino-http bundles its own (newer) copy of pino, whose Logger type is
      // structurally incompatible with our top-level pino's — cast through
      // unknown rather than depending on pino-http's nested pino types.
      logger: logger as unknown as PinoHttpOptions['logger'],
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

  app.use(OpenAPIValidator.middleware({
    apiSpec,
    validateRequests: true,
    validateResponses: {
      // Several error responses (e.g. 401 from the JWT middleware) aren't documented
      // per-endpoint in the spec. Without onError, an undocumented status code makes
      // the validator throw, which overwrites the real response with a garbled 500.
      // Log and let the original response through instead.
      onError: (err, body, req) => {
        logger.warn({ err, path: req.path, body }, 'Response failed OpenAPI validation');
      },
    },
    validateFormats: true
  }))

  // Auth routes (no JWT required)
  app.use('/api/auth', createAuthRouter(paperlessAuth, usersRepo, uowFactory, authConfig));

  // JWT authentication for all /api routes except /api/auth
  app.use('/api', createAuthMiddleware(authConfig.jwtSecret));

  // Health check (outside /api prefix)
  app.use('/', createHealthRouter(uowFactory, paperlessService, llmService));

  // API routes
  app.use('/api/documents', createDocumentsRouter(appFactory));
  app.use('/api/prompts', createPromptsRouter(appFactory));
  app.use('/api/settings', createSettingsRouter(appFactory));
  app.use('/api/jobs', createJobsRouter(appFactory));
  app.use('/api/approvals', createApprovalsRouter(appFactory));
  app.use('/api/steps', createStepsRouter(appFactory));
  app.use('/api/stats', createStatsRouter(appFactory));
  app.use('/api/queue', createQueueRouter(appFactory));

  app.use('/api/entity-descriptions', createEntityDescriptionsRouter(entityDescriptionsRepo, entitySyncService));
  app.use('/api/worker-executions', createWorkerExecutionsRouter(uowFactory));

  // API Docs and OpenAPI spec
  app.use('/api/docs', createDocsRouter());

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
