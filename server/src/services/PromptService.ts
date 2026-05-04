import { IPromptService } from '../domain/prompt/IPromptService';
import { IPromptsRepository } from '../domain/prompt/IPromptsRepository';
import { IDocument } from '../domain/document/IDocument';
import { Job } from '../domain/job/Job';
import { Prompt } from '../domain/prompt/Prompt';

/**
 * PromptService - handles prompt rendering with document and job context
 */
export class PromptService implements IPromptService {
  constructor(private readonly promptsRepo: IPromptsRepository) {}

  /**
   * Render a prompt for a specific job and document
   * @param document The document to render the prompt for
   * @param job The job context
   * @returns Rendered prompt with variables substituted
   */
  async renderPrompt(document: IDocument, job: Job): Promise<Prompt> {
    // Get the prompt template for this job type
    const prompt = await this.promptsRepo.getByJobType(job.jobType);
    
    if (!prompt) {
      throw new Error(`No prompt found for job type: ${job.jobType}`);
    }

    // Prepare variables for rendering
    const variables: Record<string, string> = {
      documentContent: this.truncateContent(document.content, 4000),
      documentId: document.id,
      documentTitle: document.title || '(No title)',
    };

    // Add job-specific data if available
    if (job.data) {
      for (const [key, value] of Object.entries(job.data)) {
        if (typeof value === 'string') {
          variables[key] = value;
        } else if (value !== null && value !== undefined) {
          variables[key] = String(value);
        }
      }
    }

    // Render the template
    const renderedText = prompt.render(variables);

    // Return a new Prompt instance with the rendered template
    // This preserves the prompt metadata while providing rendered content
    return new Prompt(
      prompt.id,
      prompt.jobType,
      renderedText,
      prompt.version,
      prompt.createdAt,
      prompt.updatedAt,
    );
  }

  /**
   * Truncate document content to a maximum length to avoid token limits
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
