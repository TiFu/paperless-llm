import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { IDocument } from '../domain/document/IDocument.js';
import { Job } from '../domain/job/Job.js';
import { JobApplicationService } from './JobApplicationService.js';
import { AutoQueueConfig } from '../config/AppConfig.js';
import { getLogger } from '../utils/logger.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';

export interface AutoQueueProcessResult {
  processed: number;
  created: number;
  skipped: number;
}

export class DocumentAutoQueueApplicationService {
  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly usersRepo: IUsersRepository,
    private readonly paperlessService: IDocumentManagementSystem,
    private readonly jobApplicationService: JobApplicationService,
    private readonly config: AutoQueueConfig,
  ) {}

  async processNewDocuments(): Promise<AutoQueueProcessResult> {
    const logger = getLogger();

    const users = await this.usersRepo.findAll();
    if (users.length === 0) {
      logger.debug('No users found, skipping auto-queue');
      return { processed: 0, created: 0, skipped: 0 };
    }

    try {
      logger.debug({ tag: this.config.tag }, 'Fetching documents for auto-queue');

      const documents: IDocument[] = [];
      let cursor: string | undefined = undefined;
      let pageCount = 0;

      do {
        const paginatedResult = await this.paperlessService.getDocumentsByTag(
          this.config.tag,
          100,
          cursor,
        );
        documents.push(...paginatedResult.documents);
        cursor = paginatedResult.nextCursor || undefined;
        pageCount++;
        logger.debug(
          { pageCount, fetchedThisPage: paginatedResult.documents.length, totalSoFar: documents.length, hasMore: !!cursor },
          'Fetched page of documents for auto-queue',
        );
      } while (cursor);

      if (documents.length === 0) {
        logger.debug('No documents found for auto-queue processing');
        return { processed: 0, created: 0, skipped: 0 };
      }

      logger.debug({ count: documents.length, pages: pageCount }, 'Found all documents for auto-queue');

      const documentIds = documents.map(doc => doc.id);

      let inProgressIds: number[] = [];
      await using uow1 = await this.uowFactory.createSystemUoW();
      await uow1.start();
      inProgressIds = await uow1.getJobs().filterInProgressDocuments(documentIds);
      await uow1.save();
      await uow1.commit();

      logger.debug({ inProgressCount: inProgressIds.length }, 'Documents with active jobs');

      const availableDocuments = documents.filter(doc => !inProgressIds.includes(doc.id));

      if (availableDocuments.length === 0) {
        logger.info(
          { processed: documents.length, skipped: inProgressIds.length },
          'All documents already have active jobs, skipping',
        );
        return { processed: documents.length, created: 0, skipped: inProgressIds.length };
      }

      const jobsToCreate = availableDocuments.map(doc => ({
        documentId: doc.id,
        jobType: this.config.workflowType,
        fields: this.config.fields,
      }));

      // Create jobs attributed to all known users (each user gets ownership)
      let totalCreated = 0;
      for (const user of users) {
        const userCtx: UserContext = { username: user.username };
        try {
          const createdJobs = await this.jobApplicationService.createBulk(jobsToCreate, userCtx);
          totalCreated += createdJobs.length;
          logger.info(
            { username: user.username, count: createdJobs.length, workflowType: this.config.workflowType },
            'Auto-queue created jobs for user',
          );
        } catch (error) {
          logger.error({ error, username: user.username }, 'Failed to create auto-queue jobs for user');
        }
        break; // Only create for first user to avoid duplicates — extend later for per-user queues
      }

      const skipped = inProgressIds.length;
      logger.info({ processed: documents.length, created: totalCreated, skipped }, 'Auto-queue processing completed');

      return { processed: documents.length, created: totalCreated, skipped };
    } catch (error) {
      logger.error({ error }, 'Failed to process auto-queue documents');
      throw error;
    }
  }
}
