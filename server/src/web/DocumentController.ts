import { AppMapper } from '../map/Mapper.js';
import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { EntityValueType } from '../application/DocumentApplicationService.js';
import type { DocumentsListWithPagination } from './dtos/models/DocumentsListWithPagination.js';
import type { TagsList } from './dtos/models/TagsList.js';
import type { CorrespondentsList } from './dtos/models/CorrespondentsList.js';
import type { DocumentTypesList } from './dtos/models/DocumentTypesList.js';
import type { EntityValuesResponse } from './dtos/models/EntityValuesResponse.js';

export class DocumentController {
  private documentAppService;

  constructor(appFactory: ApplicationServiceFactory) {
    this.documentAppService = appFactory.createDocumentApplicationService();
  }

  /**
   * List documents by tag with pagination, scoped to the requesting user's Paperless token
   */
  async listDocuments(
    user: UserContext,
    tag: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<DocumentsListWithPagination> {
    const { documents, nextCursor } = await this.documentAppService.listByTag(user, tag, limit, cursor);
    return AppMapper.toDocumentsListWithPagination({
      documents,
      pagination: { limit, nextCursor },
    });
  }

  async getTags(user: UserContext): Promise<TagsList> {
    const tags = await this.documentAppService.getTags(user);
    return { tags: AppMapper.toTagList(tags) };
  }

  async getCorrespondents(user: UserContext): Promise<CorrespondentsList> {
    const correspondents = await this.documentAppService.getCorrespondents(user);
    return { correspondents: AppMapper.toCorrespondentList(correspondents) };
  }

  async getDocumentTypes(user: UserContext): Promise<DocumentTypesList> {
    const types = await this.documentAppService.getDocumentTypes(user);
    return { documentTypes: AppMapper.toDocumentTypeList(types) };
  }

  async getEntityValues(user: UserContext, type: EntityValueType): Promise<EntityValuesResponse> {
    const items = await this.documentAppService.getEntityValues(user, type);
    return { items };
  }
}
