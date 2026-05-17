import { ExecutableStep } from './ExecutableStep.js';
import { StepExecutionContext, StepResult, StepStatus, StepType } from '../IStep.js';
import { CorrespondentUpdateAction } from '../../actions/CorrespondentUpdateAction.js';
import { Transition } from '../../workflows/Transition.js';

/**
 * Step: Generate correspondent using LLM
 * Returns: CorrespondentUpdateAction with proposed correspondent and SUCCESS transition
 */
export class LLMGenerateCorrespondentStep extends ExecutableStep {
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
    super(
      stepId,
      StepType.LLM_GENERATE_CORRESPONDENT,
      jobId,
      stepState,
      retryCount,
      retryAfter,
      startedAt,
      parentStepId,
      configuration
    );
  }

  public needsPrompt(): boolean {
    return true;
  }

  protected async doExecute(context: StepExecutionContext): Promise<StepResult> {
    if (!context.prompt) {
      throw new Error('LLMGenerateCorrespondentStep requires a prompt');
    }

    // Fetch document from DMS
    const document = await context.services.dms.getDocument(context.job.documentId);

    // Render prompt using domain service
    const renderedPrompt = context.services.promptDomainService.renderPrompt(
      context.prompt,
      document,
      context.job
    );

    // Call LLM to generate correspondent
    const generatedResponse = await context.services.llm.sendChatRequest(renderedPrompt);

    // Clean the correspondent name
    const proposedCorrespondentName = this.cleanCorrespondent(generatedResponse);

    // Resolve correspondent name to ID (create if missing)
    const proposedCorrespondentId = await context.services.dms.resolveCorrespondentId(
      proposedCorrespondentName, 
      true
    );

    // Get current correspondent from document metadata
    const currentCorrespondentId: number | null = 
      document.metadata?.correspondent ? Number(document.metadata.correspondent) : null;

    // Create CorrespondentUpdateAction
    const action = CorrespondentUpdateAction.create(
      context.job.id,
      proposedCorrespondentId,
      currentCorrespondentId
    );

    return {
      actions: [action],
      transition: Transition.SUCCESS,
      message: "Correspondent: " + action.newValue
    };
  }

  /**
   * Clean up the generated correspondent name
   */
  private cleanCorrespondent(response: string): string {
    // Remove thinking tags and their content
    let cleaned = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    // Remove surrounding quotes
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // Remove common prefixes that LLMs might add
    cleaned = cleaned.replace(/^(Correspondent:\s*|From:\s*|Sender:\s*)/i, '');

    return cleaned.trim();
  }
}
