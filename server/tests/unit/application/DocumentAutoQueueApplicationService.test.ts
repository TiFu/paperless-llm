import { DocumentAutoQueueApplicationService } from '../../../src/application/DocumentAutoQueueApplicationService.js';
import { JobApplicationService } from '../../../src/application/JobApplicationService.js';
import { Job } from '../../../src/domain/job/Job.js';
import { JobState } from '../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { IDocument, PaginatedDocuments } from '../../../src/domain/document/IDocument.js';
import type { AutoProcessTagConfig } from '../../../src/config/AppConfig.js';
import type { IUsersRepository, UserRecord } from '../../../src/domain/auth/IUsersRepository.js';
import { createFakeUoW, makeFakeUoWFactory } from '../helpers/fakeUoW.js';

const user: UserRecord = { username: 'alice', paperlessToken: 'tok', lastLogin: new Date() };

function makeUsersRepo(users: UserRecord[] = [user]): jest.Mocked<IUsersRepository> {
  return {
    upsert: jest.fn(),
    getPaperlessToken: jest.fn(),
    findAll: jest.fn().mockResolvedValue(users),
  };
}

function makeDocument(id: number): IDocument {
  return { id, content: '', title: `Doc ${id}`, tags: [], correspondent: null, documentType: null, createdDate: null, modifiedDate: null };
}

function paginated(documents: IDocument[]): PaginatedDocuments {
  return { documents, nextCursor: null };
}

function makeJob(id: string, documentId: number): Job {
  return new Job(id, documentId, WorkflowType.AUTOMATED, JobState.PENDING, [], ['title'], undefined, new Date(), new Date(), null);
}

describe('DocumentAutoQueueApplicationService', () => {
  it('does nothing and never touches the DMS when no auto-process tags are configured', async () => {
    const fakeUoW = createFakeUoW(user);
    const service = new DocumentAutoQueueApplicationService(makeFakeUoWFactory(fakeUoW), makeUsersRepo(), new JobApplicationService(makeFakeUoWFactory(fakeUoW)), []);

    const result = await service.processNewDocuments();

    expect(result).toEqual({ processed: 0, created: 0, skipped: 0, items: [] });
    expect(fakeUoW.repos.dms.getDocumentsByTag).not.toHaveBeenCalled();
  });

  it('queues disjoint documents from different tags with each tag\'s own fields/workflowType', async () => {
    const fakeUoW = createFakeUoW(user);
    const doc1 = makeDocument(1);
    const doc2 = makeDocument(2);
    fakeUoW.repos.dms.getDocumentsByTag.mockImplementation((tag: string) =>
      Promise.resolve(paginated(tag === 'tag-a' ? [doc1] : tag === 'tag-b' ? [doc2] : [])),
    );
    fakeUoW.repos.jobs.filterInProgressDocuments.mockResolvedValue([]);
    fakeUoW.repos.jobs.createBulk.mockResolvedValue([makeJob('job-1', 1), makeJob('job-2', 2)]);
    fakeUoW.repos.dms.getDocumentsByIds.mockResolvedValue([doc1, doc2]);

    const tags: AutoProcessTagConfig[] = [
      { tag: 'tag-a', fields: ['title'], workflowType: WorkflowType.AUTOMATED },
      { tag: 'tag-b', fields: ['tags'], workflowType: WorkflowType.APPROVAL },
    ];
    const service = new DocumentAutoQueueApplicationService(
      makeFakeUoWFactory(fakeUoW),
      makeUsersRepo(),
      new JobApplicationService(makeFakeUoWFactory(fakeUoW)),
      tags,
    );

    const result = await service.processNewDocuments();

    expect(fakeUoW.repos.jobs.createBulk).toHaveBeenCalledWith([
      { documentId: 1, jobType: WorkflowType.AUTOMATED, fields: ['title'] },
      { documentId: 2, jobType: WorkflowType.APPROVAL, fields: ['tags'] },
    ]);
    expect(result.processed).toBe(2);
    expect(result.created).toBe(2);
  });

  it('merges a document matched by multiple tags into one job with the union of fields, canonically ordered', async () => {
    const fakeUoW = createFakeUoW(user);
    const doc = makeDocument(1);
    fakeUoW.repos.dms.getDocumentsByTag.mockImplementation((tag: string) =>
      Promise.resolve(paginated(tag === 'tag-a' || tag === 'tag-b' ? [doc] : [])),
    );
    fakeUoW.repos.jobs.filterInProgressDocuments.mockResolvedValue([]);
    fakeUoW.repos.jobs.createBulk.mockResolvedValue([makeJob('job-1', 1)]);
    fakeUoW.repos.dms.getDocumentsByIds.mockResolvedValue([doc]);

    // tag-b lists fields out of DOCUMENT_FIELDS canonical order (tags before title)
    // to verify the merged result is reordered canonically, not concatenated as-is.
    const tags: AutoProcessTagConfig[] = [
      { tag: 'tag-a', fields: ['title'], workflowType: WorkflowType.AUTOMATED },
      { tag: 'tag-b', fields: ['tags', 'correspondent'], workflowType: WorkflowType.AUTOMATED },
    ];
    const service = new DocumentAutoQueueApplicationService(
      makeFakeUoWFactory(fakeUoW),
      makeUsersRepo(),
      new JobApplicationService(makeFakeUoWFactory(fakeUoW)),
      tags,
    );

    await service.processNewDocuments();

    expect(fakeUoW.repos.jobs.createBulk).toHaveBeenCalledWith([
      { documentId: 1, jobType: WorkflowType.AUTOMATED, fields: ['title', 'tags', 'correspondent'] },
    ]);
  });

  it('resolves workflowType to APPROVAL when any matching tag on the same document requests it', async () => {
    const fakeUoW = createFakeUoW(user);
    const doc = makeDocument(1);
    fakeUoW.repos.dms.getDocumentsByTag.mockImplementation((tag: string) =>
      Promise.resolve(paginated(tag === 'tag-automated' || tag === 'tag-approval' ? [doc] : [])),
    );
    fakeUoW.repos.jobs.filterInProgressDocuments.mockResolvedValue([]);
    fakeUoW.repos.jobs.createBulk.mockResolvedValue([makeJob('job-1', 1)]);
    fakeUoW.repos.dms.getDocumentsByIds.mockResolvedValue([doc]);

    const tags: AutoProcessTagConfig[] = [
      { tag: 'tag-automated', fields: ['title'], workflowType: WorkflowType.AUTOMATED },
      { tag: 'tag-approval', fields: ['title'], workflowType: WorkflowType.APPROVAL },
    ];
    const service = new DocumentAutoQueueApplicationService(
      makeFakeUoWFactory(fakeUoW),
      makeUsersRepo(),
      new JobApplicationService(makeFakeUoWFactory(fakeUoW)),
      tags,
    );

    await service.processNewDocuments();

    expect(fakeUoW.repos.jobs.createBulk).toHaveBeenCalledWith([
      { documentId: 1, jobType: WorkflowType.APPROVAL, fields: ['title'] },
    ]);
  });
});
