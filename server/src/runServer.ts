import { AppContext } from './bootstrap.js';
import { createApiServer } from './api/server.js';

export async function runServer(ctx: AppContext): Promise<() => Promise<void>> {
  const { config, logger } = ctx;

  const app = createApiServer(
    {
      port: config.api.port,
      corsOrigins: config.api.corsOrigins,
      apiSpec: 'docs/openapi.yaml',
    },
    ctx.applicationServiceFactory,
    ctx.uowFactory,
    ctx.cachedPaperlessService,
    ctx.paperlessService,
    ctx.usersRepo,
    config.auth,
    ctx.ollamaService,
    ctx.entityDescriptionsRepo,
    ctx.entitySyncService,
    logger,
  );

  const server = app.listen(config.api.port, () => {
    logger.info({ port: config.api.port }, 'API server started');
  });

  return () =>
    new Promise<void>((resolve) => {
      logger.info('Shutting down API server...');
      server.close(() => {
        logger.info('API server closed');
        resolve();
      });
    });
}
