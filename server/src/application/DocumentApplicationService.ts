import { UoWFactory } from '../infrastructure/UoW.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { IDocument } from '../domain/document/IDocument.js';
import { ITag, ICorrespondent, IDocumentType } from '../domain/document/IDocumentEntities.js';
import { getLogger } from '../utils/logger.js';

export type EntityValueType = 'tag' | 'correspondent' | 'document_type';

export type DocumentWithStatus = IDocument & { inProgress: boolean };

// Safety cap on how many consecutive Paperless pages we'll skip through
// when every document on a page is already in progress, so a tag with a
// very long run of in-progress documents can't turn one request into an
// unbounded chain of upstream calls.
const MAX_IN_PROGRESS_PAGES_TO_SKIP = 10;

export class DocumentApplicationService {
  constructor(private readonly uowFactory: UoWFactory) {}

  async listByTag(
    user: UserContext,
    tag: string,
    limit: number,
    cursor?: string,
  ): Promise<{ documents: DocumentWithStatus[]; nextCursor: string | null }> {
    const logger = getLogger();
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();

      const dms = await context.getDMS();
      const jobs = context.getJobs();

      // A "page" from Paperless can be entirely made up of documents that are
      // already queued/in-progress. If we returned that page as-is, the caller
      // would see an apparently empty result even though nextCursor still
      // points at further documents. Keep advancing through pages until we
      // find one with at least one document worth showing, or we genuinely
      // run out of pages.
      const documents: DocumentWithStatus[] = [];
      let nextCursor: string | undefined = cursor;
      let pagesFetched = 0;

      for (;;) {
        const paginatedResult = await dms.getDocumentsByTag(tag, limit, nextCursor);
        pagesFetched++;

        const documentIds = paginatedResult.documents.map(doc => doc.id);
        const inProgressIds = documentIds.length > 0
          ? await jobs.filterInProgressDocuments(documentIds)
          : [];

        const pageDocuments = paginatedResult.documents.map(doc => ({
          ...doc,
          inProgress: inProgressIds.includes(doc.id),
        }));

        documents.push(...pageDocuments);
        nextCursor = paginatedResult.nextCursor ?? undefined;

        const pageHasVisibleDocument = pageDocuments.some(doc => !doc.inProgress);
        if (pageHasVisibleDocument || !nextCursor || pagesFetched >= MAX_IN_PROGRESS_PAGES_TO_SKIP) {
          break;
        }
      }

      await context.commit();
      return { documents, nextCursor: nextCursor ?? null };
    } catch (error) {
      logger.error({ error, tag }, 'Failed to fetch documents');
      throw error;
    }
  }

  async getTags(user: UserContext): Promise<ITag[]> {
    await using context = await this.uowFactory.createUoW(user);
    await context.start();
    const dms = await context.getDMS();
    const tags = dms.getTags();
    await context.commit();
    return tags;
  }

  async getCorrespondents(user: UserContext): Promise<ICorrespondent[]> {
    await using context = await this.uowFactory.createUoW(user);
    await context.start();
    const dms = await context.getDMS();
    const correspondents = await dms.getCorrespondents();
    await context.commit();
    return correspondents;
  }

  async getDocumentTypes(user: UserContext): Promise<IDocumentType[]> {
    await using context = await this.uowFactory.createUoW(user);
    await context.start();
    const dms = await context.getDMS();
    const documentTypes = await dms.getDocumentTypes();
    await context.commit();
    return documentTypes;
  }

  async getEntityValues(
    user: UserContext,
    type: EntityValueType,
  ): Promise<{ id: number; name: string }[]> {
    switch (type) {
      case 'tag': {
        const tags = await this.getTags(user);
        return tags.map(t => ({ id: t.id, name: t.name }));
      }
      case 'correspondent': {
        const correspondents = await this.getCorrespondents(user);
        return correspondents.map(c => ({ id: c.id, name: c.name }));
      }
      case 'document_type': {
        const types = await this.getDocumentTypes(user);
        return types.map(t => ({ id: t.id, name: t.name }));
      }
    }
  }
}
