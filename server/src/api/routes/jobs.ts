import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import pino from 'pino';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { ApiError } from '../middleware/errorHandler.js';
import { WorkflowType } from '../../domain/workflows/WorkflowType.js';
import { JobState } from '../../domain/job/JobState.js';
import { createChildLogger } from '../../utils/logger.js';
import { DOCUMENT_FIELDS, DocumentField } from '../../domain/steps/StepFactory.js';
import { DocumentAction } from '../../domain/actions/DocumentAction.js';
import { IStep } from '../../domain/steps/IStep.js';

interface JobSubmission {
  documentId: number;
  jobType: WorkflowType;
  fields: DocumentField[]
}

interface BatchJobRequest {
  documents: JobSubmission[];
}



export function createJobsRouter(appFactory: ApplicationServiceFactory): Router {
  const logger = createChildLogger({ name: "jobs-router"})
  const router = Router();

  router.get('/fields', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(DOCUMENT_FIELDS);
    } catch (error) {
      logger.error({ error }, 'Failed to get job stats');
      next(error);
    }
  });


  /**
   * GET /api/jobs/stats
   * Get statistics for jobs grouped by state
   */
  router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const jobAppService = appFactory.createJobApplicationService();
      const stats = await jobAppService.getJobStats();

      res.json(stats);
    } catch (error) {
      logger.error({ error }, 'Failed to get job stats');
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
        .isNumeric()
        .notEmpty()
        .withMessage('documentId must be a non-empty string'),
      body('documents.*.jobType')
        .isIn(Object.values(WorkflowType))
        .withMessage(`jobType must be one of: ${Object.values(WorkflowType).join(', ')}`),
      body('documents.*.fields')
        .isArray({ min: 1 })
        .withMessage("Fields selection is required"),
      body('documents.*.fields.*')
        .isString()
        .isIn(DOCUMENT_FIELDS)
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { documents } = req.body as BatchJobRequest;
        
        // Create application services for this request
        const jobAppService = appFactory.createJobApplicationService();
        const createdJobs = await jobAppService.createBulk(documents)

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
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = (req.query.limit as number | undefined) || 20;
        const cursor = req.query.cursor as string | undefined;
        const state = req.query.state as JobState | undefined;

        const jobAppService = appFactory.createJobApplicationService();
        const result = await jobAppService.list(limit, cursor, state);
        logger.info({ jobs: result.items}, "Job Items")
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
            documentActions: job.documentActions
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

        const mapFunc: (step: IStep) => any = (step: IStep) => {
          return {
            stepId: step.getStepId(),
            stepType: step.getStepType(),
            stepStatus: step.getStepStatus(),
            children: step.hasChildren() ? step.getChildren().map(mapFunc) : null,
            startedAt: step.getStartedAt(),
            retryCount: step.getRetryCount(),
            retryAfter: step.getRetryAfter()
          }
        };


        const output = steps.map(mapFunc)
        logger.info({output}, "Output of steps")
        res.json({
          steps: steps.map(mapFunc),
        });
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to get job steps');
        next(error);
      }
    },
  );

  /**
   * GET /api/jobs/:id/audit-log
   * Get audit log for a job
   */
  router.get(
    '/:id/audit-log',
    [param('id').isString().notEmpty().withMessage('id must be a non-empty string')],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const jobId = req.params.id;

        const jobAppService = appFactory.createJobApplicationService();

        // Verify job exists
        const job = await jobAppService.getById(jobId);
        if (!job) {
          throw new ApiError(404, 'Job not found');
        }

        // Get audit log for the job
        const auditLogService = appFactory.createAuditLogApplicationService();
        const auditLog = await auditLogService.getAuditLogForJobById(jobId);

        res.json({
          auditLog: auditLog.map((entry) => ({
            id: entry.id,
            jobId: entry.jobId,
            stepId: entry.stepId,
            eventType: entry.eventType,
            eventTimestamp: entry.eventTimestamp,
            processingStartTime: entry.processingStartTime,
            processingEndTime: entry.processingEndTime,
            processingDurationMs: entry.getProcessingDurationMs(),
            metadata: entry.metadata,
          })),
        });
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to get job audit log');
        next(error);
      }
    },
  );

  return router;
}
