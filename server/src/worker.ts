#!/usr/bin/env node

/**
 * Standalone worker process
 * 
 * This file is kept for deployments that need to scale workers separately from the API.
 * For simpler deployments, use api.ts which runs both API server and workers together.
 * 
 * Use cases for standalone workers:
 * - Horizontal scaling: Run multiple worker instances
 * - Resource isolation: Separate CPU/memory limits for API vs workers
 * - Different deployment strategies: API in one service, workers in another
 */

import { createAppConfig } from './config/AppConfig';
import { Database } from './infrastructure/Database';
import { TransactionManager } from './infrastructure/TransactionManager';
import { PaperlessService } from './services/PaperlessService';
import { OllamaService } from './services/OllamaService';
import { JobService } from './services/JobService';
import { ActionService } from './services/ActionService';
import { LLMWorkerService } from './services/LLMWorkerService';
import { DocumentUpdateWorkerService } from './services/DocumentUpdateWorkerService';
import { initializeLogger } from './utils/logger';

async function main(): Promise<void> {
  // Load configuration
  const config = createAppConfig();

  // Initialize logger
  const logger = initializeLogger(config);
  logger.info(
    {
      workerId: config.worker.instanceId,
      batchSize: config.worker.batchSize,
      pollIntervalMs: config.worker.pollIntervalMs,
    },
    'Starting Paperless LLM Workers',
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

  // Initialize external services
  const paperlessService = new PaperlessService(config.paperless);
  
  // Check external service connectivity
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

  // Initialize JobService for LLM Worker
  const jobService = new JobService(
    txManager,
    paperlessService,
    ollamaService,
    config.worker.maxRetries,
  );

  // Initialize ActionService for Document Update Worker
  const actionService = new ActionService(
    txManager,
    paperlessService,
    config.worker.maxRetries,
  );

  // Create both workers
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

  // Start both workers concurrently
  logger.info('Starting workers');
  llmWorker.start(),
  documentUpdateWorker.start(),

  // Cleanup on exit
  process.on('exit', async () => {
    logger.info('Shutting down...');
    await database.close();
  });
}

// Run the application
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error:', error);
  process.exit(1);
});
