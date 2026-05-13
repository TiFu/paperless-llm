import axios, { AxiosInstance } from 'axios';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { PaperlessConfig } from '../config/AppConfig.js';
import { IDocument, PaginatedDocuments } from '../domain/document/IDocument.js';
import { ITag, ICorrespondent, IDocumentType } from '../domain/document/IDocumentEntities.js';
import { decodeCursor, encodeCursor } from '../utils/cursorUtils.js';

interface PaperlessDocument {
  id: number;
  title: string;
  content: string;
  document_type: number;
  correspondent: number;
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

export class PaperlessService implements IDocumentManagementSystem {
  private readonly client: AxiosInstance;
  private readonly tagCache: Map<number, string> = new Map();
  private readonly paperlessConfig: PaperlessConfig;

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

      // Convert to domain documents
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
      if (axios.isAxiosError(error)) {
        throw new Error(`Paperless-NG API error: ${error.message}`);
      }
      throw error;
    }
  }

  async getDocument(documentId: string): Promise<IDocument> {
    try {
      const response = await this.client.get<PaperlessDocument>(
        `/api/documents/${documentId}/`,
      );

      return await this.convertToIDocument(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Document not found: ${documentId}`);
        }
        throw new Error(`Paperless-NG API error: ${error.message}`);
      }
      throw error;
    }
  }

  async updateDocument(documentId: string, updates: Partial<IDocument>): Promise<void> {
    try {
      const payload: Record<string, unknown> = {};

      if (updates.title !== undefined) {
        payload.title = updates.title;
      }

      // Handle tags - IDocument has string[] but Paperless expects number[]
      // The updates object should have the metadata with tag IDs if tags are being updated
      if (updates.tags !== undefined && updates.metadata?.tags !== undefined) {
        payload.tags = updates.metadata.tags;
      }

      // Handle correspondent - from metadata
      if (updates.metadata?.correspondent !== undefined) {
        payload.correspondent = updates.metadata.correspondent;
      }

      // Handle document_type - from metadata
      if (updates.metadata?.document_type !== undefined) {
        payload.document_type = updates.metadata.document_type;
      }

      // Handle created date - from createdDate field
      if (updates.createdDate !== undefined) {
        payload.created = updates.createdDate ? updates.createdDate.toISOString() : null;
      }

      await this.client.patch(`/api/documents/${documentId}/`, payload);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Document not found: ${documentId}`);
        }
        throw new Error(`Paperless-NG API error: ${error.message}`);
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
        '/api/tags/',
        { params: { page_size: 1000 } } // Large page size to get all tags
      );

      return response.data.results.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        isInboxTag: tag.is_inbox_tag,
      }));
    } catch (error) {
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
        '/api/correspondents/',
        { params: { page_size: 1000 } }
      );

      return response.data.results.map((correspondent) => ({
        id: correspondent.id,
        name: correspondent.name,
      }));
    } catch (error) {
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
        '/api/document_types/',
        { params: { page_size: 1000 } }
      );

      return response.data.results.map((docType) => ({
        id: docType.id,
        name: docType.name,
      }));
    } catch (error) {
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
  async resolveTagId(tagName: string, createIfMissing: boolean = false): Promise<number | null> {
    try {
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessTag>>(
        '/api/tags/',
        {
          params: { name__iexact: tagName },
        },
      );

      if (response.data.results.length === 0) {
        if (createIfMissing) {
          // Create the tag
          const createResponse = await this.client.post<PaperlessTag>('/api/tags/', {
            name: tagName,
          });
          return createResponse.data.id;
        }
        return null;
      }

      return response.data.results[0].id;
    } catch (error) {
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
  async resolveCorrespondentId(correspondentName: string, createIfMissing: boolean = false): Promise<number | null> {
    try {
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessCorrespondent>>(
        '/api/correspondents/',
        {
          params: { name__iexact: correspondentName },
        },
      );

      if (response.data.results.length === 0) {
        if (createIfMissing) {
          // Create the correspondent
          const createResponse = await this.client.post<PaperlessCorrespondent>('/api/correspondents/', {
            name: correspondentName,
          });
          return createResponse.data.id;
        }
        return null;
      }

      return response.data.results[0].id;
    } catch (error) {
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
  async resolveDocumentTypeId(documentTypeName: string, createIfMissing: boolean = false): Promise<number | null> {
    try {
      const response = await this.client.get<PaperlessPaginatedResponse<PaperlessDocumentType>>(
        '/api/document_types/',
        {
          params: { name__iexact: documentTypeName },
        },
      );

      if (response.data.results.length === 0) {
        if (createIfMissing) {
          // Create the document type
          const createResponse = await this.client.post<PaperlessDocumentType>('/api/document_types/', {
            name: documentTypeName,
          });
          return createResponse.data.id;
        }
        return null;
      }

      return response.data.results[0].id;
    } catch (error) {
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
  async removeTagsFromDocument(documentId: string, tagNames: string[]): Promise<void> {
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

      // Call bulk_edit endpoint to remove tags
      await this.client.post('/api/documents/bulk_edit/', {
        documents: [parseInt(documentId, 10)],
        method: 'remove_tags',
        parameters: {
          tags: tagIds,
        },
      });
    } catch (error) {
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
  async removeProcessingTag(documentId: string): Promise<void> {
    const processingTag = this.paperlessConfig.tags;
    if (!processingTag) {
      // No processing tag configured, nothing to remove
      return;
    }
    
    await this.removeTagsFromDocument(documentId, [processingTag]);
  }

  private async convertToIDocument(doc: PaperlessDocument): Promise<IDocument> {
    const tagNames = await this.getTagNames(doc.tags);

    const result = {
      id: doc.id.toString(),
      content: doc.content || '',
      title: doc.title || null,
      tags: tagNames,
      metadata: {
        ...doc,
        content: undefined,
        title: undefined,
        tags: undefined,
      },
      createdDate: doc.created ? new Date(doc.created) : null,
      modifiedDate: doc.modified ? new Date(doc.modified) : null,
    };
    console.log(result)
    return result
  }

  // TODO Requires rewrite, just one query instead of n queries...
  private async getTagNames(tagIds: number[]): Promise<string[]> {
    const names: string[] = [];

    for (const tagId of tagIds) {
      if (this.tagCache.has(tagId)) {
        names.push(this.tagCache.get(tagId)!);
      } else {
        try {
          const response = await this.client.get<PaperlessTag>(`/api/tags/${tagId}/`);
          this.tagCache.set(tagId, response.data.name);
          names.push(response.data.name);
        } catch {
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
