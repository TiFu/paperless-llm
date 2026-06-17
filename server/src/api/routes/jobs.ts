
import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { ApplicationServiceFactory } from '../../application/ApplicationServiceFactory.js';
import { ApiError } from '../middleware/errorHandler.js';
import { WorkflowType } from '../../domain/workflows/WorkflowType.js';
import { JobState } from '../../domain/job/JobState.js';
import { DOCUMENT_FIELDS, DocumentField } from '../../domain/steps/StepFactory.js';
import { JobController } from '../../web/JobController.js';



export function createJobsRouter(appFactory: ApplicationServiceFactory): Router {
  const router = Router();
  const controller = new JobController(appFactory);

  router.get('/fields', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const fields = await controller.getAvailableFields();
      res.json(fields);
    } catch (error) {
      next(error);
    }
  });

  router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await controller.getJobStats(req.user!);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  router.get('/types', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const types = await controller.getJobTypes();
      res.json(types);
    } catch (error) {
      next(error);
    }
  });

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
        const { documents } = req.body;
        const result = await controller.submitJob(documents, req.user!);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

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
        const result = await controller.listJobs(limit, req.user!, cursor, state);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/:id',
    [param('id').isString().notEmpty().withMessage('id must be a non-empty string')],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const job = await controller.getJob(req.params.id, req.user!);
        if (!job) {
          throw new ApiError(404, 'Job not found');
        }
        res.json(job);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/:id/steps',
    [param('id').isString().notEmpty().withMessage('id must be a non-empty string')],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const steps = await controller.getJobSteps(req.params.id, req.user!);
        if (!steps) {
          throw new ApiError(404, 'Job not found');
        }
        res.json(steps);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/:id/audit-log',
    [param('id').isString().notEmpty().withMessage('id must be a non-empty string')],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const auditLog = await controller.getJobAuditLog(req.params.id, req.user!);
        if (!auditLog) {
          throw new ApiError(404, 'Job not found');
        }
        res.json(auditLog);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
