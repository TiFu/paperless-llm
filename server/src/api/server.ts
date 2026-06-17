import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import pino from 'pino';
import {pinoHttp} from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
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
import { createAuthRouter } from './routes/auth.js';
import * as OpenAPIValidator from 'express-openapi-validator';
import { UoWFactory } from '../infrastructure/UoW.js';
import { IEntityDescriptionsRepository } from '../domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { EntitySyncApplicationService } from '../application/EntitySyncApplicationService.js';
import { IPaperlessAuthService } from '../domain/auth/IPaperlessAuthService.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { AuthConfig } from '../config/AppConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const redoc = require('redoc-express');

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

  app.use(OpenAPIValidator.middleware({
    apiSpec,
    validateRequests: true,
    validateResponses: true,
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
  app.use('/api/jobs', createJobsRouter(appFactory));
  app.use('/api/approvals', createApprovalsRouter(appFactory));
  app.use('/api/steps', createStepsRouter(appFactory));
  app.use('/api/stats', createStatsRouter(appFactory));
  app.use('/api/queue', createQueueRouter(appFactory));

  app.use('/api/entity-descriptions', createEntityDescriptionsRouter(entityDescriptionsRepo, entitySyncService));

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
