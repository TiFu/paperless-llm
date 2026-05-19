import axios, { AxiosInstance } from 'axios';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { PaperlessConfig } from '../config/AppConfig.js';
import { IDocument, PaginatedDocuments } from '../domain/document/IDocument.js';
import { ITag, ICorrespondent, IDocumentType } from '../domain/document/IDocumentEntities.js';
import { decodeCursor, encodeCursor } from '../utils/cursorUtils.js';
import { createChildLogger } from '../utils/logger.js';
import pino from 'pino';

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

class BidirectionalMap<A, B> {
  private cacheAB: Map<A, B>;
  private cacheBA: Map<B, A>;

  constructor(){
    this.cacheAB = new Map();
    this.cacheBA = new Map();
  }

  set(a: A, b: B) {
    this.cacheAB.set(a, b)
    this.cacheBA.set(b, a)
  }

  hasA(a: A): boolean {
    return this.cacheAB.has(a);
  }

  getA(a: A): B | undefined {
    return this.cacheAB.get(a);
  }

  hasB(b: B): boolean {
    return this.cacheBA.has(b);
  }
  
  getB(b: B): A | undefined {
    return this.cacheBA.get(b);
  }


}

export class PaperlessService implements IDocumentManagementSystem {
  private readonly client: AxiosInstance;
  private readonly documentCache: Map<number, IDocument> = new Map();
  private readonly tagNameCache: BidirectionalMap<number, string> = new BidirectionalMap();
  private readonly tagCache: Map<number, PaperlessTag> = new Map();
  private readonly correspondentCache: BidirectionalMap<number, string> = new BidirectionalMap();
  private readonly documentTypeCache: BidirectionalMap<number, string> = new BidirectionalMap();
  private readonly paperlessConfig: PaperlessConfig;
  private readonly logger: pino.Logger;

  constructor(config: PaperlessConfig) {
    this.paperlessConfig = config;
    this.client = axios.create({
      baseURL: config.url,
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    this.logger = createChildLogger({"name": "PaperlessService"})
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

      // Cache documents
      await Promise.all(
        results.map((doc) => this.convertToIDocument(doc)),
      ).then((documents) =>{
        documents.forEach((d) => this.documentCache.set(d.id, d))
      })

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
        throw new Error(`Paperless-NG API error: ${error.message}`);
      }
      throw error;
    }
  }

