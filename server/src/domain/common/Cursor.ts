/**
 * Cursor for pagination
 * Contains the step ID position for fetching the next page
 */
export interface Cursor {
  stepId: string;
}

/**
 * Encode a cursor to a base64 string for API transmission
 */
export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * Decode a base64 cursor string back to a Cursor object
 * Returns null if the cursor is invalid
 */
export function decodeCursor(encodedCursor: string): Cursor | null {
  try {
    const payload = JSON.parse(Buffer.from(encodedCursor, 'base64').toString('utf-8'));
    return {
      stepId: payload.stepId,
    };
  } catch (error) {
    return null;
  }
}
