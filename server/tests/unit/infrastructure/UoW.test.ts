import { UoWImplementation, Saveable } from '../../../src/infrastructure/UoW.js';
import { DBContextWithRepositoryFactory, RepositoryRegistry } from '../../../src/infrastructure/TransactionManager.js';
import { PaperlessConfig, RedisConfig } from '../../../src/config/AppConfig.js';
import { DMSCacheService, DMSSerializers } from '../../../src/services/CacheService.js';
import { CachedPaperlessServiceAdapter } from '../../../src/services/CachedPaperlessServiceAdapter.js';

const paperlessConfig: PaperlessConfig = { url: 'https://paperless.example.com', token: 'system-token', autoProcessTags: [] };
const redisConfig: RedisConfig = { host: 'localhost', port: 6379, username: '', password: '', db: 0, ttlInSeconds: 60 };

function makeFakeContext(): DBContextWithRepositoryFactory {
  // UoWImplementation's constructor unconditionally calls
  // repositoryRegistry.getPermissions() to build the cached permissions
  // adapter, so every fake registry (including per-test overrides below)
  // must provide it even when a test doesn't otherwise care about permissions.
  const fakeRegistry: Partial<RepositoryRegistry> = {
    getUsers: jest.fn(),
    getAuditLog: jest.fn(),
    getPermissions: jest.fn(() => ({}) as never),
  };
  const ctx = {
    start: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    dispose: jest.fn(),
    getClient: jest.fn(),
    [Symbol.asyncDispose]: jest.fn(),
  };
  return {
    ctx: ctx as never,
    repositoryFactory: { create: jest.fn(() => fakeRegistry as RepositoryRegistry) },
  };
}

describe('UoWImplementation', () => {
  describe('transaction lifecycle delegation', () => {
    it('delegates start/commit/rollback/dispose to the underlying transaction context', async () => {
      const context = makeFakeContext();
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers));

      await uow.start();
      await uow.commit();
      await uow.rollback();
      await uow.dispose();

      expect(context.ctx.start).toHaveBeenCalled();
      expect(context.ctx.commit).toHaveBeenCalled();
      expect(context.ctx.rollback).toHaveBeenCalled();
      expect(context.ctx.dispose).toHaveBeenCalled();
    });

    it('[Symbol.asyncDispose] also delegates to the context', async () => {
      const context = makeFakeContext();
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers));

      await uow[Symbol.asyncDispose]();

      expect(context.ctx.dispose).toHaveBeenCalled();
    });
  });

  describe('register/registerAll + save', () => {
    it('calls saveAll with every object passed to a single registerAll call', async () => {
      const context = makeFakeContext();
      const auditLog = { createAll: jest.fn().mockResolvedValue(undefined) };
      (context.repositoryFactory.create as jest.Mock).mockReturnValue({ getAuditLog: () => auditLog, getPermissions: () => ({}) });
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers));

      const repoA: Saveable<{ id: string }> = { save: jest.fn(), saveAll: jest.fn().mockResolvedValue(undefined) };
      const repoB: Saveable<{ id: string }> = { save: jest.fn(), saveAll: jest.fn().mockResolvedValue(undefined) };
      const a1 = { id: 'a1' };
      const a2 = { id: 'a2' };
      const b1 = { id: 'b1' };

      uow.registerAll([a1, a2], repoA);
      uow.register(b1, repoB);

      await uow.save();

      expect(repoA.saveAll).toHaveBeenCalledWith([a1, a2]);
      expect(repoB.saveAll).toHaveBeenCalledWith([b1]);
    });

    it('calls saveAll once per register/registerAll call — separate calls to the same repo are not merged', async () => {
      const context = makeFakeContext();
      const auditLog = { createAll: jest.fn().mockResolvedValue(undefined) };
      (context.repositoryFactory.create as jest.Mock).mockReturnValue({ getAuditLog: () => auditLog, getPermissions: () => ({}) });
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers));

      const repoA: Saveable<{ id: string }> = { save: jest.fn(), saveAll: jest.fn().mockResolvedValue(undefined) };
      const a1 = { id: 'a1' };
      const a2 = { id: 'a2' };

      uow.register(a1, repoA);
      uow.registerAll([a2], repoA);

      await uow.save();

      expect(repoA.saveAll).toHaveBeenCalledTimes(2);
      expect(repoA.saveAll).toHaveBeenCalledWith([a1]);
      expect(repoA.saveAll).toHaveBeenCalledWith([a2]);
    });

    it('clears the object registry after save, so a second save() is a no-op', async () => {
      const context = makeFakeContext();
      const auditLog = { createAll: jest.fn().mockResolvedValue(undefined) };
      (context.repositoryFactory.create as jest.Mock).mockReturnValue({ getAuditLog: () => auditLog, getPermissions: () => ({}) });
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers));
      const repo: Saveable<{ id: string }> = { save: jest.fn(), saveAll: jest.fn().mockResolvedValue(undefined) };

      uow.register({ id: 'a1' }, repo);
      await uow.save();
      await uow.save();

      expect(repo.saveAll).toHaveBeenCalledTimes(1);
    });

    it('flushes collected audit events to the audit log and clears the collector', async () => {
      const context = makeFakeContext();
      const auditLog = { createAll: jest.fn().mockResolvedValue(undefined) };
      (context.repositoryFactory.create as jest.Mock).mockReturnValue({ getAuditLog: () => auditLog, getPermissions: () => ({}) });
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers));

      const entry = { eventType: 'JOB_CREATED' } as never;
      uow.getAuditCollector().record(entry);

      await uow.save();

      expect(auditLog.createAll).toHaveBeenCalledWith([entry]);
      expect(uow.getAuditCollector().getEvents()).toEqual([]);
    });
  });

  describe('getDMS', () => {
    it('throws on a system UoW (no user)', async () => {
      const context = makeFakeContext();
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers));

      await expect(uow.getDMS()).rejects.toThrow(/No DMS available on system UoW/);
    });

    it('throws when the user has no stored Paperless token', async () => {
      const context = makeFakeContext();
      const getPaperlessToken = jest.fn().mockResolvedValue(null);
      (context.repositoryFactory.create as jest.Mock).mockReturnValue({ getUsers: () => ({ getPaperlessToken }), getPermissions: () => ({}) });
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers), { username: 'alice' });

      await expect(uow.getDMS()).rejects.toThrow(/No Paperless token found for user: alice/);
    });

    it('lazily builds a cached DMS for the user and reuses it on subsequent calls', async () => {
      const context = makeFakeContext();
      const getPaperlessToken = jest.fn().mockResolvedValue('alice-token');
      (context.repositoryFactory.create as jest.Mock).mockReturnValue({ getUsers: () => ({ getPaperlessToken }), getPermissions: () => ({}) });
      const uow = new UoWImplementation(context, paperlessConfig, new DMSCacheService(redisConfig, DMSSerializers), { username: 'alice' });

      const dms1 = await uow.getDMS();
      const dms2 = await uow.getDMS();

      expect(dms1).toBeInstanceOf(CachedPaperlessServiceAdapter);
      expect(dms1).toBe(dms2); // cached, not rebuilt
      expect(getPaperlessToken).toHaveBeenCalledTimes(1);
    });
  });
});
