import { ExecutableStep } from './ExecutableStep.js';
import { StepExecutionContext, StepResult, StepStatus, StepType } from '../IStep.js';
import { CreatedDateUpdateAction } from '../../actions/CreatedDateUpdateAction.js';
import { Transition } from '../../workflows/Transition.js';

/**
 * Step: Generate created date using LLM
 * Returns: CreatedDateUpdateAction with proposed date and SUCCESS transition
 */
export class LLMGenerateCreatedDateStep extends ExecutableStep {
  constructor(
    stepId: string | null,
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
      StepType.LLM_GENERATE_CREATED_DATE,
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
      throw new Error('LLMGenerateCreatedDateStep requires a prompt');
    }

    // Fetch document from DMS
    const document = await context.services.dms.getDocument(context.job.documentId);

    // Render prompt using domain service
    const renderedPrompt = context.services.promptDomainService.renderPrompt(
      context.prompt,
      document,
      context.job
    );

    // Call LLM to generate created date
    const generatedResponse = await context.services.llm.sendChatRequest(renderedPrompt);

    // Parse and validate the date
    const proposedDate = this.parseDate(generatedResponse);

    // Create CreatedDateUpdateAction
    const action = CreatedDateUpdateAction.create(
      context.job.id,
      proposedDate,
      document.createdDate?.toISOString() || null
    );

    return {
      actions: [action],
      transition: Transition.SUCCESS,
      message: "Date generated: " + action.newValue
    };
  }

  /**
   * Parse date from LLM response
   * Handles various date formats and returns ISO string
   */
  private parseDate(response: string): string | null {
    // Remove thinking tags and their content
    let cleaned = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

    // Remove common prefixes
    cleaned = cleaned.replace(/^(Date:\s*|Created:\s*|Document Date:\s*)/i, '');

    // Remove surrounding quotes
    cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

    // Handle "unknown" or "not found" responses
    if (/^(unknown|not found|n\/a|none)$/i.test(cleaned)) {
      return null;
    }

    // Try to parse as date
    try {
      const date = new Date(cleaned);
      if (isNaN(date.getTime())) {
        // Invalid date
        return null;
      }
      // Return in ISO format (YYYY-MM-DD)
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }
}
