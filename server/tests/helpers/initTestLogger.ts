import { initializeLogger } from '../../src/utils/logger.js';

// Registered via jest.config.cjs's setupFilesAfterEnv. Each test file gets a
// fresh module registry, so this (and therefore initializeLogger) runs once
// per file; getLogger()/createChildLogger() calls elsewhere then resolve
// against the real pino instance instead of a hand-maintained double.
// Level defaults to silent but can be raised, e.g.
// `LOG_LEVEL=debug npm run test:integration`, to see what the code under
// test actually logged (e.g. the full axios error, including response body).
initializeLogger(
  {
    logging: { level: process.env.LOG_LEVEL ?? 'silent', pretty: false },
    workers: { instanceId: 'test' },
  },
  'test',
  false, // no log file — see initializeLogger's fileLogging param doc
);
