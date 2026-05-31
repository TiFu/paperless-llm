import { ExecutableStep } from './ExecutableStep.js';
import { StepExecutionContext, StepResult, StepStatus } from '../IStep.js';
import { Transition } from '../../workflows/Transition.js';
import { StepType } from '../IStep.js';

/**
 * Step: Remove processing tag from document
 * Removes the configured processing tag from the document in the DMS
 * Returns: SUCCESS transition if removal succeeds, FAILURE on error
 */
export class RemoveTagsStep extends ExecutableStep {
  constructor(
    stepId: string, 
    jobId: string, 
    stepState: StepStatus, 
    retryCount: number = 0,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, any> | null = null
  ) {
    super(stepId, StepType.REMOVE_TAGS, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);
  }

  protected async doExecute(context: StepExecutionContext): Promise<StepResult> {
    const documentId = context.job.documentId;

    // Remove the processing tag from the document
    await context.services.dms.removeProcessingTag(documentId);

    // Return SUCCESS transition
    return {
      actions: [],
      success: true,
      transition: Transition.SUCCESS,
        message: "Tags cleaned up"
    };
  }
}
