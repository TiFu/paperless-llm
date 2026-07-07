import { IDocument } from '../document/IDocument.js';
import { Job } from '../job/Job.js';
import { ExecutableStep } from '../steps/automated/ExecutableStep.js';
import { Prompt } from './Prompt.js';

export interface PromptVariableDescriptor {
  readonly name: string;
  readonly description: string;
}

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
  renderPrompt(prompt: Prompt, document: IDocument, job: Job): Promise<string>;

  loadPrompt(step: ExecutableStep): Promise<Prompt | null>

  /**
   * The variable names/descriptions renderPrompt() substitutes into a
   * template, for display in prompt-editing UIs. Same set for every step type.
   */
  getAvailableVariables(): readonly PromptVariableDescriptor[];
}
