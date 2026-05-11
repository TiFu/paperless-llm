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
}
