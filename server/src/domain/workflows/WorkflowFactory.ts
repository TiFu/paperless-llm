import { IWorkflow } from './IWorkflow';
import { WorkflowType } from './WorkflowType';
import { TitleWorkflow } from './TitleWorkflow';
import { LLMGenerateTitleStepDependencies, UpdateDocumentStepDependencies } from '../steps/StepFactory';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { AutomatedWorkflow } from './AutomatedWorkflow';

/**
 * Factory for creating workflow instances with dependencies
 */
export class WorkflowFactory {
  constructor(
    private readonly llmDeps: LLMGenerateTitleStepDependencies,
    private readonly updateDeps: UpdateDocumentStepDependencies,
  ) {}

  create(jobType: WorkflowType): IWorkflow {
    switch (jobType) {
      case WorkflowType.APPROVAL:
        return new ApprovalWorkflow(this.llmDeps, this.updateDeps);
      case WorkflowType.AUTOMATED:
        return new AutomatedWorkflow(this.llmDeps, this.updateDeps)
      default:
        throw new Error(`No workflow defined for job type: ${jobType}`);
    }
  }
}
