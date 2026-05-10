import { StepType } from '../steps/IStep.js';
import { Prompt } from './Prompt.js';

export interface IPromptsRepository {
  /**
   * Get a prompt by step type
   * @param stepType Type of step
   * @returns Prompt for the specified step type or null if not found
   */
  getByStepType(stepType: StepType): Promise<Prompt | null>;

  /**
   * Get all prompts
   * @returns Array of all prompts
   */
  getAll(): Promise<Prompt[]>;

  /**
   * Insert or update a prompt
   * @param stepType Type of step
   * @param template Prompt template
   * @returns Created or updated prompt
   */
  upsert(stepType: StepType, template: string): Promise<Prompt>;
}