  async getDocument(documentId: number): Promise<IDocument> {
    if (this.documentCache.has(documentId)) {
      return Promise.resolve(this.documentCache.get(documentId) as IDocument);
    }

    try {
      const response = await this.client.get<PaperlessDocument>(
        `/api/documents/${documentId}/`,
      );

      const cachedDocument = await this.convertToIDocument(response.data)
      this.documentCache.set(cachedDocument.id, cachedDocument)
      // Return document
      const document = await this.convertToIDocument(response.data);
      return document;
    } catch (error) {
      this.logger.error({ error, "api": "getDocument"})
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Document not found: ${documentId}`);
        }
        throw new Error(`Paperless-NG API error: ${error.message}`);
      }
      throw error;
    }
  }

  async updateDocument(documentId: number, updates: Partial<IDocument>): Promise<void> {
    try {
      // invalidate cache
      this.documentCache.delete(documentId)
      const payload: Record<string, unknown> = {};

      if (updates.title !== undefined) {
        payload.title = updates.title;
      }

      // Handle tags - IDocument has string[] but Paperless expects number[]
      // The updates object should have the metadata with tag IDs if tags are being updated
      if (updates.tags !== undefined) {
        payload.tags = updates.tags.map((t) => this.resolveTagId(t));
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
          throw new Error(`Document not found: ${documentId}`);
        }
        throw new Error(`Paperless-NG API error: ${error.message}`);
      }
      throw error;
    }
  }

  async getDocumentTypeById(id: number): Promise<string> {
    if (this.documentTypeCache.hasA(id)) {
      return Promise.resolve(this.documentTypeCache.getA(id) as string)
    }
    try {
      const response = await this.client.get<{id: number, name: string}>(
        "/api/document_types/" + id + "/"
      );
      const name = response.data.name;

      this.correspondentCache.set(response.data.id, response.data.name)

      return name
    } catch (error) {
      this.logger.error({ error, "api": "getDocumentTypeById"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching tags: ${error.message}`);
      }
      throw error;
    }
  }


  async getCorrespondentById(id: number): Promise<string> {
    if (this.correspondentCache.hasA(id)) {
      return Promise.resolve(this.correspondentCache.getA(id) as string)
    }
    try {
      const response = await this.client.get<{id: number, name: string}>(
        "/api/correspondents/" + id + "/"
      );
      const name = response.data.name;

      this.correspondentCache.set(response.data.id, response.data.name)

      return name
    } catch (error) {
      this.logger.error({ error, "api": "getCorrespondentById"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching tags: ${error.message}`);
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

      tags.forEach((t) => {
        this.tagNameCache.set(t.id, t.name)
        this.tagCache.set(t.id, t)
      })

      return tags;
    } catch (error) {
      this.logger.error({ error, "api": "getTags"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching tags: ${error.message}`);
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

      correspondents.forEach(c => {
        this.correspondentCache.set(c.id, c.name)
      })

      return correspondents
    } catch (error) {
      this.logger.error({ error, "api": "getCorrespondents"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching correspondents: ${error.message}`);
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

      types.forEach((t) => {
        this.documentTypeCache.set(t.id, t.name)
      })

      return types
    } catch (error) {
      this.logger.error({ error, "api": "getDocumentTypes"})
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error fetching document types: ${error.message}`);
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
    if (this.tagNameCache.hasB(tagName)) {
      return Promise.resolve(this.tagNameCache.getB(tagName) as number)
    }
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
        throw new Error(`Paperless-NG API error resolving tag: ${error.message}`);
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
    if (this.correspondentCache.hasB(correspondentName)) {
      return Promise.resolve(this.correspondentCache.getB(correspondentName) as number)
    }

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
        throw new Error(`Paperless-NG API error resolving correspondent: ${error.message}`);
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
    if (this.documentTypeCache.hasB(documentTypeName)) {
      return Promise.resolve(this.documentTypeCache.getB(documentTypeName) as number)
    }
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
        throw new Error(`Paperless-NG API error resolving document type: ${error.message}`);
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
      const tagIds: number[] = [];
      for (const tagName of tagNames) {
        const tagId = await this.resolveTagId(tagName);
        if (tagId === null) {
          // Tag doesn't exist - log warning but continue
          console.warn(`Tag "${tagName}" not found, skipping removal`);
          continue;
        }
        tagIds.push(tagId);
      }

      // If no valid tags to remove, exit early
      if (tagIds.length === 0) {
        return;
      }

      this.logger.info({ tagIds, documentId, "api": "removeTagsFromDocument"})
      // Call bulk_edit endpoint to remove tags
      await this.client.post('/api/documents/bulk_edit/', {
        documents: [documentId],
        method: 'modify_tags',
        parameters: {
          add_tags: [],
          remove_tags: tagIds
        },
      });
    } catch (error) {
      this.logger.error({ error, "api": "removeTagsFromDocument"})
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Document not found: ${documentId}`);
        }
        throw new Error(`Paperless-NG API error removing tags: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Remove the processing tag from a document
   * Uses the configured processing tag
   */
  async removeProcessingTag(documentId: number): Promise<void> {
    const processingTag = this.paperlessConfig.tags;
    if (!processingTag) {
      // No processing tag configured, nothing to remove
      return;
    }
    
    await this.removeTagsFromDocument(documentId, [processingTag]);
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
      if (this.tagNameCache.hasA(tagId)) {
        names.push(this.tagNameCache.getA(tagId)!);
      } else {
        try {
          const response = await this.client.get<PaperlessTag>(`/api/tags/${tagId}/`);
          this.tagNameCache.set(tagId, response.data.name);
          this.tagCache.set(tagId, response.data)
          names.push(response.data.name);
        } catch(error) {
          this.logger.error({ error, "api": "getTagNames"})
          // Skip tags that can't be resolved
        }
      }
    }

    return names;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/documents/?page_size=1');
      return true;
    } catch {
      return false;
    }
  }
}
