import { IDocument } from '../document/IDocument.js';
import { Job } from '../job/Job.js';
import { Prompt } from './Prompt.js';

/**
 * Domain service interface for prompt rendering.
 * Pure business logic - no side effects or infrastructure dependencies.
 */
export interface IPromptDomainService {
  /**
   * Render a prompt template with document and job context.
   * @param prompt The prompt template to render
   * @param document The document context
   * @param job The job context
   * @returns Rendered prompt with variables substituted
   */
  renderPrompt(prompt: Prompt, document: IDocument, job: Job): string;
}
