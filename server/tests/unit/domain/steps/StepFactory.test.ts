import { StepFactory } from '../../../../src/domain/steps/StepFactory.js';
import { StepStatus, StepType } from '../../../../src/domain/steps/IStep.js';
import { CompositeStep } from '../../../../src/domain/steps/automated/CompositeStep.js';
import { ManualStep } from '../../../../src/domain/steps/userinteraction/ManualStep.js';
import { ExecutableStep } from '../../../../src/domain/steps/automated/ExecutableStep.js';

describe('StepFactory', () => {
  describe('create', () => {
    it('builds a composite LLM_GENERATE_FIELDS step from the provided children', () => {
      const factory = new StepFactory();
      const child = factory.create(null, 'job-1', StepType.LLM_GENERATE_TITLE, StepStatus.WAITING, []);

      const step = factory.create('parent-1', 'job-1', StepType.LLM_GENERATE_FIELDS, StepStatus.WAITING, [child]);

      expect(step).toBeInstanceOf(CompositeStep);
      expect(step.getStepId()).toBe('parent-1');
      expect(step.getChildren()).toEqual([child]);
    });

    it('builds REQUIRE_APPROVAL as a ManualStep', () => {
      const step = new StepFactory().create('s1', 'job-1', StepType.REQUIRE_APPROVAL, StepStatus.WAITING, []);
      expect(step).toBeInstanceOf(ManualStep);
      expect(step.getStepType()).toBe(StepType.REQUIRE_APPROVAL);
    });

    it.each([
      StepType.LLM_GENERATE_TITLE,
      StepType.LLM_GENERATE_TAGS,
      StepType.LLM_GENERATE_CORRESPONDENT,
      StepType.LLM_GENERATE_DOCUMENT_TYPE,
      StepType.LLM_GENERATE_CREATED_DATE,
      StepType.UPDATE_DOCUMENT,
      StepType.REMOVE_TAGS,
    ])('builds %s as an ExecutableStep with the given id', (type) => {
      const step = new StepFactory().create('s1', 'job-1', type, StepStatus.WAITING, []);
      expect(step).toBeInstanceOf(ExecutableStep);
      expect(step.getStepId()).toBe('s1');
      expect(step.getStepType()).toBe(type);
    });

    it('generates a step id when none is provided', () => {
      const step = new StepFactory().create(null, 'job-1', StepType.UPDATE_DOCUMENT, StepStatus.WAITING, []);
      expect(step.getStepId()).toBeTruthy();
    });

    it('throws for an unknown step type', () => {
      expect(() =>
        new StepFactory().create('s1', 'job-1', 'NOT_A_TYPE' as StepType, StepStatus.WAITING, []),
      ).toThrow(/Unknown step type/);
    });
  });

  describe('newLLMGenerateFieldsStep', () => {
    it('creates one child step per requested field, parented to the composite step', () => {
      const factory = new StepFactory();
      const composite = factory.newLLMGenerateFieldsStep('job-1', ['title', 'tags']);

      expect(composite).toBeInstanceOf(CompositeStep);
      const children = composite.getChildren();
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.getStepType())).toEqual([
        StepType.LLM_GENERATE_TITLE,
        StepType.LLM_GENERATE_TAGS,
      ]);
      children.forEach((c) => expect(c.getParentStepId()).toBe(composite.getStepId()));
    });
  });

  describe('shorthand factory methods', () => {
    it('newRequireApprovalStep returns a ManualStep in WAITING status', () => {
      const step = new StepFactory().newRequireApprovalStep('job-1');
      expect(step).toBeInstanceOf(ManualStep);
      expect(step.getStepStatus()).toBe(StepStatus.WAITING);
      expect(step.getJobId()).toBe('job-1');
    });

    it('newUpdateDocumentStep and newRemoveTagsStep return parentless ExecutableSteps', () => {
      const updateStep = new StepFactory().newUpdateDocumentStep('job-1');
      const removeTagsStep = new StepFactory().newRemoveTagsStep('job-1');

      expect(updateStep.getStepType()).toBe(StepType.UPDATE_DOCUMENT);
      expect(removeTagsStep.getStepType()).toBe(StepType.REMOVE_TAGS);
      expect(updateStep.getParentStepId()).toBeNull();
      expect(removeTagsStep.getParentStepId()).toBeNull();
    });
  });

  describe('fromDb', () => {
    it('reconstructs a step instance from a database row', () => {
      const row = {
        id: 'step-1',
        job_id: 'job-1',
        type: StepType.UPDATE_DOCUMENT,
        status: StepStatus.COMPLETED,
        retry_count: 2,
        retry_after: null,
        started_at: '2024-01-01T00:00:00.000Z',
        parent_id: null,
        configuration: null,
      };

      const step = StepFactory.fromDb(row, []);

      expect(step.getStepId()).toBe('step-1');
      expect(step.getJobId()).toBe('job-1');
      expect(step.getStepType()).toBe(StepType.UPDATE_DOCUMENT);
      expect(step.getStepStatus()).toBe(StepStatus.COMPLETED);
      expect(step.getRetryCount()).toBe(2);
      expect(step.getStartedAt()).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });
  });
});
