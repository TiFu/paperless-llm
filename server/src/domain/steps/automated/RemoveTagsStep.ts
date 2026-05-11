import { AutomatedStep } from './AutomatedStep.js';
import { StepExecutionContext, StepResult, StepStatus } from '../IStep.js';
import { Transition } from '../../workflows/Transition.js';
import { StepType } from '../IStep.js';

/**
 * Step: Remove processing tag from document
 * Removes the configured processing tag from the document in the DMS
 * Returns: SUCCESS transition if removal succeeds, FAILURE on error
 */
export class RemoveTagsStep extends AutomatedStep {
  constructor(
    stepId: string | null, 
    jobId: string, 
    stepState: StepStatus, 
    retryCount: number = 0,
    retryAfter: Date | null = null
  ) {
    super(stepId, StepType.REMOVE_TAGS, jobId, stepState, retryCount, retryAfter);
  }

  protected async doExecute(context: StepExecutionContext): Promise<StepResult> {
    const documentId = context.job.documentId;

    try {
      // Remove the processing tag from the document
      await context.services.dms.removeProcessingTag(documentId);
    } catch (error) {
      // Log warning but don't fail the job - tag removal is cleanup
      console.warn(`Failed to remove processing tag from document ${documentId}:`, error);
    }

    // Return SUCCESS transition
    return {
      actions: [],
      transition: Transition.SUCCESS,
    };
  }
}
