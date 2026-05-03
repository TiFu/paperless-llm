import { IWorkflow } from '../interfaces/IWorkflow';
import { JobType } from '../enums/JobType';
import { TitleWorkflow } from './TitleWorkflow';
import { LLMGenerateTitleStepDependencies, UpdateDocumentStepDependencies } from '../steps/StepFactory';

/**
 * Factory for creating workflow instances with dependencies
 */
export class WorkflowFactory {
  constructor(
    private readonly llmDeps: LLMGenerateTitleStepDependencies,
    private readonly updateDeps: UpdateDocumentStepDependencies,
  ) {}

  create(jobType: JobType): IWorkflow {
    switch (jobType) {
      case JobType.TITLE:
        return new TitleWorkflow(this.llmDeps, this.updateDeps);

      default:
        throw new Error(`No workflow defined for job type: ${jobType}`);
    }
  }
}
