import { TransactionManager } from '../infrastructure/TransactionManager';
import { StepType } from '../domain/steps/IStep';
import { Prompt } from '../domain/prompt/Prompt';

/**
 * Application service for prompt management operations
 * Handles transaction management for prompt CRUD operations
 */
export class PromptApplicationService {
  constructor(private readonly txManager: TransactionManager) {}

  /**
   * Get all prompts
   * @returns Array of prompts
   */
  async getAllPrompts(): Promise<Prompt[]> {
    await using context = await this.txManager.createContext();
    try {
      await context.start();
      
      const repos = context.getRepositoryRegistry();
      const promptRepo = repos.getPrompts();
      
      const prompts = await promptRepo.getAll();
      await context.commit();
      
      return prompts;
    } catch (error) {
      await context.rollback();
      throw error;
    }
  }

  /**
   * Update or create a prompt for a specific step type
   * @param stepType The step type
   * @param template The prompt template
   * @returns The created or updated prompt
   */
  async upsertPrompt(stepType: StepType, template: string): Promise<Prompt> {
    await using context = await this.txManager.createContext();
    try {
      await context.start();
      
      const repos = context.getRepositoryRegistry();
      const promptRepo = repos.getPrompts();
      const prompt = await promptRepo.upsert(stepType, template);
      
      await context.commit();
      return prompt;
    } catch (error) {
      await context.rollback();
      throw error;
    }
  }
}
