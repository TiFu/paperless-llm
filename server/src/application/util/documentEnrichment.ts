import { IDocument } from '../../domain/document/IDocument.js';
import { IDocumentManagementSystem } from '../../domain/document/IDocumentManagementSystem.js';
import { PaperlessService } from '../../services/PaperlessService.js';

/**
 * Interface for objects referencing a document by ID
 */
export interface DocumentReference {
  documentId: number;
}

/**
 * Type for enriched object with document metadata
 */
export type DocumentEnriched<T extends DocumentReference> = T & { document: IDocument | null };

export async function enrichWithDocument<T extends DocumentReference>(item: T, dms: IDocumentManagementSystem) {
    const result = await enrichAllWithDocument<T>([item], dms);
    return result[0]
}

/**
 * Generic utility to enrich objects with document metadata
 * @param items Array of objects with documentId
 * @param paperlessService Service to fetch document metadata
 * @returns Array of objects with attached document metadata
 */
export async function enrichAllWithDocument<T extends DocumentReference>(
  items: T[],
  paperlessService: IDocumentManagementSystem
): Promise<DocumentEnriched<T>[]> {
  const uniqueIds = Array.from(new Set(items.map(item => item.documentId)));
  const documents = await paperlessService.getDocumentsByIds(uniqueIds);
  const docMap = new Map(documents.map(doc => [doc.id, doc]));
  return items.map(item => ({
    ...item,
    document: docMap.get(item.documentId) || null,
  }));
}
