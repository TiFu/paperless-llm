import { Job } from '../../../../src/domain/job/Job.js';
import { JobState } from '../../../../src/domain/job/JobState.js';
import { WorkflowType } from '../../../../src/domain/workflows/WorkflowType.js';
import { Transition } from '../../../../src/domain/workflows/Transition.js';
import { StepType } from '../../../../src/domain/steps/IStep.js';

function makeJob(state: JobState, jobType: WorkflowType = WorkflowType.AUTOMATED): Job {
  return new Job(
    'job-1',
    42,
    jobType,
    state,
    [],
    ['title'],
    undefined,
    new Date(),
    new Date(),
    null,
  );
}

describe('Job', () => {
  describe('advance (AUTOMATED workflow)', () => {
    it('moves PENDING -> LLM_PROCESSING on SUCCESS and returns the next step', () => {
      const job = makeJob(JobState.PENDING);
      const result = job.advance(Transition.SUCCESS);

      expect(job.state).toBe(JobState.LLM_PROCESSING);
      expect(result.nextState).toBe(JobState.LLM_PROCESSING);
      expect(result.isTerminalState).toBe(false);
      expect(result.step).not.toBeNull();
      expect(result.step?.getStepType()).toBe(StepType.LLM_GENERATE_FIELDS);
    });

    it('moves to CLEANUP_AFTER_FAILURE on FAILURE, then to FAILED once tag cleanup succeeds', () => {
      const job = makeJob(JobState.LLM_PROCESSING);
      const result = job.advance(Transition.FAILURE);

      expect(job.state).toBe(JobState.CLEANUP_AFTER_FAILURE);
      expect(result.isTerminalState).toBe(false);
      expect(result.step).not.toBeNull();

      const cleanupResult = job.advance(Transition.SUCCESS);

      expect(job.state).toBe(JobState.FAILED);
      expect(cleanupResult.isTerminalState).toBe(true);
      expect(cleanupResult.step).toBeNull();
    });

    it('reaches COMPLETED as a terminal state with no further step', () => {
      const job = makeJob(JobState.REMOVING_TAGS);
      const result = job.advance(Transition.SUCCESS);

      expect(job.state).toBe(JobState.COMPLETED);
      expect(result.isTerminalState).toBe(true);
      expect(result.step).toBeNull();
      expect(job.isCompleted()).toBe(true);
      expect(job.isTerminal()).toBe(true);
    });
  });

  describe('advance (APPROVAL workflow)', () => {
    it('moves LLM_PROCESSING -> PENDING_APPROVAL and requires an approval step', () => {
      const job = makeJob(JobState.LLM_PROCESSING, WorkflowType.APPROVAL);
      const result = job.advance(Transition.SUCCESS);

      expect(job.state).toBe(JobState.PENDING_APPROVAL);
      expect(result.step?.getStepType()).toBe(StepType.REQUIRE_APPROVAL);
    });

    it('moves PENDING_APPROVAL -> CLEANUP_AFTER_REJECTION on FAILURE (approval rejected), then to REJECTED once tag cleanup succeeds', () => {
      const job = makeJob(JobState.PENDING_APPROVAL, WorkflowType.APPROVAL);
      const result = job.advance(Transition.FAILURE);

      expect(job.state).toBe(JobState.CLEANUP_AFTER_REJECTION);
      expect(result.isTerminalState).toBe(false);
      expect(result.step).not.toBeNull();

      const cleanupResult = job.advance(Transition.SUCCESS);

      expect(job.state).toBe(JobState.REJECTED);
      expect(cleanupResult.isTerminalState).toBe(true);
      expect(job.isRejected()).toBe(true);
      expect(job.isTerminal()).toBe(true);
    });

    it('moves PENDING_APPROVAL -> UPDATING_DOCUMENT on SUCCESS (approval granted)', () => {
      const job = makeJob(JobState.PENDING_APPROVAL, WorkflowType.APPROVAL);
      const result = job.advance(Transition.SUCCESS);

      expect(job.state).toBe(JobState.UPDATING_DOCUMENT);
      expect(result.step?.getStepType()).toBe(StepType.UPDATE_DOCUMENT);
    });
  });

  it('short-circuits on Transition.NONE without changing state', () => {
    const job = makeJob(JobState.LLM_PROCESSING);
    const result = job.advance(Transition.NONE);

    expect(job.state).toBe(JobState.LLM_PROCESSING);
    expect(result.step).toBeNull();
    expect(result.nextState).toBe(JobState.LLM_PROCESSING);
    expect(result.isTerminalState).toBe(false);
  });

  it('accumulates document actions via addDocumentActions', () => {
    const job = makeJob(JobState.LLM_PROCESSING);
    const actionA = { id: 'a' } as never;
    const actionB = { id: 'b' } as never;

    job.addDocumentActions([actionA]);
    job.addDocumentActions([actionB]);

    expect(job.documentActions).toEqual([actionA, actionB]);
  });

  describe('terminal state predicates', () => {
    it.each([
      [JobState.COMPLETED, 'isCompleted'],
      [JobState.FAILED, 'isFailed'],
      [JobState.REJECTED, 'isRejected'],
    ] as const)('%s -> %s() is true and isTerminal() is true', (state, predicate) => {
      const job = makeJob(state);
      expect(job[predicate]()).toBe(true);
      expect(job.isTerminal()).toBe(true);
    });

    it('PENDING is not terminal', () => {
      const job = makeJob(JobState.PENDING);
      expect(job.isPending()).toBe(true);
      expect(job.isTerminal()).toBe(false);
    });
  });
});
