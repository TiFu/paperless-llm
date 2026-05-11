import axios, { AxiosInstance } from 'axios';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { PaperlessConfig } from '../config/AppConfig.js';
import { IDocument, PaginatedDocuments } from '../domain/document/IDocument.js';
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

  constructor(config: PaperlessConfig) {
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

      // If cursor provided, skip documents until we pass the lastDocumentId
      if (lastDocumentId !== undefined) {
        const startIndex = results.findIndex(doc => doc.id === lastDocumentId);
        if (startIndex !== -1) {
          // Skip the lastDocumentId itself and all documents before it
          results = results.slice(startIndex + 1);
        } else {
          // If lastDocumentId not found on this page, assume we start fresh
          // This handles the case where documents were deleted
          results = [];
        }
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
