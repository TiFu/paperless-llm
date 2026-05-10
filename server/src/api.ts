#!/usr/bin/env node

import { createAppConfig } from './config/AppConfig.js';
import { Database } from './infrastructure/Database.js';
import { TransactionManager } from './infrastructure/TransactionManager.js';
import { WorkerExecutor } from './infrastructure/WorkerExecutor.js';
import { runMigrations } from './infrastructure/MigrationRunner.js';
import { initializeLogger } from './utils/logger.js';
import { createApiServer } from './api/server.js';
import { PaperlessService } from './services/PaperlessService.js';
import { OllamaService } from './services/OllamaService.js';
import { ApplicationServiceFactory } from './application/ApplicationServiceFactory.js';

async function main(): Promise<void> {
  // Load configuration
  const config = createAppConfig();

  // Initialize logger
  const logger = initializeLogger(config);
  logger.info(
    {
      port: config.api.port,
      corsOrigins: config.api.corsOrigins,
    },
    'Starting Paperless LLM API Server',
  );

  // Initialize database
  const database = new Database(config.database);
  const pool = database.getPool();

  // Check database connectivity
  const dbHealthy = await database.healthCheck();
  if (!dbHealthy) {
    logger.error('Database health check failed');
    process.exit(1);
  }
  logger.info('Database connection established');

  // Run database migrations
  try {
    await runMigrations(database, logger);
  } catch (error) {
    logger.error('Database migration failed - cannot start server');
    process.exit(1);
  }

  // Initialize infrastructure
  const txManager = new TransactionManager(pool);
  const paperlessService = new PaperlessService(config.paperless);

  // Check Paperless connectivity
  const paperlessHealthy = await paperlessService.healthCheck();
  if (!paperlessHealthy) {
    logger.warn('Paperless-NG health check failed, but continuing...');
  } else {
    logger.info('Paperless-NG connection established');
  }

  // Initialize Ollama service
  const ollamaService = new OllamaService(config.llm);
  const ollamaHealthy = await ollamaService.healthCheck();
  if (!ollamaHealthy) {
    logger.warn('Ollama health check failed, but continuing...');
  } else {
    logger.info('Ollama connection established');
  }

  // Initialize service factories
  const applicationServiceFactory = new ApplicationServiceFactory(
    txManager,
    paperlessService,
    ollamaService,
    config.paperless.url,
  );

  // Create application services
  const stepExecutorService = applicationServiceFactory.createStepExecutorApplicationService();
  const stuckStepResetService = applicationServiceFactory.createStuckStepResetApplicationService(
    config.worker.stuckStepTimeoutMs,
    config.worker.maxStepRetries,
  );

  // Create Express app
  const app = createApiServer(
    {
      port: config.api.port,
      corsOrigins: config.api.corsOrigins,
    },
    applicationServiceFactory,
    txManager,
    paperlessService,
    ollamaService,
    logger,
  );

  // Start API server
  const server = app.listen(config.api.port, () => {
    logger.info({ port: config.api.port }, 'API server started');
  });

  // Create workflow step processing worker
  const stepProcessorWorker = new WorkerExecutor(
    async () => {
      const processed = await stepExecutorService.processPendingSteps(
        config.worker.batchSize,
      );
      if (processed > 0) {
        logger.debug({ processed }, 'Processed steps');
      }
    },
    config.worker.pollIntervalMs,
    logger.child({ component: 'StepProcessorWorker' }),
  );

  // Create stuck step reset worker
  const stuckStepResetWorker = new WorkerExecutor(
    async () => {
      const result = await stuckStepResetService.resetStuckSteps();
      if (result.reset > 0 || result.failed > 0) {
        logger.info({ reset: result.reset, failed: result.failed }, 'Reset stuck steps');
      }
    },
    config.worker.stuckStepCheckIntervalMs,
    logger.child({ component: 'StuckStepResetWorker' }),
  );

  // Start workers
  logger.info(
    {
      workerId: config.worker.instanceId,
      batchSize: config.worker.batchSize,
      pollIntervalMs: config.worker.pollIntervalMs,
    },
    'Starting workflow step processor',
  );
  stepProcessorWorker.start();

  logger.info(
    {
      timeoutMs: config.worker.stuckStepTimeoutMs,
      checkIntervalMs: config.worker.stuckStepCheckIntervalMs,
      maxRetries: config.worker.maxStepRetries,
    },
    'Starting stuck step reset checker',
  );
  stuckStepResetWorker.start();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    
    // Stop workers
    logger.info('Stopping workers...');
    stepProcessorWorker.stop();
    stuckStepResetWorker.stop();
    
    // Close API server
    server.close(() => {
      logger.info('API server closed');
    });

    // Close database connection
    await database.close();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Run the application
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', error);
  process.exit(1);
});
