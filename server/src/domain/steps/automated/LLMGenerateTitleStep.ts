import { ExecutableStep } from './ExecutableStep.js';
import { StepExecutionContext, StepResult, StepStatus, StepType} from '../IStep.js';
import { TitleUpdateAction } from '../../actions/TitleUpdateAction.js';
import { Transition } from '../../workflows/Transition.js';

/**
 * Step: Generate title using LLM
 * Returns: TitleUpdateAction with proposed title and SUCCESS transition
 */
export class LLMGenerateTitleStep extends ExecutableStep {
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
    super(stepId, StepType.LLM_GENERATE_TITLE, jobId, stepState, retryCount, retryAfter, startedAt, parentStepId, configuration);
  }

  public needsPrompt(): boolean {
    return true;
  }

  protected async doExecute(context: StepExecutionContext): Promise<StepResult> {
    if (!context.prompt) {
      throw new Error('LLMGenerateTitleStep requires a prompt');
    }

    // Fetch document from DMS
    const document = await context.services.dms.getDocument(context.job.documentId);

    // Render prompt using domain service
    const renderedPrompt = await context.services.promptDomainService.renderPrompt(
      context.prompt,
      document,
      context.job
    );

    // Call LLM to generate title
    const generatedTitle = await context.services.llm.sendChatRequest(renderedPrompt);

    // Clean up the title
    const proposedTitle = this.cleanTitle(generatedTitle);

    // Create TitleUpdateAction (document action, not workflow action)
    const action = TitleUpdateAction.create(
      context.job.id,
      proposedTitle,
      document.title,
    );

    // Action will be stored in job.documentActions array
    // UpdateDocumentStep can read it from there
    return {
      actions: [action],
      success: true,
      transition: Transition.SUCCESS,
      message: "Generated title: " + action.newValue,
      prompt: renderedPrompt
    };
  }

  /**
   * Truncate document content to a maximum length to avoid token limits
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '...';
  }

  /**
   * Clean up the generated title
   */
  private cleanTitle(title: string): string {
    // Remove thinking tags and their content
    let cleaned = title.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    // Remove surrounding quotes
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // Remove common prefixes that LLMs might add
    cleaned = cleaned.replace(/^(Title:\s*|Document Title:\s*)/i, '');

    return cleaned.trim();
  }
}
