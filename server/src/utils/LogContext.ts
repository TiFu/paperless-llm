import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request / per-step correlation context. Set once via runWithLogContext
 * at the entry point of an HTTP request or a step execution; read by
 * logger.ts's pino `mixin()` on every subsequent log call made anywhere
 * downstream during that continuation — including through logger instances
 * that were cached long before this context existed. AsyncLocalStorage scopes
 * this per async continuation, so concurrent requests/steps never see each
 * other's context even though they may interleave on the event loop.
 */
export interface LogContext {
  readonly correlationId: string;
  readonly jobId?: string;
  readonly stepId?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

export function getLogContext(): LogContext | undefined {
  return storage.getStore();
}

export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  return storage.run(context, fn);
}
