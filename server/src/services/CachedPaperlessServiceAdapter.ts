import { IDocument, PaginatedDocuments } from '../domain/document/IDocument.js';
import { AvailableFields, ICorrespondent, IDocumentType, ITag } from '../domain/document/IDocumentEntities.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { EntityNameResolver, PaperlessService } from './PaperlessService.js';
import { CacheService, DMSCacheService } from './CacheService.js';
import { IWorkersConfig } from '../config/AppConfig.js';
import pino from 'pino';
import { createChildLogger } from '../utils/logger.js';
import { LogArea } from '../utils/LogArea.js';

interface IDable {
  id: string | number
}

/**
 * Resolves tag/correspondent/document-type ids to names by reading
 * DMSCacheService's id-keyed catalog caches only — never falls back to a
 * live Paperless call. An id that isn't cached is simply omitted from the
 * result (same "unresolved" behavior as before this cache existed). The
 * catalog is kept warm by EntitySyncApplicationService's existing scheduled
 * sync, which calls CachedPaperlessServiceAdapter.getTags/getCorrespondents/
 * getDocumentTypes below.
 */
class CachingEntityNameResolver implements EntityNameResolver {
  constructor(private readonly cache: DMSCacheService) {}

  resolveTagNames(ids: number[]): Promise<Map<number, string>> {
    return this.resolveViaCache(ids, this.cache.tagByIdCache);
  }

  resolveCorrespondentNames(ids: number[]): Promise<Map<number, string>> {
    return this.resolveViaCache(ids, this.cache.correspondentByIdCache);
  }

  resolveDocumentTypeNames(ids: number[]): Promise<Map<number, string>> {
    return this.resolveViaCache(ids, this.cache.documentTypeByIdCache);
  }

  private async resolveViaCache(ids: number[], idCache: CacheService<{ id: number; name: string }>): Promise<Map<number, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const uniqueIds = [...new Set(ids)];
    const cached = await idCache.getAll(uniqueIds.map((id) => "" + id));
    const result = new Map<number, string>();
    cached.forEach((entry, index) => {
      if (entry) {
        result.set(uniqueIds[index], entry.name);
      }
    });
    return result;
  }
}

/**
 * Adapter that adds Redis caching to the PaperlessService.
 */
export class CachedPaperlessServiceAdapter implements IDocumentManagementSystem {
  static readonly ALL_KEY = 'all';
  private readonly cache: DMSCacheService;
  private readonly service: PaperlessService;
  private readonly config: IWorkersConfig;
  private readonly logger: pino.Logger;

  constructor(service: PaperlessService, cacheService: DMSCacheService, config: IWorkersConfig) {
    this.service = service;
    this.cache = cacheService;
    this.config = config;
    this.logger = createChildLogger(LogArea.PAPERLESS, "CachedPaperlessServiceAdapter");
    this.service.setEntityNameResolver(() => new CachingEntityNameResolver(this.cache));
  }

  /**
   * Catalog cache TTL tracks the live, UI-editable entity-sync poll
   * interval (5x it) rather than the shared document/name-cache TTL, so a
   * single missed sync cycle doesn't expire the catalog mid-cycle.
   */
  private catalogTtlSeconds(): number {
    return 5 * this.config.getEntitySync().pollIntervalMs / 1000;
  }

  async getDocument(documentId: number): Promise<IDocument> {
    const cached = await this.cache.documentCache.get("" + documentId);
    if (cached) {
      return cached
    }
    const doc = await this.service.getDocument(documentId);
    if (doc) {
      await this.cache.documentCache.cache("" + documentId, doc);
    }
    return doc;
  }

  async getDocumentsByIds(ids: number[]): Promise<IDocument[]> {
    // Try to get all from cache, fallback to service for misses
    const keys = ids.map((i) => this.getCacheKeyForId(i))
    const cachedDocuments = await this.cache.documentCache.getAll(keys)

    const missingIds = cachedDocuments.map((val, ind) => { 
      return {id: ids[ind], index: ind, isNull: val == null}
    }).filter((a) => a.isNull)

    this.logger.info({ cacheHits: cachedDocuments.length - missingIds.length, cacheMiss: missingIds.length}, "Document cache")

    const missingDocuments = await this.service.getDocumentsByIds(missingIds.map((a) => a.id));
    const promises = missingDocuments.map(async (val, idx) => {
      const initialIndex = missingIds[idx].index
      cachedDocuments[initialIndex] = val
      //this.cache.documentCache.cache(this.getCacheKey(val), val).catch((err) => { this.logger.error(err, "Failed to cache document " + val.id) })
    })


    await Promise.all(promises)
    const documentsToCache = cachedDocuments.filter((c) => c != null).map((c) => { return {
      key: this.getCacheKey(c),
      object: c
    }})
    this.cache.documentCache.cacheAll(documentsToCache).then(() => {
      this.logger.info({ ids: documentsToCache.map((c) => c.key)}, "Cached objects")
    }).catch((err) => {
      this.logger.error(err, "Failed to cache")
    })
    return cachedDocuments as IDocument[]
  }

