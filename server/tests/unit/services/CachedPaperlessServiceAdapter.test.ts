import { CachedPaperlessServiceAdapter } from '../../../src/services/CachedPaperlessServiceAdapter.js';
import { PaperlessService, EntityNameResolver } from '../../../src/services/PaperlessService.js';
import { DMSCacheService, CacheService } from '../../../src/services/CacheService.js';
import { IWorkersConfig } from '../../../src/config/AppConfig.js';

function fakeCacheService<T>(): jest.Mocked<CacheService<T>> {
  return {
    get: jest.fn().mockResolvedValue(null),
    cache: jest.fn().mockResolvedValue(undefined),
    cacheAll: jest.fn().mockResolvedValue(undefined),
    getAll: jest.fn().mockResolvedValue([]),
    invalidate: jest.fn().mockResolvedValue(undefined),
  };
}

function fakeDmsCacheService(): jest.Mocked<DMSCacheService> {
  return {
    documentCache: fakeCacheService(),
    tagCache: fakeCacheService(),
    correspondentCache: fakeCacheService(),
    documentTypeCache: fakeCacheService(),
    tagByIdCache: fakeCacheService(),
    correspondentByIdCache: fakeCacheService(),
    documentTypeByIdCache: fakeCacheService(),
  } as unknown as jest.Mocked<DMSCacheService>;
}

function fakeWorkersConfig(pollIntervalMs = 900000): IWorkersConfig {
  return {
    workers: { instanceId: 'test' },
    getStepExecution: () => ({ enabled: true, batchSize: 5, pollIntervalMs: 30000 }),
    getStuckStepReset: () => ({ enabled: true, timeoutMs: 300000, checkIntervalMs: 30000 }),
    getEntitySync: () => ({ enabled: true, pollIntervalMs }),
    getAutoQueue: () => ({ enabled: false, pollIntervalMs: 60000 }),
  };
}

function fakePaperlessService(): jest.Mocked<PaperlessService> & { capturedResolver?: EntityNameResolver } {
  const service = {
    getTags: jest.fn().mockResolvedValue([]),
    getCorrespondents: jest.fn().mockResolvedValue([]),
    getDocumentTypes: jest.fn().mockResolvedValue([]),
    setEntityNameResolver: jest.fn(),
  } as unknown as jest.Mocked<PaperlessService> & { capturedResolver?: EntityNameResolver };
  (service.setEntityNameResolver as jest.Mock).mockImplementation((wrap: (r: EntityNameResolver) => EntityNameResolver) => {
    service.capturedResolver = wrap({
      resolveTagNames: jest.fn().mockResolvedValue(new Map()),
      resolveCorrespondentNames: jest.fn().mockResolvedValue(new Map()),
      resolveDocumentTypeNames: jest.fn().mockResolvedValue(new Map()),
    });
  });
  return service;
}

