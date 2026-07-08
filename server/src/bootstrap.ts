import pino from 'pino';
import { createAppConfig, AppConfig } from './config/AppConfig.js';
import { Database } from './infrastructure/Database.js';
import { runMigrations } from './infrastructure/MigrationRunner.js';
import { initializeLogger } from './utils/logger.js';
import { PaperlessService } from './services/PaperlessService.js';
import { CachedPaperlessServiceAdapter } from './services/CachedPaperlessServiceAdapter.js';
import { DMSCacheService, DMSSerializers } from './services/CacheService.js';
import { OllamaService } from './services/OllamaService.js';
import { ApplicationServiceFactory } from './application/ApplicationServiceFactory.js';
import { EntitySyncApplicationService } from './application/EntitySyncApplicationService.js';
import { PostgreSQLEntityDescriptionsRepository } from './repositories/postgresql/PostgreSQLEntityDescriptionsRepository.js';
import { PostgreSQLUsersRepository } from './repositories/postgresql/PostgreSQLUsersRepository.js';
import { UoWFactory } from './infrastructure/UoW.js';
import { PostgresqlTransactionManager } from './repositories/postgresql/PostgresqlTransactionContext.js';
import { IUsersRepository } from './domain/auth/IUsersRepository.js';
import { IEntityDescriptionsRepository } from './domain/entityDescriptions/IEntityDescriptionsRepository.js';
import { IPaperlessAuthService } from './domain/auth/IPaperlessAuthService.js';
import { IDocumentManagementSystem } from './domain/document/IDocumentManagementSystem.js';
import { ILLMService } from './domain/llm/ILLMService.js';

export interface AppContext {
  config: AppConfig;
  logger: pino.Logger;
  database: Database;
  uowFactory: UoWFactory;
  usersRepo: IUsersRepository;
  entityDescriptionsRepo: IEntityDescriptionsRepository;
  paperlessService: IPaperlessAuthService;
  cachedPaperlessService: IDocumentManagementSystem;
  ollamaService: ILLMService;
  applicationServiceFactory: ApplicationServiceFactory;
  entitySyncService: EntitySyncApplicationService;
}

/**
 * Builds everything shared by both the server and worker processes: config,
 * logger, database (+ migrations), cache, repositories, and service factories.
 */
export async function createAppContext(processName: string): Promise<AppContext> {
  const config = createAppConfig();
  const logger = initializeLogger(config, processName);
  logger.info({ processName }, 'Bootstrapping Paperless LLM application context');

  const database = new Database(config.database);
  const pool = database.getPool();

  const dbHealthy = await database.healthCheck();
  if (!dbHealthy) {
    logger.error('Database health check failed');
    process.exit(1);
  }
  logger.info('Database connection established');

  try {
    await runMigrations(database, logger);
  } catch (error) {
    logger.error({ error }, 'Database migration failed - cannot start');
    process.exit(1);
  }

  const txManager = new PostgresqlTransactionManager(pool);
  const dmsCacheService = new DMSCacheService(config.redis, DMSSerializers);
  // Cache is a soft dependency: connect() never throws (it retries forever
  // in the background with exponential backoff), so this never blocks
  // startup. Until it's ready, cache reads/writes just pass through.
  void dmsCacheService.connect();

  const usersRepo = new PostgreSQLUsersRepository(pool);

  // config implements IPaperlessConfig — uowFactory needs it to assemble a
  // fresh PaperlessService per-user with the current live tags/autoProcessTags.
  const uowFactory = new UoWFactory(txManager, config, dmsCacheService);

  // Loads non-technical settings from Postgres and starts AppConfig's
  // periodic re-read. Must happen after migrations (the app_settings table
  // must exist) and before anything below that reads live settings.
  await config.start(uowFactory);

  // Bootstrap-level PaperlessService instances are only used for login auth
  // and the health check below — never for tag-based operations — so dummy
  // tags/autoProcessTags are fine here (real per-user instances are built
  // fresh in UoWImplementation._createDMSForUser with live values).
  const paperlessService = new PaperlessService({
    url: config.paperless.url,
    tags: undefined,
    autoProcessTags: [],
  });
  const cachedPaperlessService = new CachedPaperlessServiceAdapter(paperlessService, dmsCacheService);

  const paperlessHealthy = await cachedPaperlessService.healthCheck();
  if (!paperlessHealthy) {
    logger.warn('Paperless-NG health check failed, but continuing...');
  } else {
    logger.info('Paperless-NG connection established');
  }

  // config implements ILLMConfig
  const ollamaService = new OllamaService(config);
  const ollamaHealthy = await ollamaService.checkHealth();
  if (!ollamaHealthy) {
    logger.warn('Ollama health check failed, but continuing...');
  } else {
    logger.info('Ollama connection established');
  }

  const entityDescriptionsRepo = new PostgreSQLEntityDescriptionsRepository(pool);
  const entitySyncService = new EntitySyncApplicationService(usersRepo, entityDescriptionsRepo, uowFactory);

  // config also implements IRetryConfig, IWorkersConfig and IPaperlessConfig
  const applicationServiceFactory = new ApplicationServiceFactory(
    uowFactory,
    usersRepo,
    cachedPaperlessService,
    ollamaService,
    config.paperless.url,
    config,
    config,
    config,
    config,
  );

  return {
    config,
    logger,
    database,
    uowFactory,
    usersRepo,
    entityDescriptionsRepo,
    paperlessService,
    cachedPaperlessService,
    ollamaService,
    applicationServiceFactory,
    entitySyncService,
  };
}