  private getCacheKey(doc: IDable): string {
    return "" + doc.id
  }

  private getCacheKeyForId(id: number): string {
    return "" + id
  }

  async getDocumentsByTag(tag: string, limit: number, cursor?: string): Promise<PaginatedDocuments> {
    // Tag-based caching can be complex; for now, do not cache this method
    return this.service.getDocumentsByTag(tag, limit, cursor);
  }

  async updateDocument(documentId: number, updates: Partial<IDocument>): Promise<void> {
    await this.service.updateDocument(documentId, updates);
    // Invalidate cache after update
    await this.cache.documentCache.invalidate(this.getCacheKeyForId(documentId));
  }

  async getTags(): Promise<ITag[]> {
    const tags = await this.service.getTags();
    const ttl = this.catalogTtlSeconds();
    await Promise.all([
      this.cache.tagCache.cacheAll(tags.map((t) => ({ key: "" + t.name, object: t })), ttl),
      this.cache.tagByIdCache.cacheAll(tags.map((t) => ({ key: "" + t.id, object: t })), ttl),
    ]);
    return tags;
  }

  async getCorrespondents(): Promise<ICorrespondent[]> {
    const correspondents = await this.service.getCorrespondents();
    const ttl = this.catalogTtlSeconds();
    await Promise.all([
      this.cache.correspondentCache.cacheAll(correspondents.map((c) => ({ key: "" + c.name, object: c })), ttl),
      this.cache.correspondentByIdCache.cacheAll(correspondents.map((c) => ({ key: "" + c.id, object: c })), ttl),
    ]);
    return correspondents;
  }

  async getDocumentTypes(): Promise<IDocumentType[]> {
    const types = await this.service.getDocumentTypes();
    const ttl = this.catalogTtlSeconds();
    await Promise.all([
      this.cache.documentTypeCache.cacheAll(types.map((t) => ({ key: "" + t.name, object: t })), ttl),
      this.cache.documentTypeByIdCache.cacheAll(types.map((t) => ({ key: "" + t.id, object: t })), ttl),
    ]);
    return types;
  }

  async resolveTagId(name: string): Promise<number | null> {
    // Not cached for now
    const cached = await this.cache.tagCache.get(name);
    if (cached) {
      return cached.id
    } else {
      return this.service.resolveTagId(name);
    }
  }

  async resolveCorrespondentId(name: string): Promise<number | null> {
    // Not cached for now
    const cached = await this.cache.correspondentCache.get(name);
    if (cached) {
      return cached.id;
    } else {
      return this.service.resolveCorrespondentId(name);
    }
  }

  async resolveDocumentTypeId(name: string): Promise<number | null> {
    // Not cached for now
    const cached = await this.cache.documentTypeCache.get(name)
    if (cached) {
      return cached.id
    } else {
      return this.service.resolveDocumentTypeId(name);
    }
  }
  async getAvailableFields(): Promise<AvailableFields> {
    const [tags, correspondents, documentTypes] = await Promise.all([
      this.getTags(),
      this.getCorrespondents(),
      this.getDocumentTypes(),
    ]);
    return { tags, correspondents, documentTypes };
  }

  async removeTagsFromDocument(documentId: number, tagNames: string[]): Promise<void> {
    await this.service.removeTagsFromDocument(documentId, tagNames);
    await this.cache.documentCache.invalidate(this.getCacheKeyForId(documentId))
  }

  async removeProcessingTag(documentId: number): Promise<void> {
    await this.service.removeProcessingTag(documentId);
    await this.cache.documentCache.invalidate(this.getCacheKeyForId(documentId))
  }

  async healthCheck(): Promise<boolean> {
    // Cache is a soft dependency: an unavailable Redis falls back to
    // pass-through, so it must not fail the overall health check.
    const cacheAvailable = await this.cache.ping();
    if (!cacheAvailable) {
      this.logger.warn('Redis cache unavailable, operating in pass-through mode');
    }
    return this.service.healthCheck();
  }
}
