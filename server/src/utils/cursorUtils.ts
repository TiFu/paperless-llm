/**
 * Cursor format for paginating documents from Paperless API.
 * Encodes the Paperless page number and last document ID seen.
 */
export interface DocumentCursor {
  paperlessPage: number;
  lastDocumentId: number;
}

/**
 * Encodes a cursor object to a base64 string.
 */
export function encodeCursor(cursor: DocumentCursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json).toString('base64');
}

/**
 * Decodes a cursor string back to a cursor object.
 * Returns null if the cursor is invalid.
 */
export function decodeCursor(cursor: string): DocumentCursor | null {
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf-8');
    const decoded = JSON.parse(json);
    
    if (
      typeof decoded.paperlessPage === 'number' &&
      typeof decoded.lastDocumentId === 'number' &&
      decoded.paperlessPage > 0 &&
      decoded.lastDocumentId >= 0  // Allow 0 (indicates new page, no skipping needed)
    ) {
      return decoded;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
