import { IDocument, PaginatedDocuments } from "./IDocument.js";
import { ITag, ICorrespondent, IDocumentType, AvailableFields } from "./IDocumentEntities.js";

export interface IDocumentManagementSystem {
  /**
   * Get documents by tag with pagination
   * @param tag Tag to filter documents by
   * @param limit Number of documents to return (max)
   * @param cursor Optional cursor for pagination
   * @returns Paginated documents with nextCursor
   */
  getDocumentsByTag(
    tag: string,
    limit: number,
    cursor?: string
  ): Promise<PaginatedDocuments>;

  getDocumentsByIds(ids: (number | string)[]): Promise<IDocument[]>;

  /**
   * Get a single document by ID
   * @param documentId Document ID
   * @returns Document with the specified ID
   */
  getDocument(documentId: number): Promise<IDocument>;

  /**
   * Update a document's fields
   * @param documentId Document ID
   * @param updates Object containing fields to update
   */
  updateDocument(documentId: number, updates: Partial<IDocument>): Promise<void>;

  /**
   * Remove tags from a document
   * @param documentId Document ID
   * @param tagNames Array of tag names to remove
   */
  removeTagsFromDocument(documentId: number, tagNames: string[]): Promise<void>;

  /**
   * Remove the processing tag from a document
   * Uses the configured processing tag from system configuration
   * @param documentId Document ID
   */
  removeProcessingTag(documentId: number): Promise<void>;

  /**
   * Perform a health check on the document management system
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get all available tags
   * @returns Array of tags
   */
  getTags(): Promise<ITag[]>;

  /**
   * Get all available correspondents
   * @returns Array of correspondents
   */
  getCorrespondents(): Promise<ICorrespondent[]>;

  /**
   * Get all available document types
   * @returns Array of document types
   */
  getDocumentTypes(): Promise<IDocumentType[]>;

  /**
   * Resolve tag name to tag ID, optionally creating if it doesn't exist
   * @param tagName Tag name to resolve
   * @param createIfMissing If true, create the tag if it doesn't exist
   * @returns Tag ID, or null if not found and createIfMissing is false
   */
  resolveTagId(tagName: string, createIfMissing?: boolean): Promise<number | null>;

  /**
   * Resolve correspondent name to correspondent ID, optionally creating if it doesn't exist
   * @param correspondentName Correspondent name to resolve
   * @param createIfMissing If true, create the correspondent if it doesn't exist
   * @returns Correspondent ID, or null if not found and createIfMissing is false
   */
  resolveCorrespondentId(correspondentName: string, createIfMissing?: boolean): Promise<number | null>;

  /**
   * Resolve document type name to document type ID, optionally creating if it doesn't exist
   * @param documentTypeName Document type name to resolve
   * @param createIfMissing If true, create the document type if it doesn't exist
   * @returns Document type ID, or null if not found and createIfMissing is false
   */
  resolveDocumentTypeId(documentTypeName: string, createIfMissing?: boolean): Promise<number | null>;
  /**
   * Get all available fields for prompt context (tags, correspondents, document types)
   */
  getAvailableFields(): Promise<AvailableFields>;
}
