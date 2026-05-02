import { IJob } from '../interfaces/IJob';
import { IDocument } from '../interfaces/IDocument';
import { ILLMService } from '../interfaces/ILLMService';
import { Prompt } from '../entities/Prompt';
import { Action } from '../actions/Action';
import { TitleUpdateAction } from '../actions/TitleUpdateAction';

export class TitleJob implements IJob {
  async execute(
    document: IDocument,
    llmService: ILLMService,
    prompt: Prompt,
  ): Promise<Action> {
    // Render the prompt template with document content
    const renderedPrompt = prompt.render({
      documentContent: this.truncateContent(document.content, 4000),
    });

    // Call LLM to generate title
    const generatedTitle = await llmService.sendChatRequest(renderedPrompt);

    // Clean up the title (remove quotes, extra whitespace, etc.)
    const cleanTitle = this.cleanTitle(generatedTitle);

    // Create action item to update the document title
    return TitleUpdateAction.create(
      document.id,
      'paperless-ng',
      cleanTitle,
      document.title,
    );
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
