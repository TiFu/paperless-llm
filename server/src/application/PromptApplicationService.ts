import { StepType } from '../domain/steps/IStep.js';
import { Prompt } from '../domain/prompt/Prompt.js';
import { UoWFactory } from '../infrastructure/UoW.js';
import { UserContext } from '../domain/auth/UserContext.js';

export class PromptApplicationService {
  constructor(private readonly uowFactory: UoWFactory) {}

  async getAllPrompts(user: UserContext): Promise<Prompt[]> {
    await using context = await this.uowFactory.createUoW(user);
    await context.start();
    const prompts = await context.getPrompts().getAll();
    await context.save();
    await context.commit();
    return prompts;
  }

  async upsertPrompt(stepType: StepType, template: string, user: UserContext): Promise<Prompt> {
    await using context = await this.uowFactory.createUoW(user);
    await context.start();
    const prompt = await context.getPrompts().upsert(stepType, template);
    await context.commit();
    return prompt;
  }
}
