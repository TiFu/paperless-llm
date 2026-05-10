import { TransactionManager } from '../infrastructure/TransactionManager';
import { WorkflowType } from '../domain/workflows/WorkflowType';
import { Prompt } from '../domain/prompt/Prompt';

/**
 * Application service for prompt management operations
 * Handles transaction management for prompt CRUD operations
 */
export class PromptApplicationService {
  constructor(private readonly txManager: TransactionManager) {}

  /**
   * Get all prompts for all workflow types
   * @returns Array of prompts
   */
  async getAllPrompts(): Promise<Prompt[]> {
    await using context = await this.txManager.createContext();
    try {
      await context.start();
      
      const repos = context.getRepositoryRegistry();
      const promptRepo = repos.getPrompts();
      
      // Fetch prompts for all job types
      const promptPromises = await Object.values(WorkflowType).map(async (jobType) =>
        {
            return promptRepo.getByJobType(jobType) as Promise<Prompt>
        }
      );
      
      const results = await Promise.all(promptPromises);
      await context.commit();
      
      return results.filter(Boolean);
    } catch (error) {
      await context.rollback();
      throw error;
    }
  }

  /**
   * Update or create a prompt for a specific job type
   * @param jobType The workflow type
   * @param template The prompt template
   * @returns The created or updated prompt
   */
  async upsertPrompt(jobType: WorkflowType, template: string): Promise<Prompt> {
    await using context = await this.txManager.createContext();
    try {
      await context.start();
      
      const repos = context.getRepositoryRegistry();
      const promptRepo = repos.getPrompts();
      const prompt = await promptRepo.upsert(jobType, template);
      
      await context.commit();
      return prompt;
    } catch (error) {
      await context.rollback();
      throw error;
    }
  }
}
