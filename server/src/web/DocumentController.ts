
import { AppMapper } from '../map/Mapper.js';
import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';
import type { DocumentsListWithPagination } from './dtos/models/DocumentsListWithPagination.js';
import type { TagsList } from './dtos/models/TagsList.js';
import type { CorrespondentsList } from './dtos/models/CorrespondentsList.js';
import type { DocumentTypesList } from './dtos/models/DocumentTypesList.js';

export class DocumentController {
  private dmsService;

  constructor(appFactory: ApplicationServiceFactory) {
    this.dmsService = appFactory["dmsService"];
  }

  /**
   * List documents with pagination (by tag, or all if no tag provided)
   */
  async listDocuments(tag?: string, limit: number = 50, cursor?: string): Promise<DocumentsListWithPagination> {
    let paged;
    if (tag) {
      paged = await this.dmsService.getDocumentsByTag(tag, limit, cursor);
    } else {
      // If you have a getAllDocuments or similar, use it; otherwise, return empty
      paged = { documents: [], nextCursor: null };
    }
    return AppMapper.toDocumentsListWithPagination({
      documents: paged.documents,
      pagination: { limit, nextCursor: paged.nextCursor },
    });
  }

  async getTags(): Promise<TagsList> {
    const tags = await this.dmsService.getTags();
    return { tags: AppMapper.toTagList(tags) };
  }

  async getCorrespondents(): Promise<CorrespondentsList> {
    const correspondents = await this.dmsService.getCorrespondents();
    return { correspondents: AppMapper.toCorrespondentList(correspondents) };
  }

  async getDocumentTypes(): Promise<DocumentTypesList> {
    const types = await this.dmsService.getDocumentTypes();
    return { documentTypes: AppMapper.toDocumentTypeList(types) };
  }
}
