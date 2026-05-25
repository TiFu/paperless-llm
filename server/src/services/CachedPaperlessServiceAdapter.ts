import { IDocument } from '../domain/document/IDocument.js';
import { AvailableFields, ICorrespondent, IDocumentType, ITag } from '../domain/document/IDocumentEntities.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { PaperlessService } from './PaperlessService.js';
import { CacheService, DMSCacheService } from './CacheService.js';

interface IDable {
  id: string | number
}
/**
 * Adapter that adds Redis caching to the PaperlessService.
 */
export class CachedPaperlessServiceAdapter implements IDocumentManagementSystem {
  static readonly ALL_KEY = 'all';
  private readonly cache: DMSCacheService;
  private readonly service: PaperlessService;

  constructor(service: PaperlessService, cacheService: DMSCacheService) {
    this.service = service;
    this.cache = cacheService;
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

    const missingDocuments = await this.service.getDocumentsByIds(missingIds.map((a) => a.id));
    const promises = missingDocuments.map(async (val, idx) => {
      const initialIndex = missingIds[idx].index
      cachedDocuments[initialIndex] = val
      await this.cache.documentCache.cache(this.getCacheKey(val), val)
    })

    await Promise.all(promises)
    return cachedDocuments as IDocument[]
  }

  private getCacheKey(doc: IDable): string {
    return "" + doc.id
  }

  private getCacheKeyForId(id: number): string {
    return "" + id
  }

  async getDocumentsByTag(tag: string, limit: number, cursor?: string) {
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
    const mappedTags = tags.map((t) => {
     return { key: "" + t.name, object: t }
    })
    await this.cache.tagCache.cacheAll(mappedTags);
    return tags;
  }

  async getCorrespondents(): Promise<ICorrespondent[]> {
    const correspondents = await this.service.getCorrespondents();
    
    const mappedCorrespondents = correspondents.map((t) => {
     return { key: "" + t.name, object: t }
    })
    await this.cache.tagCache.cacheAll(mappedCorrespondents);
    return correspondents;
  }

  async getDocumentTypes(): Promise<IDocumentType[]> {
    const types = await this.service.getDocumentTypes();
    const mappedTypes = types.map((t) => {
     return { key: "" + t.name, object: t }
    })
    await this.cache.tagCache.cacheAll(mappedTypes);
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
    // Check both Redis and Paperless
    try {
      await this.cache.ping();
      return this.service.healthCheck();
    } catch {
      return false;
    }
  }
}
