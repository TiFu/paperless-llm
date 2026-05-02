#!/usr/bin/env node

import { loadEnv } from './utils/loadEnv';
loadEnv();

import { createAppConfig } from './config/AppConfig';
import { Database } from './infrastructure/Database';
import { TransactionManager } from './infrastructure/TransactionManager';
import { initializeLogger } from './utils/logger';
import { createApiServer } from './api/server';
import { PaperlessService } from './services/PaperlessService';

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

  // Start server
  const server = app.listen(config.api.port, () => {
    logger.info({ port: config.api.port }, 'API server started');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down API server...');
    
    server.close(() => {
      logger.info('API server closed');
    });

    await database.close();
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
