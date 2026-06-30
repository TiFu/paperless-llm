import { withRepositoryTransaction } from '../helpers/db.js';
import { WorkflowType } from '../../../src/domain/workflows/WorkflowType.js';
import { StepFactory } from '../../../src/domain/steps/StepFactory.js';
import { StepStatus, StepType } from '../../../src/domain/steps/IStep.js';

describe('PostgreSQLStepRepository (integration)', () => {
  it('creates a leaf step and reads it back by id', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const step = new StepFactory().newUpdateDocumentStep(job.id);

      await repos.getSteps().create(step);
      const fetched = await repos.getSteps().getById(step.getStepId());

      expect(fetched.getStepId()).toBe(step.getStepId());
      expect(fetched.getStepType()).toBe(StepType.UPDATE_DOCUMENT);
      expect(fetched.getStepStatus()).toBe(StepStatus.WAITING);
      expect(fetched.getJobId()).toBe(job.id);
    });
  });

  it('creates a composite step together with its children, and reloads the hierarchy', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const composite = new StepFactory().newLLMGenerateFieldsStep(job.id, ['title', 'tags']);

      await repos.getSteps().create(composite);
      const fetched = await repos.getSteps().getById(composite.getStepId());

      expect(fetched.hasChildren()).toBe(true);
      expect(fetched.getChildren()).toHaveLength(2);
      expect(fetched.getChildren().map(c => c.getStepType()).sort()).toEqual(
        [StepType.LLM_GENERATE_TITLE, StepType.LLM_GENERATE_TAGS].sort(),
      );
      fetched.getChildren().forEach(c => expect(c.getParentStepId()).toBe(composite.getStepId()));
    });
  });

  it('update persists status and retry bookkeeping', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const step = new StepFactory().newUpdateDocumentStep(job.id);
      await repos.getSteps().create(step);

      step.markExecutionFailed({ maxRetries: 3, retryDelayInMs: 1000, retryExponent: 2 });
      await repos.getSteps().update(step);

      const fetched = await repos.getSteps().getById(step.getStepId());
      expect(fetched.getStepStatus()).toBe(StepStatus.RETRYING);
      expect(fetched.getRetryCount()).toBe(1);
      expect(fetched.getRetryAfter()).not.toBeNull();
    });
  });

  it('getPendingExecutableSteps only returns WAITING executable steps', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const waiting = new StepFactory().newUpdateDocumentStep(job.id);
      const inProgress = new StepFactory().newRemoveTagsStep(job.id);
      inProgress.moveToInProgress();
      await repos.getSteps().create(waiting);
      await repos.getSteps().create(inProgress);

      const pending = await repos.getSteps().getPendingExecutableSteps(10);

      expect(pending.map(s => s.getStepId())).toEqual([waiting.getStepId()]);
    });
  });

  it('getPendingRetries only returns steps whose retry_after has elapsed', async () => {
    await withRepositoryTransaction(async (repos) => {
      const job = await repos.getJobs().create('1', WorkflowType.AUTOMATED, []);
      const dueStep = new StepFactory().newUpdateDocumentStep(job.id);
      const futureStep = new StepFactory().newRemoveTagsStep(job.id);
      // create() only persists (id, job_id, type, status, parent_id, configuration, kind) —
      // retry_count/retry_after are written by update(), matching the real flow of
      // create (WAITING) -> execute -> markExecutionFailed -> update().
      await repos.getSteps().create(dueStep);
      await repos.getSteps().create(futureStep);

      dueStep.markExecutionFailed({ maxRetries: 3, retryDelayInMs: -10_000, retryExponent: 1 }); // retry_after in the past
      futureStep.markExecutionFailed({ maxRetries: 3, retryDelayInMs: 10_000_000, retryExponent: 1 }); // far future
      await repos.getSteps().update(dueStep);
      await repos.getSteps().update(futureStep);

      const due = await repos.getSteps().getPendingRetries(new Date(), 10);

      expect(due.map(s => s.getStepId())).toEqual([dueStep.getStepId()]);
    });
  });
});
