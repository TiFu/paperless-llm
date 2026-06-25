import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { IDocument } from '../domain/document/IDocument.js';
import { Job } from '../domain/job/Job.js';
import { JobApplicationService } from './JobApplicationService.js';
import { AutoQueueConfig } from '../config/AppConfig.js';
import { createChildLogger, getLogger } from '../utils/logger.js';
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
    private readonly jobApplicationService: JobApplicationService,
    private readonly config: AutoQueueConfig,
  ) {}

  async processNewDocuments(): Promise<AutoQueueProcessResult> {
    const logger = createChildLogger({ service: "DocumentAutoQueueApplicationService"});

    const users = await this.usersRepo.findAll();
    if (users.length === 0) {
      logger.info('No users found, skipping auto-queue');
      return { processed: 0, created: 0, skipped: 0 };
    }

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const user of users) {
      const userCtx: UserContext = { username: user.username };
      try {
        logger.info({ username: user.username, tag: this.config.tag }, 'Fetching documents for auto-queue');
        const uow = await this.uowFactory.createUoW(userCtx)
        const dms = await uow.getDMS();


        const documents: IDocument[] = [];
        let cursor: string | undefined = undefined;
        let pageCount = 0;

        do {
          const paginatedResult = await dms.getDocumentsByTag(this.config.tag, 100, cursor);
          documents.push(...paginatedResult.documents);
          cursor = paginatedResult.nextCursor || undefined;
          pageCount++;
          logger.info(
            { username: user.username, pageCount, fetchedThisPage: paginatedResult.documents.length, totalSoFar: documents.length, hasMore: !!cursor },
            'Fetched page of documents for auto-queue',
          );
        } while (cursor);

        if (documents.length === 0) {
          logger.info({ username: user.username }, 'No documents found for auto-queue processing');
          continue;
        }

        logger.info({ username: user.username, count: documents.length, pages: pageCount }, 'Found all documents for auto-queue');

        const documentIds = documents.map(doc => doc.id);

        await using uow1 = await this.uowFactory.createSystemUoW();
        await uow1.start();
        const inProgressIds = new Set<number>(await uow1.getJobs().filterInProgressDocuments(documentIds));
        await uow1.save();
        await uow1.commit();

        const availableDocuments = documents.filter(doc => !inProgressIds.has(doc.id));

        totalProcessed += documents.length;
        totalSkipped += inProgressIds.size;

        if (availableDocuments.length === 0) {
          logger.info(
            { username: user.username, processed: documents.length, skipped: inProgressIds.size },
            'All documents already have active jobs, skipping',
          );
          continue;
        }

        const jobsToCreate = availableDocuments.map(doc => ({
          documentId: doc.id,
          jobType: this.config.workflowType,
          fields: this.config.fields,
        }));

        const createdJobs = await this.jobApplicationService.createBulk(jobsToCreate, userCtx);
        totalCreated += createdJobs.length;
        logger.info(
          { username: user.username, count: createdJobs.length, workflowType: this.config.workflowType },
          'Auto-queue created jobs for user',
        );
      } catch (error) {
        logger.error({ error, username: user.username }, 'Failed to process auto-queue documents for user');
      }
    }

    logger.info(
      { processed: totalProcessed, created: totalCreated, skipped: totalSkipped },
      'Auto-queue processing completed',
    );

    return { processed: totalProcessed, created: totalCreated, skipped: totalSkipped };
  }
}
