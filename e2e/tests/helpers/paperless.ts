import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { poll } from './wait.js';

export const PAPERLESS_URL = process.env.PAPERLESS_URL ?? 'http://localhost:8000';

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

interface PaperlessTag {
  id: number;
  name: string;
}

interface PaperlessDocument {
  id: number;
  title: string;
  tags: number[];
}

async function paperlessFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${PAPERLESS_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Token ${token}`,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Paperless API ${init.method ?? 'GET'} ${path} failed: ${response.status} ${body}`);
  }
  return response;
}

/** Logs in directly against Paperless-ngx's own auth (separate from the app's JWT). */
export async function paperlessLogin(username: string, password: string): Promise<string> {
  const response = await fetch(`${PAPERLESS_URL}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(`Paperless login failed: ${response.status} ${await response.text()}`);
  }
  const { token } = (await response.json()) as { token: string };
  return token;
}

/** Creates a tag, or returns the id of the existing one with the same name. */
export async function getOrCreateTag(token: string, name: string): Promise<number> {
  const existing = await paperlessFetch(`/api/tags/?name__iexact=${encodeURIComponent(name)}`, token);
  const existingData = (await existing.json()) as PaginatedResponse<PaperlessTag>;
  if (existingData.results.length > 0) {
    return existingData.results[0].id;
  }

  const created = await paperlessFetch('/api/tags/', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const tag = (await created.json()) as PaperlessTag;
  return tag.id;
}

/**
 * Uploads a document with a unique title and the given tags. Paperless's
 * post_document endpoint is async (returns a task id), so callers should
 * follow up with `waitForDocumentByTitle` rather than relying on the response.
 *
 * Paperless deduplicates by file content hash, not by title — re-running the
 * suite against the same fixture file (e.g. while iterating locally without
 * tearing down the stack) would otherwise get silently rejected as a
 * duplicate. Appending a unique trailing comment after %%EOF changes the hash
 * without affecting how PDF readers parse the document.
 */
export async function uploadDocument(token: string, filePath: string, title: string, tagIds: number[]): Promise<void> {
  const fileContent = Buffer.concat([readFileSync(filePath), Buffer.from(`\n%e2e-unique:${title}\n`)]);
  const form = new FormData();
  form.append('document', new Blob([fileContent]), basename(filePath));
  form.append('title', title);
  for (const tagId of tagIds) {
    form.append('tags', String(tagId));
  }

  await paperlessFetch('/api/documents/post_document/', token, {
    method: 'POST',
    body: form,
  });
}

/** Polls Paperless until the uploaded document has been indexed and is searchable by title. */
export async function waitForDocumentByTitle(token: string, title: string, timeoutMs = 60_000): Promise<PaperlessDocument> {
  return poll(
    async () => {
      const response = await paperlessFetch(`/api/documents/?title__iexact=${encodeURIComponent(title)}`, token);
      const data = (await response.json()) as PaginatedResponse<PaperlessDocument>;
      return data.results[0];
    },
    { timeoutMs, intervalMs: 2_000, description: `document with title "${title}" to be indexed by Paperless` },
  );
}

export async function getDocument(token: string, documentId: number): Promise<PaperlessDocument> {
  const response = await paperlessFetch(`/api/documents/${documentId}/`, token);
  return (await response.json()) as PaperlessDocument;
}

export async function getTagNamesByIds(token: string, tagIds: number[]): Promise<string[]> {
  const names = await Promise.all(
    tagIds.map(async (id) => {
      const response = await paperlessFetch(`/api/tags/${id}/`, token);
      const tag = (await response.json()) as PaperlessTag;
      return tag.name;
    }),
  );
  return names;
}
