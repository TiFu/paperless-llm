import { IPromptDomainService } from './IPromptDomainService';
import { IDocument } from '../document/IDocument';
import { Job } from '../job/Job';
import { Prompt } from './Prompt';

/**
 * PromptDomainService - handles prompt rendering with document and job context.
 * Pure domain logic with no infrastructure dependencies.
 */
export class PromptDomainService implements IPromptDomainService {
  /**
   * Render a prompt template with document and job context.
   * @param prompt The prompt template to render
   * @param document The document context
   * @param job The job context
   * @returns Rendered prompt with variables substituted
   */
  renderPrompt(prompt: Prompt, document: IDocument, job: Job): string {
    // TODO: This will have to be expanded to also provide available tags, correspondents, ...
    // Prepare variables for rendering
    const variables: Record<string, string> = {
      documentContent: this.truncateContent(document.content, 4000),
      documentTitle: document.title || '(No title)',
    };

    // Render the template using the Prompt entity's render method
    return prompt.render(variables);
  }

  /**
   * Truncate document content to a maximum length to avoid token limits.
   * @param content The content to truncate
   * @param maxLength Maximum length in characters
   * @returns Truncated content with ellipsis if needed
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '...';
  }
}
