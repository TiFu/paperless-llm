import { closeTestPool } from './db.js';

// Each test file gets its own module registry (and therefore its own
// getTestPool() singleton), so the pool must be closed per file rather than
// via a process-wide globalTeardown — registered here via setupFilesAfterEnv
// so every integration test file closes its pool without repeating this.
afterAll(async () => {
  await closeTestPool();
});
