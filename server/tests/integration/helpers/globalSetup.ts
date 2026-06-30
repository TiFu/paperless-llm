import { runner } from 'node-pg-migrate';
import * as path from 'path';

// Jest's globalSetup only transforms this entrypoint file itself — any
// further local `require()`s it makes are resolved by plain Node, bypassing
// jest.config.cjs's moduleNameMapper. So this stays self-contained (only
// external package imports, and process.cwd() instead of import.meta.url —
// the latter doesn't survive ts-jest's CommonJS transform for this file)
// rather than importing ./dbConfig.js.
//
// Runs once before the whole "integration" Jest project, migrating the test
// database up to date. Deliberately bypasses MigrationRunner/AppConfig (see
// src/infrastructure/MigrationRunner.ts) — that path requires a config.yaml
// file at the repo root, which is unnecessary coupling for a test-only DB
// that's fully described by the DB_* env vars already set up in CI.
export default async function globalSetup(): Promise<void> {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 5432;
  const user = process.env.DB_USER || 'paperless_llm';
  const password = process.env.DB_PASSWORD || 'testpassword';
  const database = process.env.DB_NAME || 'paperless_llm_test';
  const databaseUrl = `postgres://${user}:${password}@${host}:${port}/${database}`;

  await runner({
    databaseUrl,
    dir: path.resolve(process.cwd(), 'migrations'),
    migrationsTable: 'pgmigrations',
    createMigrationsSchema: true,
    createSchema: false,
    checkOrder: true,
    direction: 'up',
    count: Infinity,
    singleTransaction: false,
    verbose: false,
    ignorePattern: '\\.d\\.ts$',
    decamelize: false,
  });
}
