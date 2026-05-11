import { TransactionManager } from '../infrastructure/TransactionManager.js';
import { IDocumentManagementSystem } from '../domain/document/IDocumentManagementSystem.js';
import { IDocument } from '../domain/document/IDocument.js';
import { Job } from '../domain/job/Job.js';
import { JobApplicationService } from './JobApplicationService.js';
import { AutoQueueConfig } from '../config/AppConfig.js';
import { getLogger } from '../utils/logger.js';

/**
 * Result of processing auto-queue documents
 */
export interface AutoQueueProcessResult {
  processed: number;  // Total documents fetched
  created: number;    // Jobs created
  skipped: number;    // Documents skipped (already have active jobs)
}

/**
 * DocumentAutoQueueApplicationService - Automatically discovers and queues documents
 * for processing based on configured tags.
 * 
 * This service polls Paperless for documents with a specific tag and automatically
 * creates jobs for them, skipping documents that already have active jobs.
 */
export class DocumentAutoQueueApplicationService {
  constructor(
    private readonly txManager: TransactionManager,
    private readonly paperlessService: IDocumentManagementSystem,
    private readonly jobApplicationService: JobApplicationService,
    private readonly config: AutoQueueConfig,
  ) {}

  /**
   * Process new documents from the auto-queue tag.
   * Fetches documents with the configured tag, checks for existing active jobs,
   * and creates new jobs for documents that don't have any.
   * 
   * @returns Statistics about the processing operation
   */
  async processNewDocuments(): Promise<AutoQueueProcessResult> {
    const logger = getLogger();
    
    try {
      // 1. Fetch ALL documents with the configured tag from Paperless
      // We must paginate through all results to ensure we discover all documents,
      // not just the first page
      logger.debug({ tag: this.config.tag }, 'Fetching documents for auto-queue');
      
      const documents: IDocument[] = [];
      let cursor: string | undefined = undefined;
      let pageCount = 0;
      
      // Fetch all pages of documents
      do {
        const paginatedResult = await this.paperlessService.getDocumentsByTag(
          this.config.tag,
          100,  // Page size for fetching
          cursor
        );
        
        documents.push(...paginatedResult.documents);
        cursor = paginatedResult.nextCursor || undefined;
        pageCount++;
        
        logger.debug(
          { 
            pageCount, 
            fetchedThisPage: paginatedResult.documents.length,
            totalSoFar: documents.length,
            hasMore: !!cursor 
          }, 
          'Fetched page of documents for auto-queue'
        );
      } while (cursor);
      
      if (documents.length === 0) {
        logger.debug('No documents found for auto-queue processing');
        return { processed: 0, created: 0, skipped: 0 };
      }

      logger.debug({ count: documents.length, pages: pageCount }, 'Found all documents for auto-queue');

      // 2. Extract document IDs for batch duplicate checking
      const documentIds = documents.map(doc => doc.id);

      // 3. Batch check: find which documents already have active jobs
      let inProgressIds: string[] = [];
      await using context = await this.txManager.createContext();
      await context.start();
      const repos = context.getRepositoryRegistry();
      inProgressIds = await repos.getJobs().filterInProgressDocuments(documentIds);
      await context.commit();

      logger.debug({ inProgressCount: inProgressIds.length }, 'Documents with active jobs');

      // 4. Filter out documents that have active jobs
      const availableDocuments = documents.filter(doc => !inProgressIds.includes(doc.id));

      if (availableDocuments.length === 0) {
        logger.info(
          { processed: documents.length, skipped: inProgressIds.length },
          'All documents already have active jobs, skipping'
        );
        return { processed: documents.length, created: 0, skipped: inProgressIds.length };
      }

      // 5. Create jobs for available documents in bulk
      const jobsToCreate = availableDocuments.map(doc => ({
        documentId: doc.id,
        jobType: this.config.workflowType,
      }));

      let createdJobs: Job[] = [];
      try {
        createdJobs = await this.jobApplicationService.createBulk(jobsToCreate);
        logger.info(
          { count: createdJobs.length, workflowType: this.config.workflowType },
          'Auto-queue created jobs in bulk'
        );
      } catch (error) {
        logger.error(
          { error, count: jobsToCreate.length },
          'Failed to create jobs in bulk for auto-queue'
        );
        throw error;
      }

      const created = createdJobs.length;
      const skipped = inProgressIds.length;
      logger.info(
        { processed: documents.length, created, skipped },
        'Auto-queue processing completed'
      );

      return { processed: documents.length, created, skipped };
    } catch (error) {
      logger.error({ error }, 'Failed to process auto-queue documents');
      throw error;
    }
  }
}
