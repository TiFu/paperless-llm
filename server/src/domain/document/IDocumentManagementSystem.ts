import { IDocument, PaginatedDocuments } from "./IDocument.js";

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

  /**
   * Get a single document by ID
   * @param documentId Document ID
   * @returns Document with the specified ID
   */
  getDocument(documentId: string): Promise<IDocument>;

  /**
   * Update a document's fields
   * @param documentId Document ID
   * @param updates Object containing fields to update
   */
  updateDocument(documentId: string, updates: Partial<IDocument>): Promise<void>;

  /**
   * Remove tags from a document
   * @param documentId Document ID
   * @param tagNames Array of tag names to remove
   */
  removeTagsFromDocument(documentId: string, tagNames: string[]): Promise<void>;

  /**
   * Remove the processing tag from a document
   * Uses the configured processing tag from system configuration
   * @param documentId Document ID
   */
  removeProcessingTag(documentId: string): Promise<void>;

  /**
   * Perform a health check on the document management system
   */
  healthCheck(): Promise<boolean>;
}
