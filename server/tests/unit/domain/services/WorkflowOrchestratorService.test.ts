import { WorkflowOrchestratorDomainService } from '../../../../src/domain/services/WorkflowOrchestratorService.js';
import { Job } from '../../../../src/domain/job/Job.js';
import { JobState } from '../../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../../src/domain/workflows/WorkflowType.js';
import { StepFactory } from '../../../../src/domain/steps/StepFactory.js';
import { ApprovalInteractionStep } from '../../../../src/domain/steps/userinteraction/ManualStep.js';
import { ExecutableStep } from '../../../../src/domain/steps/automated/ExecutableStep.js';
import { StepStatus } from '../../../../src/domain/steps/IStep.js';
import { Transition } from '../../../../src/domain/workflows/Transition.js';
import { IJobRepository } from '../../../../src/domain/job/IJobRepository.js';
import { IStepRepository } from '../../../../src/domain/steps/IStepRepository.js';
import { IAuditCollector } from '../../../../src/domain/audit/IAuditLogRepository.js';

function makeJob(state: JobState, jobType: WorkflowType = WorkflowType.AUTOMATED): Job {
  return new Job('job-1', 42, jobType, state, [], ['title'], undefined, new Date(), new Date(), null);
}

function makeFakeJobRepo(job: Job): IJobRepository {
  return {
    create: jest.fn(),
    createBulk: jest.fn(),
    getById: jest.fn().mockResolvedValue(job),
    update: jest.fn(),
    updateState: jest.fn(),
    listForUser: jest.fn(),
    getByDocumentId: jest.fn(),
    getJobCountsByState: jest.fn(),
    filterInProgressDocuments: jest.fn(),
  } as unknown as IJobRepository;
}

function makeFakeStepRepo(stepsById: Record<string, ExecutableStep> = {}): IStepRepository {
  return {
    create: jest.fn(),
    createAll: jest.fn(),
    getPendingExecutableSteps: jest.fn(),
    getPendingManualSteps: jest.fn(),
    getById: jest.fn((id: string) => Promise.resolve(stepsById[id])),
    getByJobId: jest.fn(),
    update: jest.fn(),
    updateAll: jest.fn(),
    getAutomatedStepStatistics: jest.fn(),
    countPendingUserInteractionSteps: jest.fn(),
    listAutomatedStepsWithJob: jest.fn(),
    getStuckInProgressExecutableSteps: jest.fn(),
    getPendingRetries: jest.fn(),
    getStepsByJob: jest.fn(),
  } as unknown as IStepRepository;
}

function makeFakeAuditCollector(): IAuditCollector {
  return {
    record: jest.fn(),
    recordAll: jest.fn(),
    getEvents: jest.fn().mockReturnValue([]),
    clear: jest.fn(),
  };
}

