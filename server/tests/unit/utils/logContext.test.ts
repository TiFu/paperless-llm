import pino from 'pino';
import { runWithLogContext, getLogContext } from '../../../src/utils/LogContext.js';

// Builds a throwaway pino instance wired the same way logger.ts's
// initializeLogger() wires the real root logger: a mixin() that reads the
// current AsyncLocalStorage context and merges it into every log line.
// Writes to an in-memory array instead of a real stream so lines can be
// parsed and asserted on directly.
function createCapturingLogger() {
  const lines: string[] = [];
  const stream = { write: (msg: string) => { lines.push(msg); } };
  const logger = pino(
    {
      mixin() {
        const ctx = getLogContext();
        return ctx ? { ...ctx } : {};
      },
    },
    stream,
  );
  return { logger, lines: () => lines.map((l) => JSON.parse(l)) };
}

describe('LogContext + pino mixin', () => {
  it('merges the current context into a log line made inside runWithLogContext', () => {
    const { logger, lines } = createCapturingLogger();

    runWithLogContext({ correlationId: 'abc-123' }, () => {
      logger.info('inside');
    });

    expect(lines()[0].correlationId).toBe('abc-123');
  });

  it('does not include a correlationId for a log line made outside any context', () => {
    const { logger, lines } = createCapturingLogger();

    logger.info('outside');

    expect(lines()[0].correlationId).toBeUndefined();
  });

  it('includes jobId/stepId when present on the context', () => {
    const { logger, lines } = createCapturingLogger();

    runWithLogContext({ correlationId: 'c-1', jobId: 'job-1', stepId: 'step-1' }, () => {
      logger.info('step execution');
    });

    expect(lines()[0]).toMatchObject({ correlationId: 'c-1', jobId: 'job-1', stepId: 'step-1' });
  });

  it('propagates context across an async continuation, e.g. after an await', async () => {
    const { logger, lines } = createCapturingLogger();

    await runWithLogContext({ correlationId: 'async-1' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      logger.info('after await');
    });

    expect(lines()[0].correlationId).toBe('async-1');
  });

  it('keeps two concurrent contexts separate even when interleaved on the event loop', async () => {
    const { logger, lines } = createCapturingLogger();

    await Promise.all([
      runWithLogContext({ correlationId: 'req-a' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        logger.info('from a');
      }),
      runWithLogContext({ correlationId: 'req-b' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        logger.info('from b');
      }),
    ]);

    const parsed = lines();
    const fromA = parsed.find((l) => l.msg === 'from a');
    const fromB = parsed.find((l) => l.msg === 'from b');
    expect(fromA.correlationId).toBe('req-a');
    expect(fromB.correlationId).toBe('req-b');
  });
});
