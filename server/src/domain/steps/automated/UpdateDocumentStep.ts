import { ExecutableStep } from './ExecutableStep.js';
import { StepExecutionContext, StepResult, StepStatus } from '../IStep.js';
import { Transition } from '../../workflows/Transition.js';
import { StepType } from '../IStep.js';
import { createLazyChildLogger } from '../../../utils/logger.js';
import { LogArea } from '../../../utils/LogArea.js';

const getLogger = createLazyChildLogger(LogArea.WORKFLOW, 'UpdateDocumentStep');

/**
 * Step: Update document in DMS
 * Reads document actions from job context and executes them
 * Returns: SUCCESS transition if update succeeds, FAILURE on error
 */
export class UpdateDocumentStep extends ExecutableStep {
  constructor(
    stepId: string, 
    jobId: string, 
    stepState: StepStatus, 
    retryCount: number = 0,
    retryAfter: Date | null = null,
    startedAt: Date | null = null,
    parentStepId: string | null = null,
    configuration: Record<string, unknown> | null = null
  ) {
    super(stepId, StepType.UPDATE_DOCUMENT, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);
  }

  protected async doExecute(context: StepExecutionContext): Promise<StepResult> {

    const documentId = context.job.documentId

    getLogger().debug({ documentId }, 'Starting document update');

    const document = await context.services.dms.getDocument(documentId);

    const partials = context.job.documentActions.map((a) => {
      return a.apply(document)
    })

    const updates = Object.assign({}, ...partials)

    getLogger().debug({ documentId, updates }, 'Applying document updates');

    // Execute the document update
    await context.services.dms.updateDocument(document.id, updates)

    getLogger().debug({ documentId }, 'Document update complete');

    // Return the action and SUCCESS transition
    return {
      actions: [],
      success: true,
      transition: Transition.SUCCESS,
      message: `Updated document ${document.id} with updates: ${JSON.stringify(updates)}`
    };
  }
}
