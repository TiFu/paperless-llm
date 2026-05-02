#!/usr/bin/env node

import { createAppConfig } from './config/AppConfig';
import { Database } from './infrastructure/Database';
import { TransactionManager } from './infrastructure/TransactionManager';
import { initializeLogger } from './utils/logger';
import { createApiServer } from './api/server';
import { PaperlessService } from './services/PaperlessService';
import { OllamaService } from './services/OllamaService';
import { JobService } from './services/JobService';
import { ActionService } from './services/ActionService';
import { LLMWorkerService } from './services/LLMWorkerService';
import { DocumentUpdateWorkerService } from './services/DocumentUpdateWorkerService';

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

  // Initialize job processing services
  const jobService = new JobService(
    txManager,
    paperlessService,
    ollamaService,
    config.worker.maxRetries,
  );

  const actionService = new ActionService(
    txManager,
    paperlessService,
    config.worker.maxRetries,
  );

  // Create Express app
  const app = createApiServer(
    {
      port: config.api.port,
      corsOrigins: config.api.corsOrigins,
    },
    txManager,
    paperlessService,
    logger,
  );

  // Start API server
  const server = app.listen(config.api.port, () => {
    logger.info({ port: config.api.port }, 'API server started');
  });

  // Create and start workers
  logger.info(
    {
      workerId: config.worker.instanceId,
      batchSize: config.worker.batchSize,
      pollIntervalMs: config.worker.pollIntervalMs,
    },
    'Starting background workers',
  );

  const llmWorker = new LLMWorkerService(
    config.worker.batchSize,
    config.worker.pollIntervalMs,
    config.worker.claimTimeoutMs,
    config.worker.instanceId,
    txManager,
    jobService,
  );

  const documentUpdateWorker = new DocumentUpdateWorkerService(
    config.worker.batchSize,
    config.worker.pollIntervalMs,
    config.worker.claimTimeoutMs,
    config.worker.instanceId,
    txManager,
    actionService,
  );

  // Start workers
  llmWorker.start();
  documentUpdateWorker.start();
  logger.info('Background workers started');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    
    // Stop workers first
    logger.info('Stopping workers...');
    llmWorker.stop();
    documentUpdateWorker.stop();
    
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
