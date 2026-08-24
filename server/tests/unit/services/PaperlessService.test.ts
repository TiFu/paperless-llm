import axios from 'axios';
import { PaperlessService } from '../../../src/services/PaperlessService.js';

jest.mock('axios');

function mockClient() {
  return { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
}

function paginated<T>(results: T[], next: string | null = null) {
  return { data: { count: results.length, next, previous: null, results } };
}

describe('PaperlessService', () => {
  let client: ReturnType<typeof mockClient>;
  let authClient: ReturnType<typeof mockClient>;
  let service: PaperlessService;

  beforeEach(() => {
    client = mockClient();
    authClient = mockClient();
    let callCount = 0;
    (axios.create as jest.Mock).mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? client : authClient;
    });
    service = new PaperlessService({ url: 'https://paperless.example.com', token: 't', tags: undefined, autoProcessTags: [] });
  });

  describe('pagination', () => {
    it('getTags follows the next link across multiple pages', async () => {
      client.get
        .mockResolvedValueOnce(paginated([{ id: 1, name: 'a' }], 'https://paperless.example.com/api/tags/?page=2'))
        .mockResolvedValueOnce(paginated([{ id: 2, name: 'b' }], null));

      const tags = await service.getTags();

      expect(tags.map((t) => t.id)).toEqual([1, 2]);
      expect(client.get).toHaveBeenCalledTimes(2);
    });

    it('getCorrespondents follows the next link across multiple pages', async () => {
      client.get
        .mockResolvedValueOnce(paginated([{ id: 1, name: 'a' }], 'https://paperless.example.com/api/correspondents/?page=2'))
        .mockResolvedValueOnce(paginated([{ id: 2, name: 'b' }], null));

      const correspondents = await service.getCorrespondents();

      expect(correspondents.map((c) => c.id)).toEqual([1, 2]);
      expect(client.get).toHaveBeenCalledTimes(2);
    });

    it('getDocumentTypes follows the next link across multiple pages', async () => {
      client.get
        .mockResolvedValueOnce(paginated([{ id: 1, name: 'a' }], 'https://paperless.example.com/api/document_types/?page=2'))
        .mockResolvedValueOnce(paginated([{ id: 2, name: 'b' }], null));

      const documentTypes = await service.getDocumentTypes();

      expect(documentTypes.map((d) => d.id)).toEqual([1, 2]);
      expect(client.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('N+1 regression: batched id resolution per page', () => {
    it('getDocumentsByTag issues exactly one tags/correspondents/document_types call each, regardless of doc/tag count', async () => {
      const docs = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        title: `doc-${i}`,
        content: '',
        document_type: 100,
        correspondent: 200,
        tags: [1, 2, 3],
        created: '2024-01-01T00:00:00Z',
        modified: '2024-01-01T00:00:00Z',
      }));

      // Default (uncached) resolver falls back to getTags/getCorrespondents/getDocumentTypes.
      const resolverClient = client;
      resolverClient.get.mockImplementation((url: string, opts?: { params?: Record<string, unknown> }) => {
        if (url === '/api/tags/' && opts?.params?.name__iexact) return Promise.resolve(paginated([{ id: 42, name: 'mytag' }]));
        if (url === '/api/tags/') return Promise.resolve(paginated([1, 2, 3].map((id) => ({ id, name: `tag-${id}` }))));
        if (url === '/api/documents/') return Promise.resolve(paginated(docs));
        if (url === '/api/correspondents/') return Promise.resolve(paginated([{ id: 200, name: 'corr' }]));
        if (url === '/api/document_types/') return Promise.resolve(paginated([{ id: 100, name: 'type' }]));
        throw new Error(`Unexpected URL in test: ${url}`);
      });

      const { documents } = await service.getDocumentsByTag('mytag', 25);

      expect(documents).toHaveLength(5);
      expect(documents[0].tags).toEqual(['tag-1', 'tag-2', 'tag-3']);
      expect(documents[0].correspondent).toBe('corr');
      expect(documents[0].documentType).toBe('type');

      // 1 tag-name-lookup call + 1 document-page call + 1 getTags + 1 getCorrespondents + 1 getDocumentTypes = 5 total,
      // not one per document/tag (the old code would have issued 5*3 + 5 + 5 = 25 extra calls here).
      const urls = resolverClient.get.mock.calls.map((c) => c[0]);
      expect(urls.filter((u) => u === '/api/tags/')).toHaveLength(2); // name lookup + full-catalog resolve
      expect(urls.filter((u) => u === '/api/correspondents/')).toHaveLength(1);
      expect(urls.filter((u) => u === '/api/document_types/')).toHaveLength(1);
      expect(resolverClient.get).toHaveBeenCalledTimes(5);
    });
  });

  describe('setEntityNameResolver', () => {
    it('installs a custom resolver used instead of the default live one', async () => {
      const customResolver = {
        resolveTagNames: jest.fn().mockResolvedValue(new Map([[1, 'custom-tag']])),
        resolveCorrespondentNames: jest.fn().mockResolvedValue(new Map()),
        resolveDocumentTypeNames: jest.fn().mockResolvedValue(new Map()),
      };
      service.setEntityNameResolver(() => customResolver);

      client.get.mockImplementation((url: string) => {
        if (url === '/api/documents/1/') {
          return Promise.resolve({
            data: { id: 1, title: 't', content: '', document_type: null, correspondent: null, tags: [1], created: null, modified: null },
          });
        }
        throw new Error(`Unexpected URL in test: ${url}`);
      });

      const doc = await service.getDocument(1);

      expect(doc.tags).toEqual(['custom-tag']);
      expect(customResolver.resolveTagNames).toHaveBeenCalledWith([1]);
    });
  });

  describe('convertToIDocument mapping (via getDocument)', () => {
    it('omits a tag id that the resolver could not resolve, and maps a missing correspondent/documentType to null', async () => {
      client.get.mockImplementation((url: string) => {
        if (url === '/api/documents/1/') {
          return Promise.resolve({
            data: { id: 1, title: 't', content: '', document_type: null, correspondent: null, tags: [1, 2], created: null, modified: null },
          });
        }
        if (url === '/api/tags/') return Promise.resolve(paginated([{ id: 1, name: 'only-this-one' }]));
        if (url === '/api/correspondents/') return Promise.resolve(paginated([]));
        if (url === '/api/document_types/') return Promise.resolve(paginated([]));
        throw new Error(`Unexpected URL in test: ${url}`);
      });

      const doc = await service.getDocument(1);

      expect(doc.tags).toEqual(['only-this-one']);
      expect(doc.correspondent).toBeNull();
      expect(doc.documentType).toBeNull();
    });
  });
});
