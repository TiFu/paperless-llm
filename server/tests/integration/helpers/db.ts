import { Pool, PoolClient } from 'pg';
import { UoW } from '../../../src/infrastructure/UoW.js';
import { UserContext } from '../../../src/domain/auth/UserContext.js';
import {
  PostgresqlDatabaseTransactionContext,
  PostgresRepositoryRegistryFactory,
} from '../../../src/repositories/postgresql/PostgresqlTransactionContext.js';
import { PostgreSQLPermissionsRepository } from '../../../src/repositories/postgresql/PostgreSQLPermissionsRepository.js';
import { RepositoryRegistry } from '../../../src/infrastructure/TransactionManager.js';
import { testDbConfig } from './dbConfig.js';

let pool: Pool | undefined;

export function getTestPool(): Pool {
  if (!pool) {
    pool = new Pool(testDbConfig);
  }
  return pool;
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/**
 * Minimal UoW stand-in for direct repository tests. Repositories call
 * uow.getUser()/getPermissions() for permission-scoped queries and
 * uow.register()/registerAll() to participate in the UoW.save() batching
 * pattern — irrelevant here since tests call repository methods directly and
 * never call save(), so those two are no-ops.
 */
function makeIntegrationUoW(client: PoolClient, user?: UserContext): UoW {
  const permissions = new PostgreSQLPermissionsRepository(client);
  return {
    getUser: () => user,
    getPermissions: () => permissions,
    register: () => {},
    registerAll: () => {},
  } as unknown as UoW;
}

/**
 * Runs `fn` against real repository implementations backed by a fresh
 * transaction (BEGIN on checkout, ROLLBACK + release on completion) so each
 * test starts from the migrated schema with no leftover rows, regardless of
 * whether `fn` throws.
 *
 * `repos` is bound to `user`. Some scenarios need more than one "UoW user"
 * inside the same rolled-back transaction (e.g. seed a global record as the
 * system user, then read it back as a specific user) — `reposFor(otherUser)`
 * builds an additional registry sharing the same underlying transaction/client.
 */
export async function withRepositoryTransaction<T>(
  fn: (repos: RepositoryRegistry, user: UserContext | undefined, reposFor: (otherUser?: UserContext) => RepositoryRegistry) => Promise<T>,
  user?: UserContext,
): Promise<T> {
  const client = await getTestPool().connect();
  const ctx = new PostgresqlDatabaseTransactionContext(client);
  const reposFor = (otherUser?: UserContext): RepositoryRegistry =>
    new PostgresRepositoryRegistryFactory(ctx).create(makeIntegrationUoW(client, otherUser));
  try {
    await ctx.start();
    return await fn(reposFor(user), user, reposFor);
  } finally {
    await ctx.dispose(); // rolls back if still active, then releases the client
  }
}
