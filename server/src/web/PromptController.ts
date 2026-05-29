import type { PromptsListResponse } from './dtos/models/PromptsListResponse.js';
import type { PromptResponse } from './dtos/models/PromptResponse.js';
import type { UpdatePromptRequest } from './dtos/models/UpdatePromptRequest.js';
import { AppMapper } from '../map/Mapper.js';
import type { StepType } from './dtos/models/StepType.js';

import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';

export class PromptController {
  private promptAppService;

  constructor(appFactory: ApplicationServiceFactory) {
    this.promptAppService = appFactory.createPromptApplicationService();
  }

  async listPrompts(): Promise<PromptsListResponse> {
    const prompts = await this.promptAppService.getAllPrompts();
    return {
      prompts: AppMapper.toPromptResponseList(prompts),
    };
  }

  async updatePrompt(stepType: StepType, body: UpdatePromptRequest): Promise<PromptResponse> {
    const domainStepType = AppMapper.toDomainStepType(stepType)
    const prompt = await this.promptAppService.upsertPrompt(domainStepType, body.template);
    return AppMapper.toPromptResponse(prompt);
  }
}
