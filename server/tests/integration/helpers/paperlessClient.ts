import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

// Mirrors the PAPERLESS_* env vars the CI `server` job sets once a real
// paperless-ngx container (docker/docker-compose.e2e.yml) is up — see
// tests/integration/README.md for the local docker command and defaults.
export const PAPERLESS_URL = process.env.PAPERLESS_URL ?? 'http://localhost:8000';
export const PAPERLESS_ADMIN_USER = process.env.PAPERLESS_ADMIN_USER ?? 'admin';
export const PAPERLESS_ADMIN_PASSWORD = process.env.PAPERLESS_ADMIN_PASSWORD ?? 'admin';

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

interface PaperlessTag {
  id: number;
  name: string;
}

interface PaperlessCorrespondent {
  id: number;
  name: string;
}

interface PaperlessDocumentType {
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

async function getOrCreateByName<T extends { id: number; name: string }>(
  token: string,
  listPath: string,
  name: string,
): Promise<T> {
  const existing = await paperlessFetch(`${listPath}?name__iexact=${encodeURIComponent(name)}`, token);
  const existingData = (await existing.json()) as PaginatedResponse<T>;
  if (existingData.results.length > 0) {
    return existingData.results[0];
  }

  const created = await paperlessFetch(listPath, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return (await created.json()) as T;
}

/** Creates a tag, or returns the existing one with the same name. */
export async function getOrCreateTag(token: string, name: string): Promise<PaperlessTag> {
  return getOrCreateByName<PaperlessTag>(token, '/api/tags/', name);
}

/** Creates a correspondent, or returns the existing one with the same name. */
export async function getOrCreateCorrespondent(token: string, name: string): Promise<PaperlessCorrespondent> {
  return getOrCreateByName<PaperlessCorrespondent>(token, '/api/correspondents/', name);
}

/** Creates a document type, or returns the existing one with the same name. */
export async function getOrCreateDocumentType(token: string, name: string): Promise<PaperlessDocumentType> {
  return getOrCreateByName<PaperlessDocumentType>(token, '/api/document_types/', name);
}

export async function deleteTag(token: string, id: number): Promise<void> {
  await paperlessFetch(`/api/tags/${id}/`, token, { method: 'DELETE' });
}

export async function deleteCorrespondent(token: string, id: number): Promise<void> {
  await paperlessFetch(`/api/correspondents/${id}/`, token, { method: 'DELETE' });
}

export async function deleteDocumentType(token: string, id: number): Promise<void> {
  await paperlessFetch(`/api/document_types/${id}/`, token, { method: 'DELETE' });
}

export async function deleteDocument(token: string, id: number): Promise<void> {
  await paperlessFetch(`/api/documents/${id}/`, token, { method: 'DELETE' });
}

/**
 * Uploads a document with a unique title and the given tags. Paperless's
 * post_document endpoint is async (returns a task id), so callers should
 * follow up with `waitForDocumentByTitle` rather than relying on the response.
 *
 * Paperless deduplicates by file content hash, not by title — re-running the
 * suite against the same fixture file (e.g. while iterating locally without
 * tearing down the container) would otherwise get silently rejected as a
 * duplicate. Appending a unique trailing comment after %%EOF changes the hash
 * without affecting how PDF readers parse the document.
 */
export async function uploadDocument(token: string, filePath: string, title: string, tagIds: number[] = []): Promise<void> {
  const fileContent = Buffer.concat([readFileSync(filePath), Buffer.from(`\n%integration-test-unique:${title}\n`)]);
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

async function poll<T>(
  fn: () => Promise<T | undefined>,
  { timeoutMs, intervalMs, description }: { timeoutMs: number; intervalMs: number; description: string },
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result !== undefined) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${description}`);
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
