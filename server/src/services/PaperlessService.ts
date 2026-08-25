import axios, { AxiosInstance } from 'axios';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { IPaperlessAuthService, PaperlessAuthResult } from '../domain/auth/IPaperlessAuthService.js';
import { AutoProcessTagConfig } from '../domain/settings/AppSettingsTypes.js';
import { IDocument, PaginatedDocuments } from '../domain/document/IDocument.js';
import { ITag, ICorrespondent, IDocumentType, AvailableFields } from '../domain/document/IDocumentEntities.js';
import { decodeCursor, encodeCursor } from '../utils/cursorUtils.js';
import { createChildLogger } from '../utils/logger.js';
import { LogArea } from '../utils/LogArea.js';
import pino from 'pino';

/**
 * PaperlessService's own view of what it needs to talk to Paperless: url is
 * technical (from AppConfig), tags/autoProcessTags are live settings —
 * assembled fresh by the caller (see UoWImplementation._createDMSForUser)
 * rather than imported from AppConfig's own (narrower) PaperlessConfig type.
 * token is the per-user Paperless API token captured at login (see
 * UoWImplementation._createDMSForUser) — omitted for the bootstrap-level
 * instance used only for authenticate()/healthCheck(), which don't need one.
 */
export interface PaperlessServiceConfig {
  readonly url: string;
  readonly token?: string;
  readonly tags?: string;
  readonly autoProcessTags: AutoProcessTagConfig[];
}

interface PaperlessDocument {
  id: number;
  title: string;
  content: string;
  document_type: number | null;
  correspondent: number | null;
  tags: number[];
  created: string;
  modified: string;
  [key: string]: unknown;
}

interface PaperlessTag {
  id: number;
  name: string;
  color?: string;
  is_inbox_tag?: boolean;
}

interface PaperlessCorrespondent {
  id: number;
  name: string;
}

interface PaperlessDocumentType {
  id: number;
  name: string;
}

interface PaperlessPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Resolves tag/correspondent/document-type ids to names in bulk, once per
 * page of documents converted, instead of one HTTP call per id per
 * document. PaperlessService's default implementation (below) is a live,
 * uncached fetch of the whole catalog — fine for standalone/test use, but
 * CachedPaperlessServiceAdapter overrides it (via setEntityNameResolver)
 * with a cache-only resolver for the normal request path.
 */
export interface EntityNameResolver {
  resolveTagNames(ids: number[]): Promise<Map<number, string>>;
  resolveCorrespondentNames(ids: number[]): Promise<Map<number, string>>;
  resolveDocumentTypeNames(ids: number[]): Promise<Map<number, string>>;
}

export class PaperlessService implements IDocumentManagementSystem, IPaperlessAuthService {
  private readonly client: AxiosInstance;
  private readonly authClient: AxiosInstance;
  private readonly paperlessConfig: PaperlessServiceConfig;
  private readonly logger: pino.Logger;
  private resolver: EntityNameResolver;

