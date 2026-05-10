import { WorkflowType } from '../workflows/WorkflowType';
import { Prompt } from './Prompt';

export interface IPromptsRepository {
  /**
   * Get a prompt by job type
   * @param jobType Type of job
   * @returns Prompt for the specified job type or null if not found
   */
  getByJobType(jobType: WorkflowType): Promise<Prompt | null>;

  /**
   * Get all prompts
   * @returns Array of all prompts
   */
  getAll(): Promise<Prompt[]>;

  /**
   * Insert or update a prompt
   * @param jobType Type of job
   * @param template Prompt template
   * @returns Created or updated prompt
   */
  upsert(jobType: WorkflowType, template: string): Promise<Prompt>;
}