describe('WorkflowOrchestratorDomainService', () => {
  describe('startJob', () => {
    it('advances a PENDING job to its first step and records a STEP_CREATED audit entry', () => {
      const job = makeJob(JobState.PENDING);
      const auditCollector = makeFakeAuditCollector();
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        auditCollector,
      );

      const result = service.startJob(job);

      expect(job.state).toBe(JobState.LLM_PROCESSING);
      expect(result.step).not.toBeNull();
      expect(auditCollector.recordAll).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ eventType: 'STEP_CREATED' })]),
      );
    });

    it('throws if the job is not PENDING', () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        makeFakeAuditCollector(),
      );

      expect(() => service.startJob(job)).toThrow(/Cannot start non-pending job/);
    });
  });

  describe('processStepExecutionResult', () => {
    it('advances the job to the next state when a leaf step completes successfully', async () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const step = new StepFactory().newUpdateDocumentStep(job.id); // parentless ExecutableStep
      step.moveToInProgress();
      step.moveToCompleted();

      const auditCollector = makeFakeAuditCollector();
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        auditCollector,
      );

      const { jobAdvancement } = await service.processStepExecutionResult(step, {
        success: true,
        actions: [],
        transition: Transition.SUCCESS,
        message: 'done',
      });

      expect(job.state).toBe(JobState.UPDATING_DOCUMENT);
      expect(jobAdvancement.isTerminalState).toBe(false);
    });

    it('routes the job into cleanup when the leaf step ends up FAILED', async () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const step = new StepFactory().newUpdateDocumentStep(job.id);
      step.moveToInProgress();
      step.moveToFailed();

      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        makeFakeAuditCollector(),
      );

      const { jobAdvancement } = await service.processStepExecutionResult(step, {
        success: false,
        actions: [],
        transition: Transition.NONE,
        message: 'boom',
      });

      expect(job.state).toBe(JobState.CLEANUP_AFTER_FAILURE);
      expect(jobAdvancement.isTerminalState).toBe(false);
      expect(jobAdvancement.step).not.toBeNull();
    });

    it('merges document actions from the result onto the job', async () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const step = new StepFactory().newUpdateDocumentStep(job.id);
      step.moveToInProgress();
      step.moveToCompleted();
      const action = { id: 'a' } as never;

      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        makeFakeAuditCollector(),
      );

      await service.processStepExecutionResult(step, {
        success: true,
        actions: [action],
        transition: Transition.SUCCESS,
        message: 'done',
      });

      expect(job.documentActions).toEqual([action]);
    });
  });

  describe('processUserDecision', () => {
    it('approves the step, completes it, and advances the job', async () => {
      const job = makeJob(JobState.PENDING_APPROVAL, WorkflowType.APPROVAL);
      const step = new ApprovalInteractionStep('approval-step', job.id, StepStatus.WAITING);
      const auditCollector = makeFakeAuditCollector();
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        auditCollector,
      );

      const result = await service.processUserDecision(step, 'APPROVED');

      expect(step.getStepStatus()).toBe(StepStatus.COMPLETED);
      expect(job.state).toBe(JobState.UPDATING_DOCUMENT);
      expect(result.isTerminalState).toBe(false);
      expect(auditCollector.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'DECISION_SUBMITTED' }),
      );
    });

    it('rejects the step and moves the job into cleanup before REJECTED', async () => {
      const job = makeJob(JobState.PENDING_APPROVAL, WorkflowType.APPROVAL);
      const step = new ApprovalInteractionStep('approval-step', job.id, StepStatus.WAITING);
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        makeFakeAuditCollector(),
      );

      const result = await service.processUserDecision(step, 'REJECTED');

      expect(step.getStepStatus()).toBe(StepStatus.FAILED);
      expect(job.state).toBe(JobState.CLEANUP_AFTER_REJECTION);
      expect(result.isTerminalState).toBe(false);
      expect(result.step).not.toBeNull();
    });
  });

  describe('processStepCancellation', () => {
    it('moves an eligible step to FAILED and routes the job into cleanup', async () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const step = new StepFactory().newUpdateDocumentStep(job.id);
      step.markExecutionFailed({ maxRetries: 3, retryDelayInMs: 1000, retryExponent: 2 }); // -> RETRYING

      const auditCollector = makeFakeAuditCollector();
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        auditCollector,
      );

      await service.processStepCancellation(step);

      expect(step.getStepStatus()).toBe(StepStatus.FAILED);
      expect(job.state).toBe(JobState.CLEANUP_AFTER_FAILURE);
      expect(auditCollector.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'STEP_CANCELLED' }),
      );
    });

    it('throws when the step is not eligible for cancellation', async () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const step = new StepFactory().newUpdateDocumentStep(job.id); // WAITING by default
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        makeFakeAuditCollector(),
      );

      await expect(service.processStepCancellation(step)).rejects.toThrow(/not eligible for cancellation/);
    });
  });

  describe('manuallyRetry', () => {
    it('resets the step and records a STEP_MANUALLY_RETRIED audit entry', () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const step = new StepFactory().newUpdateDocumentStep(job.id);
      step.markExecutionFailed({ maxRetries: 3, retryDelayInMs: 1000, retryExponent: 2 });
      const auditCollector = makeFakeAuditCollector();
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        auditCollector,
      );

      service.manuallyRetry(step);

      expect(step.getStepStatus()).toBe(StepStatus.WAITING);
      expect(step.getRetryCount()).toBe(0);
      expect(auditCollector.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'STEP_MANUALLY_RETRIED' }),
      );
    });
  });

  describe('resetStuckSteps', () => {
    it('marks every stuck step as failed/retrying and records one audit entry per step', () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const stepA = new StepFactory().newUpdateDocumentStep(job.id);
      const stepB = new StepFactory().newRemoveTagsStep(job.id);
      const auditCollector = makeFakeAuditCollector();
      const service = new WorkflowOrchestratorDomainService(
        makeFakeJobRepo(job),
        makeFakeStepRepo(),
        auditCollector,
      );
      const retryConfig = { maxRetries: 3, retryDelayInMs: 1000, retryExponent: 2 };

      const result = service.resetStuckSteps([stepA, stepB], retryConfig);

      expect(result).toHaveLength(2);
      expect(stepA.getStepStatus()).toBe(StepStatus.RETRYING);
      expect(stepB.getStepStatus()).toBe(StepStatus.RETRYING);
      expect(auditCollector.recordAll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ eventType: 'STUCK_STEP_RESET' }),
          expect.objectContaining({ eventType: 'STUCK_STEP_RESET' }),
        ]),
      );
    });
  });
});