describe('CachedPaperlessServiceAdapter', () => {
  describe('CachingEntityNameResolver (installed via setEntityNameResolver)', () => {
    it('resolves ids from the cache without ever calling PaperlessService', async () => {
      const cache = fakeDmsCacheService();
      (cache.tagByIdCache.getAll as jest.Mock).mockResolvedValue([{ id: 1, name: 'cached-tag' }]);
      const service = fakePaperlessService();
      new CachedPaperlessServiceAdapter(service, cache, fakeWorkersConfig());

      const resolver = service.capturedResolver!;
      const result = await resolver.resolveTagNames([1]);

      expect(result.get(1)).toBe('cached-tag');
      expect(service.getTags).not.toHaveBeenCalled();
    });

    it('omits an id that is not in the cache, without ever calling PaperlessService', async () => {
      const cache = fakeDmsCacheService();
      (cache.tagByIdCache.getAll as jest.Mock).mockResolvedValue([null]);
      const service = fakePaperlessService();
      new CachedPaperlessServiceAdapter(service, cache, fakeWorkersConfig());

      const resolver = service.capturedResolver!;
      const result = await resolver.resolveTagNames([999]);

      expect(result.has(999)).toBe(false);
      expect(service.getTags).not.toHaveBeenCalled();
    });

    it('returns an empty map without touching the cache for an empty id list', async () => {
      const cache = fakeDmsCacheService();
      const service = fakePaperlessService();
      new CachedPaperlessServiceAdapter(service, cache, fakeWorkersConfig());

      const resolver = service.capturedResolver!;
      const result = await resolver.resolveCorrespondentNames([]);

      expect(result.size).toBe(0);
      expect(cache.correspondentByIdCache.getAll).not.toHaveBeenCalled();
    });
  });

  describe('getTags/getCorrespondents/getDocumentTypes', () => {
    it('getTags writes into tagCache and tagByIdCache (not correspondent/documentType caches)', async () => {
      const cache = fakeDmsCacheService();
      const service = fakePaperlessService();
      (service.getTags as jest.Mock).mockResolvedValue([{ id: 1, name: 'a' }]);
      const adapter = new CachedPaperlessServiceAdapter(service, cache, fakeWorkersConfig());

      await adapter.getTags();

      expect(cache.tagCache.cacheAll).toHaveBeenCalledWith([expect.objectContaining({ key: 'a' })], expect.any(Number));
      expect(cache.tagByIdCache.cacheAll).toHaveBeenCalledWith([expect.objectContaining({ key: '1' })], expect.any(Number));
      expect(cache.correspondentCache.cacheAll).not.toHaveBeenCalled();
      expect(cache.documentTypeCache.cacheAll).not.toHaveBeenCalled();
    });

    it('getCorrespondents writes into correspondentCache and correspondentByIdCache — regression test for the tagCache copy-paste bug', async () => {
      const cache = fakeDmsCacheService();
      const service = fakePaperlessService();
      (service.getCorrespondents as jest.Mock).mockResolvedValue([{ id: 5, name: 'corr' }]);
      const adapter = new CachedPaperlessServiceAdapter(service, cache, fakeWorkersConfig());

      await adapter.getCorrespondents();

      expect(cache.correspondentCache.cacheAll).toHaveBeenCalledWith([expect.objectContaining({ key: 'corr' })], expect.any(Number));
      expect(cache.correspondentByIdCache.cacheAll).toHaveBeenCalledWith([expect.objectContaining({ key: '5' })], expect.any(Number));
      expect(cache.tagCache.cacheAll).not.toHaveBeenCalled();
    });

    it('getDocumentTypes writes into documentTypeCache and documentTypeByIdCache — regression test for the tagCache copy-paste bug', async () => {
      const cache = fakeDmsCacheService();
      const service = fakePaperlessService();
      (service.getDocumentTypes as jest.Mock).mockResolvedValue([{ id: 7, name: 'type' }]);
      const adapter = new CachedPaperlessServiceAdapter(service, cache, fakeWorkersConfig());

      await adapter.getDocumentTypes();

      expect(cache.documentTypeCache.cacheAll).toHaveBeenCalledWith([expect.objectContaining({ key: 'type' })], expect.any(Number));
      expect(cache.documentTypeByIdCache.cacheAll).toHaveBeenCalledWith([expect.objectContaining({ key: '7' })], expect.any(Number));
      expect(cache.tagCache.cacheAll).not.toHaveBeenCalled();
    });

    it('writes the id-keyed cache with a TTL of 5x the entity-sync poll interval', async () => {
      const cache = fakeDmsCacheService();
      const service = fakePaperlessService();
      (service.getTags as jest.Mock).mockResolvedValue([{ id: 1, name: 'a' }]);
      const adapter = new CachedPaperlessServiceAdapter(service, cache, fakeWorkersConfig(120000));

      await adapter.getTags();

      expect(cache.tagByIdCache.cacheAll).toHaveBeenCalledWith(expect.anything(), 5 * 120000 / 1000);
    });
  });
});
