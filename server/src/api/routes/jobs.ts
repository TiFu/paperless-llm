import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import pino from 'pino';
import { TransactionManager } from '../../infrastructure/TransactionManager';
import { validateRequest } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { JobType } from '../../domain/enums/JobType';

interface JobSubmission {
  documentId: string;
  jobTypes: JobType[];
}

interface BatchJobRequest {
  documents: JobSubmission[];
}

export function createJobsRouter(txManager: TransactionManager, logger: pino.Logger): Router {
  const router = Router();

  /**
   * GET /api/jobs/types
   * List available job types
   */
  router.get('/types', (_req: Request, res: Response) => {
    res.json({
      jobTypes: Object.values(JobType),
    });
  });

  /**
   * POST /api/jobs
   * Submit batch of documents for processing
   */
  router.post(
    '/',
    [
      body('documents')
        .isArray({ min: 1 })
        .withMessage('documents must be a non-empty array'),
      body('documents.*.documentId')
        .isString()
        .notEmpty()
        .withMessage('documentId must be a non-empty string'),
      body('documents.*.jobTypes')
        .isArray({ min: 1 })
        .withMessage('jobTypes must be a non-empty array'),
      body('documents.*.jobTypes.*')
        .isIn(Object.values(JobType))
        .withMessage(`jobType must be one of: ${Object.values(JobType).join(', ')}`),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { documents } = req.body as BatchJobRequest;
        
        const result = await txManager.execute(async (repos) => {
          const llmQueue = repos.getLLMWorkQueue();
          const createdJobs: { documentId: string; jobType: JobType; workItemId: string }[] = [];

          // TODO: this can be done more efficiently in one insert operation...
          for (const doc of documents) {
            logger.debug({ msg: "Processing doc ", 'doc': doc })
            for (const jobType of doc.jobTypes) {
              const workItem = await llmQueue.insert(doc.documentId, jobType);
              createdJobs.push({
                documentId: doc.documentId,
                jobType,
                workItemId: workItem.id,
              });
            }
          }

          return createdJobs;
        });

        logger.info(
          {
            documentCount: documents.length,
            jobCount: result.length,
          },
          'Jobs submitted',
        );

        res.status(201).json({
          submitted: result.length,
          jobs: result,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to submit jobs');
        next(error);
      }
    },
  );

  return router;
}
