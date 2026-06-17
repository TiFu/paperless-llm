import { StepType } from '../steps/IStep.js';
import { Prompt } from './Prompt.js';

export interface IPromptsRepository {
  getByStepType(stepType: StepType): Promise<Prompt | null>;
  getAll(): Promise<Prompt[]>;
  upsert(stepType: StepType, template: string): Promise<Prompt>;

  // User-scoped prompt methods
  getAllForUser(username: string): Promise<Prompt[]>;
  getGlobalDefaults(): Promise<Prompt[]>;
  copyForUser(defaults: Prompt[], username: string): Promise<void>;
}
