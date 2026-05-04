import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import pino from 'pino';
import { TransactionManager } from '../../infrastructure/TransactionManager';
import { validateRequest } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { WorkflowType } from '../../domain/workflows/WorkflowType';

interface JobSubmission {
  documentId: string;
  jobTypes: WorkflowType[];
  requiresApproval?: boolean;
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
        
        const result = await txManager.execute(async (repos) => {
          const jobRepo = repos.getJobs();
          const stepRepo = repos.getSteps();
          const createdJobs: { documentId: string; jobType: WorkflowType; jobId: string; firstStepId: string }[] = [];

          // Create jobs and initial steps
          for (const doc of documents) {
            logger.debug({ msg: "Processing doc ", 'doc': doc })
            for (const jobType of doc.jobTypes) {
              // Create job with initial state and data
              const job = await jobRepo.create(
                doc.documentId,
                jobType,
                {
                  requiresApproval: doc.requiresApproval ?? false,
                },
              );
              
              // Create first step (LLM_GENERATE_TITLE)
              const firstStep = await stepRepo.create(
                job.id,
                'LLM_GENERATE_TITLE' as any, // StepType enum
                {},
              );
              
              createdJobs.push({
                documentId: doc.documentId,
                jobType,
                jobId: job.id,
                firstStepId: firstStep.id,
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

        const status = await txManager.execute(async (repos) => {
          // Get the main job from jobs table (source of truth)
          const job = await repos.getJobs().getById(jobId);
          
          if (!job) {
            throw new ApiError(404, 'Job not found');
          }

          // Optionally get detailed info from queue tables for context
          const llmWorkItem = await repos.getLLMWorkQueue().getByJobId(jobId);
          
          let approvalStatus = null;
          if (job.requiresApproval() && job.state === 'pending_approval') {
            const approval = await repos.getApprovalQueue().getByJobId(jobId);
            
            if (approval) {
              approvalStatus = {
                id: approval.id,
                status: approval.status,
                createdAt: approval.createdAt,
                reviewedAt: approval.reviewedAt,
                reviewedBy: approval.reviewedBy,
                rejectionReason: approval.rejectionReason,
              };
            }
          }

          // Get document update queue entries for this job
          const updateItems = await repos.getDocumentUpdateQueue().getByJobId(jobId);
          
          return {
            job: {
              id: job.id,
              documentId: job.documentId,
              jobType: job.jobType,
              status: job.state, // Overall status from jobs table
              requiresApproval: job.requiresApproval,
              errorMessage: job.errorMessage,
              createdAt: job.createdAt,
              updatedAt: job.updatedAt,
            },
            llmProcessing: llmWorkItem ? {
              id: llmWorkItem.id,
              status: llmWorkItem.status,
              retryCount: llmWorkItem.retryCount,
              claimedBy: llmWorkItem.claimedBy,
              claimedAt: llmWorkItem.claimedAt,
            } : null,
            approval: approvalStatus,
            documentUpdate: updateItems.length > 0 ? {
              id: updateItems[0].id,
              status: updateItems[0].status,
              actionType: updateItems[0].actionType,
              retryCount: updateItems[0].retryCount,
              createdAt: updateItems[0].createdAt,
              updatedAt: updateItems[0].updatedAt,
            } : null,
          };
        });

        res.json(status);
      } catch (error) {
        logger.error({ error, id: req.params.id }, 'Failed to get job status');
        next(error);
      }
    },
  );

  return router;
}
