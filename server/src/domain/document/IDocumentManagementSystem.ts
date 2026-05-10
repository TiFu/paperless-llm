import { IDocument } from "./IDocument";

export interface IDocumentManagementSystem {
  /**
   * Get documents by tag
   * @param tag Tag to filter documents by
   * @returns Array of documents with the specified tag
   */
  getDocumentsByTag(tag: string): Promise<IDocument[]>;

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
