import axios, { AxiosInstance } from 'axios';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem';
import { IDocument } from '../domain/entities/IDocument';
import { PaperlessConfig } from '../config/AppConfig';

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

  async getDocumentsByTag(tag: string): Promise<IDocument[]> {
    try {
      // First, find the tag ID by name
      const tagsResponse = await this.client.get<{ results: PaperlessTag[] }>(
        '/api/tags/',
        {
          params: { name__iexact: tag },
        },
      );

      if (tagsResponse.data.results.length === 0) {
        return [];
      }

      const tagId = tagsResponse.data.results[0].id;

      // Get documents with this tag
      const docsResponse = await this.client.get<{ results: PaperlessDocument[] }>(
        '/api/documents/',
        {
          params: {
            tags__id__in: tagId,
            page_size: 100,
          },
        },
      );
      
      console.log(docsResponse.data)

      return Promise.all(
        docsResponse.data.results.map((doc) => this.convertToIDocument(doc)),
      );
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

      if (updates.tags !== undefined) {
        // Convert tag names to tag IDs
        const tagIds = await this.resolveTagNames(updates.tags);
        payload.tags = tagIds;
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

  private async resolveTagNames(tagNames: string[]): Promise<number[]> {
    const tagIds: number[] = [];

    for (const tagName of tagNames) {
      try {
        const response = await this.client.get<{ results: PaperlessTag[] }>(
          '/api/tags/',
          {
            params: { name__iexact: tagName },
          },
        );

        if (response.data.results.length > 0) {
          tagIds.push(response.data.results[0].id);
        }
      } catch {
        // Skip tags that can't be resolved
      }
    }

    return tagIds;
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
