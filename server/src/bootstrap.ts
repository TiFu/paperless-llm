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
  await dmsCacheService.connect();
  await dmsCacheService.ping();
  logger.info('Cache connection established');

  const usersRepo = new PostgreSQLUsersRepository(pool);

  const paperlessService = new PaperlessService(config.paperless);
  const cachedPaperlessService = new CachedPaperlessServiceAdapter(paperlessService, dmsCacheService);

  const paperlessHealthy = await cachedPaperlessService.healthCheck();
  if (!paperlessHealthy) {
    logger.warn('Paperless-NG health check failed, but continuing...');
  } else {
    logger.info('Paperless-NG connection established');
  }

  const ollamaService = new OllamaService(config.llm);
  const ollamaHealthy = await ollamaService.checkHealth();
  if (!ollamaHealthy) {
    logger.warn('Ollama health check failed, but continuing...');
  } else {
    logger.info('Ollama connection established');
  }

  const entityDescriptionsRepo = new PostgreSQLEntityDescriptionsRepository(pool);
  const uowFactory = new UoWFactory(txManager, config.paperless, dmsCacheService);
  const entitySyncService = new EntitySyncApplicationService(usersRepo, entityDescriptionsRepo, uowFactory);

  const applicationServiceFactory = new ApplicationServiceFactory(
    uowFactory,
    usersRepo,
    cachedPaperlessService,
    ollamaService,
    config.paperless.url,
    config.retry,
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
