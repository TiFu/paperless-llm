import pino from 'pino';
import { AppConfig } from '../config/AppConfig.js';
import * as fs from 'fs';
import * as path from 'path';

let logger: pino.Logger;

/**
 * Custom error serializer that extracts useful information from PostgreSQL errors
 */
function errorSerializer(err: any): any {
  if (!err) return err;

  const serialized: any = {
    type: err.constructor?.name || 'Error',
    message: err.message,
    stack: err.stack,
  };

  // PostgreSQL/node-postgres errors have additional useful properties
  if (err.code) {
    serialized.code = err.code;
    
    // Add human-readable code explanation for common PostgreSQL error codes
    const pgErrorCodes: Record<string, string> = {
      '42P01': 'undefined_table',
      '42703': 'undefined_column',
      '23505': 'unique_violation',
      '23503': 'foreign_key_violation',
      '23502': 'not_null_violation',
      '42883': 'undefined_function',
      '42P07': 'duplicate_table',
      '42601': 'syntax_error',
      '08006': 'connection_failure',
      '08003': 'connection_does_not_exist',
      '28P01': 'invalid_password',
    };
    
    if (pgErrorCodes[err.code]) {
      serialized.pgError = pgErrorCodes[err.code];
    }
  }

  // Include PostgreSQL-specific helpful fields
  if (err.detail) serialized.detail = err.detail;
  if (err.hint) serialized.hint = err.hint;
  if (err.table) serialized.table = err.table;
  if (err.column) serialized.column = err.column;
  if (err.constraint) serialized.constraint = err.constraint;
  if (err.severity) serialized.severity = err.severity;
  if (err.schema) serialized.schema = err.schema;
  if (err.routine) serialized.routine = err.routine;

  return serialized;
}

export function initializeLogger(config: AppConfig, processName: string = 'server'): pino.Logger {
  // Create log file in server directory
  const logFilePath = path.join(process.cwd(), `dev-${processName}.log`);
  console.log("Log file pat " + logFilePath)
  //process.exit(1)
  const logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  // Create streams for both console and file
  const streams: pino.StreamEntry[] = [
    // Console stream with pretty printing
    {
      level: config.logging.level as pino.Level,
      stream: config.logging.pretty
        ? pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          })
        : process.stdout,
    },
    // File stream with JSON output
    {
      level: config.logging.level as pino.Level,
      stream: logFileStream,
    },
  ];

  logger = pino(
    {
      level: config.logging.level,
      base: {
        workerId: config.worker.instanceId,
      },
      serializers: {
        error: errorSerializer,
        err: errorSerializer, // pino uses 'err' as the default error key
      },
    },
    pino.multistream(streams)
  );

  return logger;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  return logger;
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return getLogger().child(context);
}
