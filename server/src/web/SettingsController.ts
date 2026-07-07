import type { SettingsResponse } from './dtos/models/SettingsResponse.js';
import type { UpdateSettingsRequest } from './dtos/models/UpdateSettingsRequest.js';
import { AppMapper } from '../map/Mapper.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { ApplicationServiceFactory } from '../application/ApplicationServiceFactory.js';

export class SettingsController {
  private settingsAppService;

  constructor(appFactory: ApplicationServiceFactory) {
    this.settingsAppService = appFactory.createSettingsApplicationService();
  }

  async getSettings(user: UserContext): Promise<SettingsResponse> {
    const view = await this.settingsAppService.getSettings(user);
    return AppMapper.toSettingsResponse(view);
  }

  async updateSettings(body: UpdateSettingsRequest, user: UserContext): Promise<SettingsResponse> {
    await this.settingsAppService.updateSettings(AppMapper.toAppSettingsData(body), user);
    // Re-fetch rather than reshape the update() result so the response
    // always includes connectedSystems/promptVariables too, same as GET.
    const view = await this.settingsAppService.getSettings(user);
    return AppMapper.toSettingsResponse(view);
  }
}
