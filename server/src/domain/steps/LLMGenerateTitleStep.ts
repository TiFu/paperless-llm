import { AutomatedStep } from './AutomatedStep';
import { StepExecutionContext, AutomatedStepResult } from '../interfaces/IStep';
import { IDocumentManagementSystem } from '../interfaces/IDocumentManagementSystem';
import { OllamaService } from '../../services/OllamaService';
import { IPromptsRepository } from '../interfaces/IPromptsRepository';
import { TitleUpdateAction } from '../actions/TitleUpdateAction';
import { Transition } from '../enums/Transition';
import { JobType } from '../enums/JobType';
import { WorkItemStatus } from '../enums/WorkItemStatus';

/**
 * Step: Generate title using LLM
 * Returns: TitleUpdateAction with proposed title and SUCCESS transition
 */
export class LLMGenerateTitleStep extends AutomatedStep {
  constructor(
    private readonly dmsService: IDocumentManagementSystem,
    private readonly ollamaService: OllamaService,
    private readonly promptsRepo: IPromptsRepository,
  ) {
    super();
  }

  protected async doExecute(context: StepExecutionContext): Promise<AutomatedStepResult> {
    // Fetch document from DMS
    const document = await this.dmsService.getDocument(context.documentId);

    // Get prompt template - cast context.jobType to JobType enum
    const jobType = context.jobType as JobType;
    const prompt = await this.promptsRepo.getByJobType(jobType);
    if (!prompt) {
      throw new Error(`No prompt found for job type: ${context.jobType}`);
    }

    // Render the prompt template with document content
    const renderedPrompt = prompt.render({
      documentContent: this.truncateContent(document.content, 4000),
    });

    // Call LLM to generate title
    const generatedTitle = await this.ollamaService.sendChatRequest(renderedPrompt);

    // Clean up the title
    const proposedTitle = this.cleanTitle(generatedTitle);

    // Create TitleUpdateAction (document action, not workflow action)
    const action = TitleUpdateAction.create(
      context.documentId,
      'paperless',
      proposedTitle,
      document.title,
    );

    // Action will be stored in job.documentActions array
    // UpdateDocumentStep can read it from there
    return {
      actions: [action],
      transition: Transition.SUCCESS,
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
