import { TransactionManager } from '../infrastructure/TransactionManager';
import { IDocumentManagementSystem } from '../domain/interfaces/IDocumentManagementSystem';
import { OllamaService } from './OllamaService';
import { WorkItem } from '../domain/entities/WorkItem';
import { JobFactory } from '../domain/jobs/JobFactory';
import { createChildLogger } from '../utils/logger';
import pino from 'pino';

export class JobService {
  private readonly logger: pino.Logger;

  constructor(
    private readonly txManager: TransactionManager,
    private readonly dmsService: IDocumentManagementSystem,
    private readonly ollamaService: OllamaService,
    private readonly maxRetries: number,
  ) {
    this.logger = createChildLogger({ service: 'JobService' });
  }

  /**
   * Process a work item from the LLM work queue.
   * External API calls (Paperless, Ollama) happen OUTSIDE the transaction.
   * DB writes (create action, mark completed) happen INSIDE the transaction.
   *
   * @param workItem The work item to process
   */
  async processJob(workItem: WorkItem): Promise<void> {
    const jobLogger = this.logger.child({
      correlationId: workItem.id,
      documentId: workItem.documentId,
      jobType: workItem.jobType,
    });

    jobLogger.info('Processing job');

    try {
      // Step 1: Fetch document from external DMS (OUTSIDE transaction)
      jobLogger.debug('Fetching document from DMS');
      const document = await this.dmsService.getDocument(workItem.documentId);

      // Step 2: Get prompt template
      jobLogger.debug('Fetching prompt template');
      const prompt = await this.txManager.execute(async (repos) => {
        return repos.getPrompts().getByJobType(workItem.jobType);
      });

      if (!prompt) {
        throw new Error(`No prompt found for job type: ${workItem.jobType}`);
      }

      // Step 3: Get job implementation and execute (OUTSIDE transaction)
      jobLogger.debug('Executing job');
      const job = JobFactory.create(workItem.jobType);
      const action = await job.execute(document, this.ollamaService, prompt);

      // Step 4: DB writes happen INSIDE transaction
      jobLogger.debug('Committing results to database');
      await this.txManager.execute(async (repos) => {
        // Insert action item into document update queue
        await repos.getDocumentUpdateQueue().insert(
          action.documentId,
          action.documentSystem,
          action.actionType,
          action.serializePayload(),
        );

        // Mark work item as completed
        await repos.getLLMWorkQueue().markCompleted(workItem.id);
      });

      jobLogger.info('Job processed successfully');
    } catch (error) {
      jobLogger.error({ error }, 'Job processing failed');
      
      // Mark the job as failed with retry calculation
      await this.handleFailure(workItem.id, workItem.retryCount);
      
      throw error;
    }
  }

  /**
   * Handle job failure and calculate retry
   */
  async handleFailure(workItemId: string, currentRetryCount: number): Promise<void> {
    const retryAfter = this.calculateRetryAfter(currentRetryCount);

    if (retryAfter) {
      this.logger.warn(
        {
          workItemId,
          retryCount: currentRetryCount + 1,
          retryAfter,
        },
        'Scheduling retry',
      );
    } else {
      this.logger.error(
        {
          workItemId,
          retryCount: currentRetryCount + 1,
        },
        'Max retries exceeded',
      );
    }

    await this.txManager.execute(async (repos) => {
      await repos.getLLMWorkQueue().markFailed(workItemId, retryAfter);
    });
  }

  /**
   * Calculate the next retry time using exponential backoff
   */
  private calculateRetryAfter(retryCount: number): Date | null {
    if (retryCount >= this.maxRetries) {
      return null; // Max retries exceeded, no more retries
    }

    // Exponential backoff: 2^retryCount minutes, max 60 minutes
    const delayMinutes = Math.min(Math.pow(2, retryCount), 60);
    const delayMs = delayMinutes * 60 * 1000;

    return new Date(Date.now() + delayMs);
  }
}
