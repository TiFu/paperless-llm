import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import pino from 'pino';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { validateRequest } from '../middleware/validation.js';
import { ApiError } from '../middleware/errorHandler.js';
import { WorkflowType } from '../../domain/workflows/WorkflowType.js';
import { JobState } from '../../domain/job/JobState.js';

interface JobSubmission {
  documentId: string;
  jobTypes: WorkflowType[];
  requiresApproval?: boolean;
}

interface BatchJobRequest {
  documents: JobSubmission[];
}

export function createJobsRouter(appFactory: ApplicationServiceFactory, logger: pino.Logger): Router {
  const router = Router();

  /**
   * GET /api/jobs/stats
   * Get statistics for job steps (overall step statistics)
   */
  router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const jobAppService = appFactory.createJobApplicationService();
      const stats = await jobAppService.getJobStepStats();

      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to get job step stats');
      next(error);
    }
  });

  /**
   * GET /api/jobs/types
   * List available job types
   */
  router.get('/types', (_req: Request, res: Response) => {
    res.json({
      jobTypes: Object.values(WorkflowType),
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
        .isIn(Object.values(WorkflowType))
        .withMessage(`jobType must be one of: ${Object.values(WorkflowType).join(', ')}`),
      body('documents.*.requiresApproval')
        .optional()
        .isBoolean()
        .withMessage('requiresApproval must be a boolean'),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { documents } = req.body as BatchJobRequest;
        
        // Create application services for this request
        const jobAppService = appFactory.createJobApplicationService();
        
        const createdJobs: { documentId: string; jobType: WorkflowType; jobId: string }[] = [];

        // Create jobs and start workflows
        for (const doc of documents) {
          logger.debug({ msg: 'Processing doc', doc });
          for (const jobType of doc.jobTypes) {
            // Create job with initial state and data
            const job = await jobAppService.create(doc.documentId, jobType);

            createdJobs.push({
              documentId: doc.documentId,
              jobType,
              jobId: job.id,
            });
          }
        }

        logger.info(
          {
            documentCount: documents.length,
            jobCount: createdJobs.length,
          },
          'Jobs submitted',
        );

        res.status(201).json({
          submitted: createdJobs.length,
          jobs: createdJobs,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to submit jobs');
        next(error);
      }
    },
  );

  /**
   * GET /api/jobs
   * List jobs with pagination and optional state filter
   */
  router.get(
    '/',
    [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit must be between 1 and 100')
        .toInt(),
      query('cursor')
        .optional()
        .isString()
        .withMessage('cursor must be a string'),
      query('state')
        .optional()
        .isIn(Object.values(JobState))
        .withMessage(`state must be one of: ${Object.values(JobState).join(', ')}`),
    ],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = (req.query.limit as number | undefined) || 20;
        const cursor = req.query.cursor as string | undefined;
        const state = req.query.state as JobState | undefined;

        const jobAppService = appFactory.createJobApplicationService();
        const result = await jobAppService.list(limit, cursor, state);

        res.json({
          jobs: result.items.map((job) => ({
            id: job.id,
            documentId: job.documentId,
            jobType: job.jobType,
            status: job.state,
            errorMessage: job.errorMessage,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            completedAt: job.completedAt,
          })),
          nextCursor: result.nextCursor,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to list jobs');
        next(error);
      }
    },
  );

  /**
   * GET /api/jobs/:id
   * Get job status and workflow progress
   */
  router.get(
    '/:id',
    [param('id').isString().notEmpty().withMessage('id must be a non-empty string')],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const jobId = req.params.id;

        // Create application service for this request
        const jobAppService = appFactory.createJobApplicationService();

        // Get the job
        const job = await jobAppService.getById(jobId);

        if (!job) {
          throw new ApiError(404, 'Job not found');
        }

        res.json({
          job: {
            id: job.id,
            documentId: job.documentId,
            jobType: job.jobType,
            status: job.state,
            errorMessage: job.errorMessage,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            completedAt: job.completedAt,
            documentActions: job.documentActions.map((action) => ({
              id: action.id,
              actionType: action.actionType,
              oldValue: action.oldValue,
              newValue: action.newValue,
            })),
          },
        });
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to get job status');
        next(error);
      }
    },
  );

  /**
   * GET /api/jobs/:id/steps
   * Get all steps for a job
   */
  router.get(
    '/:id/steps',
    [param('id').isString().notEmpty().withMessage('id must be a non-empty string')],
    validateRequest,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const jobId = req.params.id;

        const jobAppService = appFactory.createJobApplicationService();

        // Verify job exists
        const job = await jobAppService.getById(jobId);
        if (!job) {
          throw new ApiError(404, 'Job not found');
        }

        // Get steps for the job
        const steps = await jobAppService.getStepsByJobId(jobId);

        res.json({
          steps: steps.map((step) => ({
            stepId: step.stepId,
            stepType: step.stepType,
            stepStatus: step.stepStatus,
            createdAt: step.createdAt,
            startedAt: step.startedAt,
            completedAt: step.completedAt,
          })),
        });
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to get job steps');
        next(error);
      }
    },
  );

  return router;
}
