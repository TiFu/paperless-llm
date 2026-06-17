import { UoWFactory } from '../infrastructure/UoW.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { IDocument } from '../domain/document/IDocument.js';
import { ITag, ICorrespondent, IDocumentType } from '../domain/document/IDocumentEntities.js';
import { getLogger } from '../utils/logger.js';

export type EntityValueType = 'tag' | 'correspondent' | 'document_type';

export class DocumentApplicationService {
  constructor(private readonly uowFactory: UoWFactory) {}

  async listByTag(
    user: UserContext,
    tag: string,
    limit: number,
    cursor?: string,
  ): Promise<{ documents: IDocument[]; nextCursor: string | null }> {
    const logger = getLogger();
    try {
      await using context = await this.uowFactory.createUoW(user);
      await context.start();

      const paginatedResult = await context.getDMS().getDocumentsByTag(tag, limit, cursor);

      const documentIds = paginatedResult.documents.map(doc => doc.id);
      const inProgressIds = documentIds.length > 0
        ? await context.getJobs().filterInProgressDocuments(documentIds)
        : [];

      const availableDocuments = paginatedResult.documents.filter(
        doc => !inProgressIds.includes(doc.id),
      );

      await context.commit();
      return { documents: availableDocuments, nextCursor: paginatedResult.nextCursor };
    } catch (error) {
      logger.error({ error, tag }, 'Failed to fetch documents');
      throw error;
    }
  }

  async getTags(user: UserContext): Promise<ITag[]> {
    await using context = await this.uowFactory.createUoW(user);
    await context.start();
    const tags = await context.getDMS().getTags();
    await context.commit();
    return tags;
  }

  async getCorrespondents(user: UserContext): Promise<ICorrespondent[]> {
    await using context = await this.uowFactory.createUoW(user);
    await context.start();
    const correspondents = await context.getDMS().getCorrespondents();
    await context.commit();
    return correspondents;
  }

  async getDocumentTypes(user: UserContext): Promise<IDocumentType[]> {
    await using context = await this.uowFactory.createUoW(user);
    await context.start();
    const documentTypes = await context.getDMS().getDocumentTypes();
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
