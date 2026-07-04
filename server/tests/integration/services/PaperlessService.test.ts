import { PaperlessService } from '../../../src/services/PaperlessService.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import {
  PAPERLESS_URL,
  PAPERLESS_ADMIN_USER,
  PAPERLESS_ADMIN_PASSWORD,
  paperlessLogin,
  getOrCreateTag,
  getOrCreateCorrespondent,
  getOrCreateDocumentType,
  deleteTag,
  deleteCorrespondent,
  deleteDocumentType,
  deleteDocument,
  uploadDocument,
  waitForDocumentByTitle,
} from '../helpers/paperlessClient.js';

// Real fixture shared with the e2e suite — see e2e/tests/automated-workflow.spec.ts.
const SAMPLE_PDF = `${__dirname}/../../../../dev/consume/invoice_Greg Tran_6712.pdf`;

describe('PaperlessService (integration)', () => {
  let token: string;
  let service: PaperlessService;

  // Per-test cleanup: every entity a test creates gets tracked here and torn
  // down in afterEach, since Paperless has no transaction-rollback
  // equivalent to fall back on (unlike the Postgres repository tests).
  let createdTagIds: number[];
  let createdCorrespondentIds: number[];
  let createdDocumentTypeIds: number[];
  let createdDocumentIds: number[];

  beforeAll(async () => {
    token = await paperlessLogin(PAPERLESS_ADMIN_USER, PAPERLESS_ADMIN_PASSWORD);
    service = new PaperlessService({
      url: PAPERLESS_URL,
      token,
      tags: 'integration-test-processing',
      autoProcessTags: [{ tag: 'integration-auto-test-processing', fields: [], workflowType: WorkflowType.AUTOMATED }],
    });
  });

  beforeEach(() => {
    createdTagIds = [];
    createdCorrespondentIds = [];
    createdDocumentTypeIds = [];
    createdDocumentIds = [];
  });

  afterEach(async () => {
    await Promise.all(createdDocumentIds.map((id) => deleteDocument(token, id)));
    await Promise.all(createdTagIds.map((id) => deleteTag(token, id)));
    await Promise.all(createdCorrespondentIds.map((id) => deleteCorrespondent(token, id)));
    await Promise.all(createdDocumentTypeIds.map((id) => deleteDocumentType(token, id)));
  });

  function uniqueName(prefix: string): string {
    return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function seedTag(name: string): Promise<number> {
    const tag = await getOrCreateTag(token, name);
    createdTagIds.push(tag.id);
    return tag.id;
  }

  async function seedCorrespondent(name: string): Promise<number> {
    const correspondent = await getOrCreateCorrespondent(token, name);
    createdCorrespondentIds.push(correspondent.id);
    return correspondent.id;
  }

  async function seedDocumentType(name: string): Promise<number> {
    const documentType = await getOrCreateDocumentType(token, name);
    createdDocumentTypeIds.push(documentType.id);
    return documentType.id;
  }

  async function seedDocument(title: string, tagIds: number[] = []): Promise<number> {
    await uploadDocument(token, SAMPLE_PDF, title, tagIds);
    const doc = await waitForDocumentByTitle(token, title);
    createdDocumentIds.push(doc.id);
    return doc.id;
  }

  describe('healthCheck', () => {
    it('returns true against a live instance', async () => {
      await expect(service.healthCheck()).resolves.toBe(true);
    });
  });

  describe('authenticate', () => {
    it('returns a token for valid credentials', async () => {
      const result = await service.authenticate(PAPERLESS_ADMIN_USER, PAPERLESS_ADMIN_PASSWORD);
      expect(result.success).toBe(true);
      expect(result.token).toEqual(expect.any(String));
    });

    it('fails for invalid credentials', async () => {
      const result = await service.authenticate(PAPERLESS_ADMIN_USER, 'definitely-wrong-password');
      expect(result).toMatchObject({ success: false, status: 401, token: null });
    });
  });

  describe('tags / correspondents / document types', () => {
    it('getTags includes a tag created directly via the API', async () => {
      const name = uniqueName('integration-tag');
      await seedTag(name);

      const tags = await service.getTags();

      expect(tags.map((t) => t.name)).toContain(name);
    });

    it('getCorrespondents includes a correspondent created directly via the API', async () => {
      const name = uniqueName('integration-correspondent');
      await seedCorrespondent(name);

      const correspondents = await service.getCorrespondents();

      expect(correspondents.map((c) => c.name)).toContain(name);
    });

    it('getDocumentTypes includes a document type created directly via the API', async () => {
      const name = uniqueName('integration-doctype');
      await seedDocumentType(name);

      const documentTypes = await service.getDocumentTypes();

      expect(documentTypes.map((d) => d.name)).toContain(name);
    });

    it('resolveTagId resolves a seeded tag by name', async () => {
      const name = uniqueName('integration-tag');
      const id = await seedTag(name);

      await expect(service.resolveTagId(name)).resolves.toBe(id);
    });

    it('resolveTagId rejects for a nonexistent tag name', async () => {
      await expect(service.resolveTagId(uniqueName('does-not-exist'))).rejects.toThrow();
    });

    it('resolveCorrespondentId resolves a seeded correspondent by name', async () => {
      const name = uniqueName('integration-correspondent');
      const id = await seedCorrespondent(name);

      await expect(service.resolveCorrespondentId(name)).resolves.toBe(id);
    });

    it('resolveDocumentTypeId resolves a seeded document type by name', async () => {
      const name = uniqueName('integration-doctype');
      const id = await seedDocumentType(name);

      await expect(service.resolveDocumentTypeId(name)).resolves.toBe(id);
    });
  });

  describe('document lifecycle', () => {
    it('getDocument returns the uploaded document with resolved tag/correspondent/type names', async () => {
      const tagName = uniqueName('integration-tag');
      const tagId = await seedTag(tagName);
      const title = uniqueName('Integration Test Document');
      const documentId = await seedDocument(title, [tagId]);

      const doc = await service.getDocument(documentId);

      expect(doc.id).toBe(documentId);
      expect(doc.title).toBe(title);
      expect(doc.tags).toContain(tagName);
      expect(doc.createdDate).toBeInstanceOf(Date);
    });

    it('getDocument rejects for a nonexistent document id', async () => {
      await expect(service.getDocument(999_999_999)).rejects.toThrow('Document not found');
    });

    it('getDocumentsByIds returns the uploaded document', async () => {
      const title = uniqueName('Integration Test Document');
      const documentId = await seedDocument(title);

      const docs = await service.getDocumentsByIds([documentId]);

      expect(docs.map((d) => d.id)).toContain(documentId);
    });

    it('getDocumentsByTag returns documents tagged with the given tag', async () => {
      const tagName = uniqueName('integration-tag');
      const tagId = await seedTag(tagName);
      const title = uniqueName('Integration Test Document');
      const documentId = await seedDocument(title, [tagId]);

      const { documents } = await service.getDocumentsByTag(tagName, 10);

      expect(documents.map((d) => d.id)).toContain(documentId);
    });

    it('updateDocument persists title, tags, correspondent and document type changes', async () => {
      const documentId = await seedDocument(uniqueName('Integration Test Document'));
      const newTitle = uniqueName('Updated Title');
      const tagName = uniqueName('integration-tag');
      await seedTag(tagName);
      const correspondentName = uniqueName('integration-correspondent');
      await seedCorrespondent(correspondentName);
      const documentTypeName = uniqueName('integration-doctype');
      await seedDocumentType(documentTypeName);

      await service.updateDocument(documentId, {
        title: newTitle,
        tags: [tagName],
        correspondent: correspondentName,
        documentType: documentTypeName,
      });

      const updated = await service.getDocument(documentId);
      expect(updated.title).toBe(newTitle);
      expect(updated.tags).toContain(tagName);
      expect(updated.correspondent).toBe(correspondentName);
      expect(updated.documentType).toBe(documentTypeName);
    });

    it('removeTagsFromDocument removes the given tag', async () => {
      const tagName = uniqueName('integration-tag');
      const tagId = await seedTag(tagName);
      const documentId = await seedDocument(uniqueName('Integration Test Document'), [tagId]);

      await service.removeTagsFromDocument(documentId, [tagName]);

      const doc = await service.getDocument(documentId);
      expect(doc.tags).not.toContain(tagName);
    });

    it('removeProcessingTag removes the configured processing tag', async () => {
      const processingTagName = 'integration-test-processing';
      const processingTagId = await seedTag(processingTagName);

      const processingTagName2 = 'integration-auto-test-processing';
      const processingTagId2 = await seedTag(processingTagName2);

      const documentId = await seedDocument(uniqueName('Integration Test Document'), [processingTagId, processingTagId2]);


      await service.removeProcessingTag(documentId);

      const doc = await service.getDocument(documentId);
      expect(doc.tags).not.toContain(processingTagName);
      expect(doc.tags).not.toContain(processingTagName2);
    });
  });
});