  constructor(config: PaperlessServiceConfig) {
    this.paperlessConfig = config;
    this.client = axios.create({
      baseURL: config.url,
      headers: {
        ...(config.token ? { Authorization: `Token ${config.token}` } : {}),
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    this.authClient = axios.create({
      baseURL: config.url,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    this.logger = createChildLogger(LogArea.PAPERLESS, "PaperlessService");
    this.resolver = {
      resolveTagNames: async (): Promise<Map<number, string>> => new Map((await this.getTags()).map((t) => [t.id, t.name])),
      resolveCorrespondentNames: async (): Promise<Map<number, string>> => new Map((await this.getCorrespondents()).map((c) => [c.id, c.name])),
      resolveDocumentTypeNames: async (): Promise<Map<number, string>> => new Map((await this.getDocumentTypes()).map((d) => [d.id, d.name])),
    };
  }

  /**
   * Lets a wrapper (e.g. CachedPaperlessServiceAdapter) swap in a different
   * id→name resolution strategy — the default above always hits Paperless
   * live. `wrap` receives the current resolver so it can be composed rather
   * than only replaced outright.
   */
  setEntityNameResolver(wrap: (defaultResolver: EntityNameResolver) => EntityNameResolver): void {
    this.resolver = wrap(this.resolver);
  }

  async authenticate(username: string, password: string): Promise<PaperlessAuthResult> {
    // A connection blip (refused/reset, DNS hiccup, brief unresponsiveness) looks
    // identical to a genuine outage from here, but is usually gone a moment later —
    // retry transient failures a couple of times before reporting Paperless as
    // unavailable. Credential errors (400/401/403) are never transient, so they
    // fail immediately without retrying.
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.authClient.post<{ token: string }>('/api/token/', { username, password });
        const token = response.data.token;
        const isAdmin = await this.fetchIsAdmin(username, token);
        return { token, success: true, isAdmin };
      } catch (error) {
        if (axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0)) {
          return { token: null, success: false, status: 401, message: 'Invalid credentials' };
        }
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
    }
    this.logger.error({ error: lastError, api: 'authenticate', attempts: maxAttempts }, 'Paperless authentication request failed');
    return { token: null, success: false, status: 500, message: 'Paperless authentication service is unavailable' };
  }

  /**
   * Looks up the just-authenticated user's own record via
   * GET /api/users/?username=... (UserFilterSet supports exact username
   * filtering) to read is_superuser/is_staff — Paperless's /api/token/
   * response and its /api/profile/ "who am I" endpoint don't carry these
   * fields, only the /api/users/ collection's UserSerializer does.
   * is_staff is what Paperless's own UI labels "Admin" on a user's account
   * settings, so either flag grants local settings-edit access. Best-effort:
   * a failure here doesn't fail the login, it just skips settings-permission
   * sync for this login (existing local access, if any, is left as-is).
   */
  private async fetchIsAdmin(username: string, token: string): Promise<boolean | undefined> {
    try {
      const response = await this.authClient.get<{
        results: Array<{ username: string; is_superuser: boolean; is_staff: boolean }>;
      }>(
        '/api/users/',
        {
          params: { username },
          headers: { Authorization: `Token ${token}` },
        },
      );
      // Case-insensitive: Paperless's own username filter/login is
      // case-insensitive, so the returned record's username casing isn't
      // guaranteed to match what was typed at login.
      const user = response.data.results.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!user) return undefined;
      return user.is_superuser || user.is_staff;
    } catch (error) {
      this.logger.warn({ error, api: 'fetchIsAdmin' }, 'Failed to look up Paperless user is_superuser/is_staff status');
      return undefined;
    }
  }

  /**
   * Follows Paperless's `next` pagination link to accumulate every page's
   * `results` into a single array. Paperless's default page size is small
   * (25), so any collection-listing endpoint (tags, correspondents,
   * document types) can silently truncate at page 1 without this.
   */
  private async fetchAllPages<T>(url: string, params?: Record<string, unknown>): Promise<T[]> {
    const results: T[] = [];
    let next: string | null = url;
    let isFirst = true;
    while (next) {
      const response: { data: PaperlessPaginatedResponse<T> } = isFirst
        ? await this.client.get<PaperlessPaginatedResponse<T>>(next, { params })
        : await this.client.get<PaperlessPaginatedResponse<T>>(next);
      results.push(...response.data.results);
      next = response.data.next;
      isFirst = false;
    }
    return results;
  }

  async getAvailableFields(): Promise<AvailableFields> {
    const [tags, correspondents, documentTypes] = await Promise.all([
      this.getTags(),
      this.getCorrespondents(),
      this.getDocumentTypes(),
    ]);
    return { tags, correspondents, documentTypes };
  }

  /**
   * Bulk fetch documents by IDs
   * @param ids Array of document IDs
   * @returns Array of IDocument (order not guaranteed)
   */
  async getDocumentsByIds(ids: number[]): Promise<IDocument[]> {
    // Remove duplicates and filter falsy
    const uniqueIds = [...new Set(
      ids
        .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
        .filter((id) => id && !isNaN(id)),
    )];

    if (uniqueIds.length === 0) {
      return [];
    }

    this.logger.debug({ count: uniqueIds.length }, 'Bulk fetching documents from Paperless');

    try {
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessDocument>>(
        '/api/documents/',
        {
          params: {
            id__in: uniqueIds.join(','),
            page_size: uniqueIds.length,
          },
        },
      );

      return await this.convertDocumentsPage(response.data.results);
    } catch (error) {
      this.logger.error({ error, api: 'getDocumentsByIds' });
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  async getDocumentsByTag(
    tag: string,
    limit: number,
    cursor?: string
  ): Promise<PaginatedDocuments> {
    this.logger.debug({ tag, cursor }, 'Querying documents by tag');
    try {
      // Decode cursor to get starting position
      let paperlessPage = 1;
      let lastDocumentId: number | undefined;
      
      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
          paperlessPage = decoded.paperlessPage;
          lastDocumentId = decoded.lastDocumentId;
        }
      }

      // First, find the tag ID by name
      const tagsResponse = await this.client.get<PaperlessPaginatedResponse<PaperlessTag>>(
        '/api/tags/',
        {
          params: { name__iexact: tag },
        },
      );

      if (tagsResponse.data.results.length === 0) {
        return { documents: [], nextCursor: null };
      }

      const tagId = tagsResponse.data.results[0].id;

      // Get documents with this tag from the specified page
      const docsResponse = await this.client.get<PaperlessPaginatedResponse<PaperlessDocument>>(
        '/api/documents/',
        {
          params: {
            tags__id__in: tagId,
            page: paperlessPage,
            page_size: limit,
          },
        },
      );

      let results = docsResponse.data.results;

      // If cursor provided AND lastDocumentId > 0, skip documents until we pass the lastDocumentId
      // (lastDocumentId is 0 when moving to a new page, so we don't skip anything)
      if (lastDocumentId !== undefined) {
        const startIndex = results.findIndex(doc => doc.id === lastDocumentId);
        if (startIndex !== -1) {
          // Skip the lastDocumentId itself and all documents before it
          results = results.slice(startIndex + 1);
        }
        // If lastDocumentId not found, we're likely on a different page than expected
        // due to deletions/changes. Return all results from this page.
      }

      // No in-memory caching; handled by adapter

      // Convert
      const documents = await this.convertDocumentsPage(results);

      // Determine nextCursor
      let nextCursor: string | null = null;
      
      if (documents.length > 0) {
        const lastDoc = results[results.length - 1];
        
        // Check if there are more pages or more documents on current page
        if (docsResponse.data.next) {
          // If we consumed all results from this page, move to next page
          if (results.length === docsResponse.data.results.length) {
            // Moving to next page: set lastDocumentId to 0 so we don't skip anything on the new page
            nextCursor = encodeCursor({
              paperlessPage: paperlessPage + 1,
              lastDocumentId: lastDoc.id,
            });
          } else {
            // Still on same page, more documents after lastDocumentId
            nextCursor = encodeCursor({
              paperlessPage: paperlessPage,
              lastDocumentId: lastDoc.id,
            });
          }
        }
      }

      this.logger.debug({ tag, count: documents.length }, 'Documents by tag fetched');
      return { documents, nextCursor };
    } catch (error) {
      this.logger.error({ error, "api": "getDocumentsByTag"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  async getDocument(documentId: number): Promise<IDocument> {
    // No in-memory caching; handled by adapter
    this.logger.debug({ documentId }, 'Fetching document from Paperless');

    try {
      const response = await this.client.get<PaperlessDocument>(
        `/api/documents/${documentId}/`,
      );

      const [document] = await this.convertDocumentsPage([response.data]);
      return document;
    } catch (error) {
      this.logger.error({ error, "api": "getDocument"})
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Document not found: ${documentId}`, { cause: error });
        }
        throw new Error(`Paperless-NG API error: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  async updateDocument(documentId: number, updates: Partial<IDocument>): Promise<void> {
    try {
      // No in-memory cache to invalidate; handled by adapter
      const payload: Record<string, unknown> = {};

      if (updates.title !== undefined) {
        payload.title = updates.title;
      }

      // Handle tags - IDocument has string[] but Paperless expects number[]
      // The updates object should have the metadata with tag IDs if tags are being updated
      if (updates.tags !== undefined) {
        // TODO: In this case, we need to return some info about the tags we have not applied/not found... for documentation purposes
        const result = await Promise.all(updates.tags.map((t) => this.resolveTagId(t).catch(() => {
          this.logger.info({ tagName: t, }, "Tag not found")
          return null
        })));
        payload.tags = result.filter((f) => f != null)
      }

      // Handle correspondent - from metadata
      if (updates.correspondent) {
        payload.correspondent = await this.resolveCorrespondentId(updates.correspondent);
      }

      // Handle document_type - from metadata
      if (updates.documentType) {
        payload.document_type = await this.resolveDocumentTypeId(updates.documentType);
      }

      // Handle created date - from createdDate field
      if (updates.createdDate !== undefined) {
        payload.created = updates.createdDate ? updates.createdDate.toISOString() : null;
      }
      this.logger.debug({ payload, "api": "updateDocument"}, "Updating document")
      await this.client.patch(`/api/documents/${documentId}/`, payload);
    } catch (error) {
      this.logger.error({ error, "api": "updateDocument"})
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Document not found: ${documentId}`, { cause: error });
        }
        throw new Error(`Paperless-NG API error: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Get all available tags
   */
  async getTags(): Promise<ITag[]> {
    try {
      const results = await this.fetchAllPages<PaperlessTag>('/api/tags/');

      const tags = results.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        isInboxTag: tag.is_inbox_tag,
      }));

      // No in-memory cache; handled by adapter

      return tags;
    } catch (error) {
      this.logger.error({ error, "api": "getTags"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching tags: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Get all available correspondents
   */
  async getCorrespondents(): Promise<ICorrespondent[]> {
    try {
      const results = await this.fetchAllPages<PaperlessCorrespondent>('/api/correspondents/');

      const correspondents = results.map((correspondent) => ({
        id: correspondent.id,
        name: correspondent.name,
      }));

      // No in-memory cache; handled by adapter

      return correspondents
    } catch (error) {
      this.logger.error({ error, "api": "getCorrespondents"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching correspondents: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Get all available document types
   */
  async getDocumentTypes(): Promise<IDocumentType[]> {
    try {
      const results = await this.fetchAllPages<PaperlessDocumentType>('/api/document_types/');

      const types = results.map((docType) => ({
        id: docType.id,
        name: docType.name,
      }));

      // No in-memory cache; handled by adapter

      return types
    } catch (error) {
      this.logger.error({ error, "api": "getDocumentTypes"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching document types: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Resolve tag name to tag ID.
   * @param tagName Tag name to resolve
   * @returns Tag ID, or null if no tag with that name exists
   */
  async resolveTagId(tagName: string): Promise<number | null> {
    // No in-memory cache; handled by adapter
    try {
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessTag>>(
        '/api/tags/',
        {
          params: { name__iexact: tagName },
        },
      );

      if (response.data.results.length === 0) {
        return null;
      }

      return response.data.results[0].id;
    } catch (error) {
      this.logger.error({ error, "api": "resolveTagId"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error resolving tag: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Resolve correspondent name to correspondent ID, optionally creating if it doesn't exist
   * @param correspondentName Correspondent name to resolve
   * @param createIfMissing If true, create the correspondent if it doesn't exist
   * @returns Correspondent ID, or null if not found and createIfMissing is false
   */
  async resolveCorrespondentId(correspondentName: string): Promise<number | null> {
    // No in-memory cache; handled by adapter

    try {
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessCorrespondent>>(
        '/api/correspondents/',
        {
          params: { name__iexact: correspondentName },
        },
      );

      if (response.data.results.length === 0) {
        throw new Error("Correspondent " + correspondentName + " does not exist.")
      }

      return response.data.results[0].id;
    } catch (error) {
      this.logger.error({ error, "api": "resolveCorrespondentId"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error resolving correspondent: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Resolve document type name to document type ID, optionally creating if it doesn't exist
   * @param documentTypeName Document type name to resolve
   * @param createIfMissing If true, create the document type if it doesn't exist
   * @returns Document type ID, or null if not found and createIfMissing is false
   */
  async resolveDocumentTypeId(documentTypeName: string): Promise<number | null> {
    // No in-memory cache; handled by adapter
    try {
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessDocumentType>>(
        '/api/document_types/',
        {
          params: { name__iexact: documentTypeName },
        },
      );

      if (response.data.results.length === 0) {
        throw new Error("Document type " + documentTypeName + " does not exist")
      }

      return response.data.results[0].id;
    } catch (error) {
      this.logger.error({ error, "api": "resolveDocumentTypeId"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error resolving document type: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Remove tags from a document using the bulk_edit endpoint
   * @param documentId The document ID to remove tags from
   * @param tagNames Array of tag names to remove
   */
  async removeTagsFromDocument(documentId: number, tagNames: string[]): Promise<void> {
    try {
      // Resolve tag names to IDs
      const tagIds: Set<number> = new Set<number>();;
      for (const tagName of tagNames) {
        const tagId = await this.resolveTagId(tagName);
        if (tagId === null) {
          // Tag doesn't exist - log warning but continue
          this.logger.warn({ tagName }, "Tag not found, skipping removal");
          continue;
        }
        tagIds.add(tagId);
      }

      // If no valid tags to remove, exit early
      if (tagIds.size === 0) {
        return;
      }

      this.logger.info({ tagIds, documentId, "api": "removeTagsFromDocument"})
      // Call bulk_edit endpoint to remove tags
      await this.client.post('/api/documents/bulk_edit/', {
        documents: [documentId],
        method: 'modify_tags',
        parameters: {
          add_tags: [],
          remove_tags: Array.from(tagIds)
        },
      });
    } catch (error) {
      this.logger.error({ error, "api": "removeTagsFromDocument"})
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Document not found: ${documentId}`, { cause: error });
        }
        throw new Error(`Paperless-NG API error removing tags: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Remove the processing tag from a document
   * Uses the configured processing tag
   */
  async removeProcessingTag(documentId: number): Promise<void> {
    const tags = [
      ...(this.paperlessConfig.tags ? [this.paperlessConfig.tags] : []),
      ...this.paperlessConfig.autoProcessTags.map(t => t.tag),
    ];
    if (tags.length === 0) return;
    await this.removeTagsFromDocument(documentId, tags);
  }

  /**
   * Batches id→name resolution once per page instead of once per document:
   * collects every tag/correspondent/documentType id referenced anywhere in
   * the page, resolves each set in a single call via `this.resolver`, then
   * maps each document synchronously against the resulting lookup tables.
   */
  private async convertDocumentsPage(docs: PaperlessDocument[]): Promise<IDocument[]> {
    const tagIds = [...new Set(docs.flatMap((d) => d.tags))];
    const correspondentIds = [...new Set(docs.map((d) => d.correspondent).filter((id): id is number => id != null))];
    const documentTypeIds = [...new Set(docs.map((d) => d.document_type).filter((id): id is number => id != null))];

    const [tagNames, correspondentNames, documentTypeNames] = await Promise.all([
      this.resolver.resolveTagNames(tagIds),
      this.resolver.resolveCorrespondentNames(correspondentIds),
      this.resolver.resolveDocumentTypeNames(documentTypeIds),
    ]);

    return docs.map((doc) => this.convertToIDocument(doc, tagNames, correspondentNames, documentTypeNames));
  }

  private convertToIDocument(
    doc: PaperlessDocument,
    tagNames: Map<number, string>,
    correspondentNames: Map<number, string>,
    documentTypeNames: Map<number, string>,
  ): IDocument {
    return {
      id: doc.id,
      content: doc.content || '',
      title: doc.title || null,
      tags: doc.tags.map((id) => tagNames.get(id)).filter((name): name is string => name !== undefined),
      correspondent: doc.correspondent != null ? (correspondentNames.get(doc.correspondent) ?? null) : null,
      documentType: doc.document_type != null ? (documentTypeNames.get(doc.document_type) ?? null) : null,
      createdDate: doc.created ? new Date(doc.created) : null,
      modifiedDate: doc.modified ? new Date(doc.modified) : null,
    };
  }

  /**
   * Connectivity check only — uses the unauthenticated client since the
   * bootstrap-level instance has no token. A 401/403 still means the server
   * is up and answering, so only a response-less failure (connection
   * refused, timeout, DNS) counts as unhealthy.
   */
  async healthCheck(): Promise<boolean> {
    return await this.authClient.get('/api/')
      .then(() => true)
      .catch((error) => axios.isAxiosError(error) && error.response !== undefined);
  }
}
