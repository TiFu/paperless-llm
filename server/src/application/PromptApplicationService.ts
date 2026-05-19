import { StepType } from '../domain/steps/IStep.js';
import { Prompt } from '../domain/prompt/Prompt.js';
import { UoWFactory } from '../infrastructure/UoW.js';

/**
 * Application service for prompt management operations
 * Handles transaction management for prompt CRUD operations
 */
export class PromptApplicationService {
  constructor(private readonly uowFactory: UoWFactory) {}

  /**
   * Get all prompts
   * @returns Array of prompts
   */
  async getAllPrompts(): Promise<Prompt[]> {
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();
      
      const promptRepo = context.getPrompts();
      
      const prompts = await promptRepo.getAll();
      await context.save();
      await context.commit();
      
      return prompts;
    } catch (error) {
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
    try {
      await using context = await this.uowFactory.createUoW();
      await context.start();
      
      const promptRepo = context.getPrompts();
      const prompt = await promptRepo.upsert(stepType, template);
      
      await context.commit();
      return prompt;
    } catch (error) {
      throw error;
    }
  }
}
