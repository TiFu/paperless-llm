import { AutomatedStep } from './AutomatedStep.js';
import { StepExecutionContext, StepResult, StepStatus } from '../IStep.js';
import { Transition } from '../../workflows/Transition.js';
import { StepType } from '../IStep.js';

/**
 * Step: Update document in DMS
 * Reads the TitleUpdateAction from job context and executes it
 * Returns: SUCCESS transition if update succeeds, FAILURE on error
 */
export class UpdateDocumentStep extends AutomatedStep {
  constructor(stepId: string | null, jobId: string, stepState: StepStatus, retryCount: number = 0) {
    super(stepId, StepType.UPDATE_DOCUMENT, jobId, stepState, retryCount);
  }

  protected async doExecute(context: StepExecutionContext): Promise<StepResult> {

    const documentId = context.job.documentId

    const document = await context.services.dms.getDocument(documentId);

    const partials= context.job.documentActions.map((a) => {
      return a.apply(document)
    })

    const updates = Object.assign({}, ...partials)
    
    // Execute the document update
    await context.services.dms.updateDocument(document.id, updates)

    // Return the action and SUCCESS transition
    return {
      actions: [],
      transition: Transition.SUCCESS,
    };
  }
}
