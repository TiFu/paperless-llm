import pino from 'pino';
import { LoggingConfig, WorkersConfig } from '../config/AppConfig.js';
import * as fs from 'fs';
import * as path from 'path';
import { LogArea, LOG_AREAS, LogLevel } from './LogArea.js';
import { getLogContext } from './LogContext.js';

// Only the two config sections initializeLogger actually reads — kept
// narrower than the full AppConfig so callers (e.g. tests) don't need to
// assemble database/paperless/llm config just to stand up a logger.
export interface LoggerConfig {
  readonly logging: LoggingConfig;
  readonly workers: Pick<WorkersConfig, 'instanceId'>;
}

let logger: pino.Logger;

// Every child logger ever created, grouped by area, so a runtime level
// change (applyLogLevels) can reach instances that were cached in a
// constructor long before the change happened — pino children hold their
// own independently-mutable `.level` once set, they don't stay live-linked
// to the parent's level automatically.
const registry = new Map<LogArea, pino.Logger[]>();

/**
 * Custom error serializer that extracts useful information from PostgreSQL errors
 */
function errorSerializer(err: unknown): unknown {
  if (!err) return err;

  const e = err as Record<string, unknown>;
  const serialized: Record<string, unknown> = {
    type: e.constructor?.name || 'Error',
    message: e.message,
    stack: e.stack,
  };

  // PostgreSQL/node-postgres errors have additional useful properties
  if (e.code) {
    serialized.code = e.code;

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

    const code = e.code as string;
    if (pgErrorCodes[code]) {
      serialized.pgError = pgErrorCodes[code];
    }
  }

  // Include PostgreSQL-specific helpful fields
  if (e.detail) serialized.detail = e.detail;
  if (e.hint) serialized.hint = e.hint;
  if (e.table) serialized.table = e.table;
  if (e.column) serialized.column = e.column;
  if (e.constraint) serialized.constraint = e.constraint;
  if (e.severity) serialized.severity = e.severity;
  if (e.schema) serialized.schema = e.schema;
  if (e.routine) serialized.routine = e.routine;

  return serialized;
}

/**
 * @param fileLogging Set false to skip the log-file stream (and the pino-pretty
 * worker thread it implies). Tests set this to false — a fresh module registry
 * per test file means initializeLogger runs repeatedly, and file streams /
 * transport threads it opens are never closed, leaking handles across the run.
 */
export function initializeLogger(config: LoggerConfig, processName: string = 'server', fileLogging: boolean = true): pino.Logger {
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
  ];

  if (fileLogging) {
    const logFilePath = path.join(process.cwd(), `dev-${processName}.log`);
    streams.push({
      level: config.logging.level as pino.Level,
      stream: fs.createWriteStream(logFilePath, { flags: 'a' }),
    });
  }

  logger = pino(
    {
      level: config.logging.level,
      base: {
        workerId: config.workers.instanceId,
      },
      serializers: {
        error: errorSerializer,
        err: errorSerializer, // pino uses 'err' as the default error key
      },
      // Merges the current request/step correlation context (if any) into
      // every log line, including ones made through child loggers that were
      // cached long before that context existed — see utils/LogContext.ts.
      mixin() {
        const ctx = getLogContext();
        return ctx ? { ...ctx } : {};
      },
    },
    pino.multistream(streams)
  );

  registry.clear();

  return logger;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  return logger;
}

/**
 * Create a child logger scoped to a logging area, registered so its level
 * can be updated at runtime by applyLogLevels(). `name` identifies the
 * specific class/module within that area (kept separate from `area` itself
 * so log lines remain individually attributable even though the level is
 * controlled per-area, not per-name).
 */
export function createChildLogger(area: LogArea, name: string, extra?: Record<string, unknown>): pino.Logger {
  const child = getLogger().child({ area, name, ...extra });
  const list = registry.get(area) ?? [];
  list.push(child);
  registry.set(area, list);
  return child;
}

/**
 * Applies a runtime level change to every logger created via
 * createChildLogger so far, per area, falling back to `fallback` for any
 * area not present in `levels` (e.g. one added after this settings row was
 * last saved). Also updates the root logger's own level so anything logged
 * directly via getLogger() (rather than through a child) respects the
 * fallback too. Called by AppConfig after each successful settings refresh.
 */
export function applyLogLevels(levels: Partial<Record<LogArea, LogLevel>>, fallback: LogLevel): void {
  for (const area of LOG_AREAS) {
    const level = levels[area] ?? fallback;
    for (const child of registry.get(area) ?? []) {
      child.level = level;
    }
  }
  getLogger().level = fallback;
}
