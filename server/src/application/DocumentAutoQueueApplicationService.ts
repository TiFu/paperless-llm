import { IDocument } from '../domain/document/IDocument.js';
import { JobApplicationService } from './JobApplicationService.js';
import { IPaperlessConfig } from '../config/AppConfig.js';
import { createChildLogger } from '../utils/logger.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { IUsersRepository } from '../domain/auth/IUsersRepository.js';
import { DOCUMENT_FIELDS, DocumentField } from '../domain/steps/StepFactory.js';
import { WorkflowType } from '../domain/workflows/WorkflowType.js';

export interface AutoQueueItemResult {
  documentId: number;
  outcome: 'created' | 'skipped' | 'failed';
  errorMessage?: string;
  startedAt: Date;
  finishedAt: Date;
}

export interface AutoQueueProcessResult {
  processed: number;
  created: number;
  skipped: number;
  items: AutoQueueItemResult[];
}

// A document can carry more than one auto-process tag at once. Matches are
// merged per document: fields are the union of every matching tag's fields,
// and workflowType resolves to APPROVAL if any matching tag requests it.
interface MergedDocument {
  doc: IDocument;
  fields: Set<DocumentField>;
  workflowType: WorkflowType;
}

export class DocumentAutoQueueApplicationService {
  constructor(
    private readonly uowFactory: UoWFactory,
    private readonly usersRepo: IUsersRepository,
    private readonly jobApplicationService: JobApplicationService,
    private readonly paperlessConfig: IPaperlessConfig,
  ) {}

  async processNewDocuments(): Promise<AutoQueueProcessResult> {
    const logger = createChildLogger({ service: "DocumentAutoQueueApplicationService"});
    const autoProcessTags = this.paperlessConfig.getAutoProcessTags();

    if (autoProcessTags.length === 0) {
      logger.info('No auto-process tags configured, skipping auto-queue');
      return { processed: 0, created: 0, skipped: 0, items: [] };
    }

    const users = await this.usersRepo.findAll();
    if (users.length === 0) {
      logger.info('No users found, skipping auto-queue');
      return { processed: 0, created: 0, skipped: 0, items: [] };
    }

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    const items: AutoQueueItemResult[] = [];

    for (const user of users) {
      const userCtx: UserContext = { username: user.username };
      const startedAt = new Date();
      try {
        logger.info(
          { username: user.username, tags: autoProcessTags.map(t => t.tag) },
          'Fetching documents for auto-queue',
        );
        await using uow = await this.uowFactory.createUoW(userCtx)
        const dms = await uow.getDMS();

        const merged = new Map<number, MergedDocument>();

        for (const tagConfig of autoProcessTags) {
          let cursor: string | undefined = undefined;
          let pageCount = 0;

          do {
            const paginatedResult = await dms.getDocumentsByTag(tagConfig.tag, 100, cursor);
            for (const doc of paginatedResult.documents) {
              const existing = merged.get(doc.id);
              if (existing) {
                for (const field of tagConfig.fields) existing.fields.add(field);
                if (tagConfig.workflowType === WorkflowType.APPROVAL) {
                  existing.workflowType = WorkflowType.APPROVAL;
                }
              } else {
                merged.set(doc.id, { doc, fields: new Set(tagConfig.fields), workflowType: tagConfig.workflowType });
              }
            }
            cursor = paginatedResult.nextCursor || undefined;
            pageCount++;
            logger.info(
              {
                username: user.username,
                tag: tagConfig.tag,
                pageCount,
                fetchedThisPage: paginatedResult.documents.length,
                hasMore: !!cursor,
              },
              'Fetched page of documents for auto-queue',
            );
          } while (cursor);
        }

        if (merged.size === 0) {
          logger.info({ username: user.username }, 'No documents found for auto-queue processing');
          continue;
        }

        const documents = [...merged.values()].map(m => m.doc);
        logger.info({ username: user.username, count: documents.length }, 'Found all documents for auto-queue');

        const documentIds = documents.map(doc => doc.id);

        await using uow1 = await this.uowFactory.createSystemUoW();
        await uow1.start();
        const inProgressIds = new Set<number>(await uow1.getJobs().filterInProgressDocuments(documentIds));
        await uow1.save();
        await uow1.commit();

        const availableEntries = [...merged.values()].filter(m => !inProgressIds.has(m.doc.id));
        const skippedAt = new Date();
        items.push(
          ...documents
            .filter(doc => inProgressIds.has(doc.id))
            .map(doc => ({ documentId: doc.id, outcome: 'skipped' as const, startedAt, finishedAt: skippedAt })),
        );

        totalProcessed += documents.length;
        totalSkipped += inProgressIds.size;

        if (availableEntries.length === 0) {
          logger.info(
            { username: user.username, processed: documents.length, skipped: inProgressIds.size },
            'All documents already have active jobs, skipping',
          );
          continue;
        }

        const jobsToCreate = availableEntries.map(m => ({
          documentId: m.doc.id,
          jobType: m.workflowType,
          fields: DOCUMENT_FIELDS.filter(f => m.fields.has(f)),
        }));

        try {
          const createdJobs = await this.jobApplicationService.createBulk(jobsToCreate, userCtx);
          totalCreated += createdJobs.length;
          const finishedAt = new Date();
          items.push(...availableEntries.map(m => ({ documentId: m.doc.id, outcome: 'created' as const, startedAt, finishedAt })));
          logger.info(
            { username: user.username, count: createdJobs.length },
            'Auto-queue created jobs for user',
          );
        } catch (error) {
          logger.error({ error, username: user.username }, 'Failed to create auto-queue jobs for user');
          const finishedAt = new Date();
          items.push(...availableEntries.map(m => ({
            documentId: m.doc.id,
            outcome: 'failed' as const,
            errorMessage: error instanceof Error ? error.message : String(error),
            startedAt,
            finishedAt,
          })));
        }
      } catch (error) {
        logger.error({ error, username: user.username }, 'Failed to process auto-queue documents for user');
      }
    }

    logger.info(
      { processed: totalProcessed, created: totalCreated, skipped: totalSkipped },
      'Auto-queue processing completed',
    );

    return { processed: totalProcessed, created: totalCreated, skipped: totalSkipped, items };
  }
}
