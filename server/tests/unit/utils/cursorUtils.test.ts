import { encodeCursor, decodeCursor } from '../../../src/utils/cursorUtils.js';

describe('cursorUtils', () => {
  it('round-trips a cursor through encode/decode', () => {
    const cursor = { paperlessPage: 3, lastDocumentId: 42 };
    const encoded = encodeCursor(cursor);
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it('returns null for a malformed cursor', () => {
    expect(decodeCursor('not-valid-base64-json')).toBeNull();
  });
});
