/**
 * Logging areas: buckets loggers by implementation layer rather than by
 * individual class, so an operator can turn up verbosity for e.g. "the LLM
 * integration" without flooding every other subsystem too. Each area's
 * level is independently configurable at runtime — see AppSettingsData's
 * `logging` field and utils/logger.ts's applyLogLevels().
 */
export enum LogArea {
  HTTP = 'http',
  WORKFLOW = 'workflow',
  LLM = 'llm',
  PAPERLESS = 'paperless',
  DATABASE = 'database',
  CACHE = 'cache',
  AUTH = 'auth',
  WORKER = 'worker',
  SETTINGS = 'settings',
  GENERAL = 'general',
}

export const LOG_AREAS: readonly LogArea[] = Object.values(LogArea);

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

export function isLogArea(value: string): value is LogArea {
  return (LOG_AREAS as readonly string[]).includes(value);
}

export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}
