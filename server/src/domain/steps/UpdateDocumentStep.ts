import { AutomatedStep } from './AutomatedStep';
import { StepExecutionContext, AutomatedStepResult } from '../interfaces/IStep';
import { IDocumentManagementSystem } from '../interfaces/IDocumentManagementSystem';
import { TitleUpdateAction } from '../actions/TitleUpdateAction';
import { Transition } from '../enums/Transition';
import { DocumentActionType } from '../enums/ActionType';

/**
 * Step: Update document in DMS
 * Reads the TitleUpdateAction from job context and executes it
 * Returns: SUCCESS transition if update succeeds, FAILURE on error
 */
export class UpdateDocumentStep extends AutomatedStep {
  constructor(private readonly dmsService: IDocumentManagementSystem) {
    super();
  }

  protected async doExecute(context: StepExecutionContext): Promise<AutomatedStepResult> {
    // Get the title update action from step payload
    // The workflow should have passed the action data from job.documentActions
    const proposedTitle = context.stepPayload.proposedTitle as string | undefined;
    const oldTitle = context.stepPayload.oldTitle as string | null | undefined;

    if (!proposedTitle) {
      throw new Error('No proposed title found in step payload');
    }

    // Create and execute the title update action
    const action = TitleUpdateAction.create(
      context.documentId,
      'paperless',
      proposedTitle,
      oldTitle || null,
    );

    // Execute the document update
    await action.execute(this.dmsService);

    // Return the action and SUCCESS transition
    return {
      actions: [action],
      transition: Transition.SUCCESS,
    };
  }
}
