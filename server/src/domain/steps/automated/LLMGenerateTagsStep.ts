import { ExecutableStep } from './ExecutableStep.js';
import { StepExecutionContext, StepResult, StepStatus, StepType } from '../IStep.js';
import { TagUpdateAction } from '../../actions/TagUpdateAction.js';
import { Transition } from '../../workflows/Transition.js';

/**
 * Step: Generate tags using LLM
 * Returns: TagUpdateAction with proposed tags and SUCCESS transition
 */
export class LLMGenerateTagsStep extends ExecutableStep {
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
      StepType.LLM_GENERATE_TAGS,
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
      throw new Error('LLMGenerateTagsStep requires a prompt');
    }

    // Fetch document from DMS
    const document = await context.services.dms.getDocument(context.job.documentId);

    // Render prompt using domain service
    const renderedPrompt = context.services.promptDomainService.renderPrompt(
      context.prompt,
      document,
      context.job
    );

    // Call LLM to generate tags
    const generatedResponse = await context.services.llm.sendChatRequest(renderedPrompt);

    // Parse the tags from the LLM response
    const proposedTagNames = this.parseTags(generatedResponse);

    // Get current tag IDs from document metadata (metadata contains the original Paperless document)
    const currentTagIds: string[] = Array.isArray(document.tags)
      ? (document.tags)
      : [];

    // Create TagUpdateAction
    const action = TagUpdateAction.create(
      context.job.id,
      proposedTagNames,
      currentTagIds
    );

    return {
      actions: [action],
      success: true,
      transition: Transition.SUCCESS,
      message: "Generated tags: " + action.newValue
    };
  }

  /**
   * Parse tag names from LLM response
   * Expected formats:
   * - Comma-separated: "tag1, tag2, tag3"
   * - Bullet list: "- tag1\n- tag2\n- tag3"
   * - JSON array: ["tag1", "tag2", "tag3"]
   */
  private parseTags(response: string): string[] {
    // Remove thinking tags and their content
    let cleaned = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

    // Try JSON parsing first
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map((tag) => String(tag).trim()).filter(Boolean);
      }
    } catch {
      // Not JSON, continue with other parsing
    }

    // Try bullet list format
    if (cleaned.includes('\n-') || cleaned.includes('\n*')) {
      const lines = cleaned.split('\n');
      const tags = lines
        .map((line) => line.replace(/^[\s\-\*]+/, '').trim())
        .filter(Boolean);
      if (tags.length > 0) {
        return tags;
      }
    }

    // Try comma-separated format
    if (cleaned.includes(',')) {
      return cleaned.split(',').map((tag) => tag.trim()).filter(Boolean);
    }

    // Single tag or unrecognized format - return as single tag
    return [cleaned];
  }
}
