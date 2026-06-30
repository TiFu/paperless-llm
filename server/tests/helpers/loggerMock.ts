import pino from 'pino';

// Jest-only stand-in for src/utils/logger.ts (wired up via jest.config.cjs's
// moduleNameMapper). The real module requires a fully loaded AppConfig and
// opens a log file stream as a side effect of initializeLogger(), neither of
// which unit/integration tests should depend on. A silent real pino.Logger
// keeps every call site (createChildLogger().info(...), etc.) working as-is.
const silentLogger = pino({ level: 'silent' });

export function initializeLogger(): pino.Logger {
  return silentLogger;
}

export function getLogger(): pino.Logger {
  return silentLogger;
}

export function createChildLogger(): pino.Logger {
  return silentLogger;
}
