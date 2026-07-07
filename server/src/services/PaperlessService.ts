import axios, { AxiosInstance } from 'axios';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { IPaperlessAuthService, PaperlessAuthResult } from '../domain/auth/IPaperlessAuthService.js';
import { AutoProcessTagConfig } from '../domain/settings/AppSettingsTypes.js';
import { IDocument, PaginatedDocuments } from '../domain/document/IDocument.js';
import { ITag, ICorrespondent, IDocumentType, AvailableFields } from '../domain/document/IDocumentEntities.js';
import { decodeCursor, encodeCursor } from '../utils/cursorUtils.js';
import { createChildLogger } from '../utils/logger.js';
import pino from 'pino';

/**
 * PaperlessService's own view of what it needs to talk to Paperless: url/
 * token are technical (from AppConfig), tags/autoProcessTags are live
 * settings — assembled fresh by the caller (see UoWImplementation.
 * _createDMSForUser) rather than imported from AppConfig's own (narrower)
 * PaperlessConfig type.
 */
export interface PaperlessServiceConfig {
  readonly url: string;
  readonly token: string;
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

export class PaperlessService implements IDocumentManagementSystem, IPaperlessAuthService {
  private readonly client: AxiosInstance;
  private readonly authClient: AxiosInstance;
  private readonly paperlessConfig: PaperlessServiceConfig;
  private readonly logger: pino.Logger;

  constructor(config: PaperlessServiceConfig) {
    this.paperlessConfig = config;
    this.client = axios.create({
      baseURL: config.url,
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    this.authClient = axios.create({
      baseURL: config.url,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    this.logger = createChildLogger({"name": "PaperlessService"})
  }

  async authenticate(username: string, password: string): Promise<PaperlessAuthResult> {
    try {
      const response = await this.authClient.post<{ token: string }>('/api/token/', { username, password });
      const token = response.data.token;
      const isSuperuser = await this.fetchIsSuperuser(username, token);
      return { token, success: true, isSuperuser };
    } catch (error) {
      if (axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0)) {
        return { token: null, success: false, status: 401, message: 'Invalid credentials' };
      }
      this.logger.error({ error, api: 'authenticate' }, 'Paperless authentication request failed');
      return { token: null, success: false, status: 500, message: 'Paperless authentication service is unavailable' };
    }
  }

  /**
   * Looks up the just-authenticated user's own record via
   * GET /api/users/?username=... (UserFilterSet supports exact username
   * filtering) to read is_superuser — Paperless's /api/token/ response and
   * its /api/profile/ "who am I" endpoint don't carry this field, only the
   * /api/users/ collection's UserSerializer does. Best-effort: a failure
   * here doesn't fail the login, it just skips settings-permission sync for
   * this login (existing local access, if any, is left as-is).
   */
  private async fetchIsSuperuser(username: string, token: string): Promise<boolean | undefined> {
    try {
      const response = await this.authClient.get<{ results: Array<{ username: string; is_superuser: boolean }> }>(
        '/api/users/',
        {
          params: { username },
          headers: { Authorization: `Token ${token}` },
        },
      );
      return response.data.results.find(u => u.username === username)?.is_superuser;
    } catch (error) {
      this.logger.warn({ error, api: 'fetchIsSuperuser' }, 'Failed to look up Paperless user is_superuser status');
      return undefined;
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

  /**
   * Bulk fetch documents by IDs
   * @param ids Array of document IDs
   * @returns Array of IDocument (order not guaranteed)
   */
  async getDocumentsByIds(ids: number[]): Promise<IDocument[]> {
    // Remove duplicates and filter falsy
    const docs: IDocument[] = [];
    for (const id of ids) {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (!numId || isNaN(numId)) continue;
      try {
        const doc = await this.getDocument(numId);
        docs.push(doc);
      } catch (e) {
        // Optionally log or skip missing documents
        this.logger.warn({ id, error: e }, 'Failed to fetch document for enrichment');
      }
    }
    return docs;
  }

  async getDocumentsByTag(
    tag: string,
    limit: number,
    cursor?: string
  ): Promise<PaginatedDocuments> {
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
      const documents = await Promise.all(
        results.map((doc) => this.convertToIDocument(doc)),
      );

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

    try {
      const response = await this.client.get<PaperlessDocument>(
        `/api/documents/${documentId}/`,
      );

      const document = await this.convertToIDocument(response.data);
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
      this.logger.info({ payload, "api": "updateDocument"}, "Updating document")
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

  async getDocumentTypeById(id: number): Promise<string> {
    // No in-memory cache; handled by adapter
    try {
      const response = await this.client.get<{id: number, name: string}>(
        "/api/document_types/" + id + "/"
      );
      const name = response.data.name;

      // No in-memory cache; handled by adapter

      return name
    } catch (error) {
      this.logger.error({ error, "api": "getDocumentTypeById"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching tags: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }


  async getCorrespondentById(id: number): Promise<string> {
    // No in-memory cache; handled by adapter
    try {
      const response = await this.client.get<{id: number, name: string}>(
        "/api/correspondents/" + id + "/"
      );
      const name = response.data.name;

      // No in-memory cache; handled by adapter

      return name
    } catch (error) {
      this.logger.error({ error, "api": "getCorrespondentById"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching tags: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  /**
   * Get all available tags
   */
  async getTags(): Promise<ITag[]> {
    try {
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessTag>>(
        '/api/tags/' // Large page size to get all tags
      );

      const tags = response.data.results.map((tag) => ({
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
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessCorrespondent>>(
        '/api/correspondents/'
      );

      const correspondents = response.data.results.map((correspondent) => ({
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
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessDocumentType>>(
        '/api/document_types/'
      );

      const types = response.data.results.map((docType) => ({
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
   * Resolve tag name to tag ID, optionally creating if it doesn't exist
   * @param tagName Tag name to resolve
   * @param createIfMissing If true, create the tag if it doesn't exist
   * @returns Tag ID, or null if not found and createIfMissing is false
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
        throw new Error("Tag " + tagName + " does not exist");
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

  private async convertToIDocument(doc: PaperlessDocument): Promise<IDocument> {
    const tagNames = await this.getTagNames(doc.tags);
    let correspondent = null;
    if (doc.correspondent)
      correspondent = await this.getCorrespondentById(doc.correspondent)
    let document_type = null;
    if (doc.document_type)
      document_type = await this.getDocumentTypeById(doc.document_type)
    
    const result = {
      id: doc.id,
      content: doc.content || '',
      title: doc.title || null,
      tags: tagNames,
      correspondent: correspondent,
      documentType: document_type,
      createdDate: doc.created ? new Date(doc.created) : null,
      modifiedDate: doc.modified ? new Date(doc.modified) : null,
    };
    return result
  }

  // TODO Requires rewrite, just one query instead of n queries...
  private async getTagNames(tagIds: number[]): Promise<string[]> {
    const names: string[] = [];

    for (const tagId of tagIds) {
      try {
        const response = await this.client.get<PaperlessTag>(`/api/tags/${tagId}/`);
        names.push(response.data.name);
      } catch(error) {
        this.logger.error({ error, "api": "getTagNames"})
        // Skip tags that can't be resolved
      }
    }

    return names;
  }

  async healthCheck(): Promise<boolean> {
    return await this.client.get('/api/').then(() => true).catch(() => false);
  }
}
