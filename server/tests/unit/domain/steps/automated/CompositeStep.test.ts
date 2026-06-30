import { CompositeStep } from '../../../../../src/domain/steps/automated/CompositeStep.js';
import { StepStatus, StepType } from '../../../../../src/domain/steps/IStep.js';

function makeChild(status: StepStatus): CompositeStep {
  // Reusing CompositeStep (with no grandchildren) as a stand-in "leaf" step —
  // only getStepStatus()/setStepState() are exercised here.
  return new CompositeStep('child', StepType.LLM_GENERATE_TITLE, 'job-1', status, 0, []);
}

function makeParent(children: CompositeStep[]): CompositeStep {
  return new CompositeStep('parent', StepType.LLM_GENERATE_FIELDS, 'job-1', StepStatus.WAITING, 0, children);
}

describe('CompositeStep.recalculateStateFromChildren', () => {
  it('stays WAITING when all children are still WAITING', () => {
    const parent = makeParent([makeChild(StepStatus.WAITING), makeChild(StepStatus.WAITING)]);
    parent.recalculateStateFromChildren();
    expect(parent.getStepStatus()).toBe(StepStatus.WAITING);
  });

  it('becomes IN_PROGRESS once any child has started', () => {
    const parent = makeParent([makeChild(StepStatus.WAITING), makeChild(StepStatus.IN_PROGRESS)]);
    parent.recalculateStateFromChildren();
    expect(parent.getStepStatus()).toBe(StepStatus.IN_PROGRESS);
  });

  it('becomes COMPLETED only when every child is COMPLETED', () => {
    const parent = makeParent([makeChild(StepStatus.COMPLETED), makeChild(StepStatus.COMPLETED)]);
    parent.recalculateStateFromChildren();
    expect(parent.getStepStatus()).toBe(StepStatus.COMPLETED);
  });

  it('becomes FAILED if any child failed while the rest completed', () => {
    const parent = makeParent([makeChild(StepStatus.COMPLETED), makeChild(StepStatus.FAILED)]);
    parent.recalculateStateFromChildren();
    expect(parent.getStepStatus()).toBe(StepStatus.FAILED);
  });

  it('stays IN_PROGRESS while one child is still retrying and another already completed', () => {
    const parent = makeParent([makeChild(StepStatus.COMPLETED), makeChild(StepStatus.RETRYING)]);
    parent.recalculateStateFromChildren();
    expect(parent.getStepStatus()).toBe(StepStatus.IN_PROGRESS);
  });

  it('assigns parentId to every child on construction', () => {
    const child = makeChild(StepStatus.WAITING);
    makeParent([child]);
    expect(child.getParentStepId()).toBe('parent');
  });
});
