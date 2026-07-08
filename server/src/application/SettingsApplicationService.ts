import { UoWFactory } from '../infrastructure/UoW.js';
import { UserContext } from '../domain/auth/UserContext.js';
import { AppConfig } from '../config/AppConfig.js';
import { AppSettingsData } from '../domain/settings/AppSettingsTypes.js';
import { AppSettingsRecord } from '../domain/settings/IAppSettingsRepository.js';
import { validateAppSettings } from '../domain/settings/SettingsDomainService.js';
import { PromptVariableDescriptor } from '../domain/prompt/IPromptDomainService.js';
import { SETTINGS_RESOURCE_ID } from '../domain/authorization/IPermissionsRepository.js';
import { AuditLogEntry } from '../domain/audit/AuditLogEntry.js';
import { ApiError } from '../api/middleware/errorHandler.js';

export interface ConnectedSystemsInfo {
  paperlessUrl: string;
  llmUrl: string;
  databaseHost: string;
}

export interface SettingsView {
  settings: AppSettingsRecord;
  connectedSystems: ConnectedSystemsInfo;
  promptVariables: readonly PromptVariableDescriptor[];
}

export class SettingsApplicationService {
  constructor(
    private readonly uowFactory: UoWFactory,
    // Depends on the concrete AppConfig (not a narrow I*Config interface) —
    // this is the composition point that needs both its read-only technical
    // fields (connected-systems info) and refreshNow().
    private readonly config: AppConfig,
  ) {}

  async getSettings(user: UserContext): Promise<SettingsView> {
    await using uow = await this.uowFactory.createUoW(user);
    await uow.start();
    const settings = await uow.getSettings().get();
    const promptVariables = uow.getPromptDomainService().getAvailableVariables();
    await uow.commit();

    return {
      settings,
      connectedSystems: {
        paperlessUrl: this.config.paperless.url,
        llmUrl: this.config.llm.url,
        databaseHost: this.config.database.host,
      },
      promptVariables,
    };
  }

  async updateSettings(input: AppSettingsData, user: UserContext): Promise<AppSettingsRecord> {
    const errors = validateAppSettings(input);
    if (errors.length > 0) {
      throw new ApiError(400, 'Invalid Settings', errors.join('; '));
    }

    await using uow = await this.uowFactory.createUoW(user);
    await uow.start();

    const canEdit = await uow.getPermissions().hasPermission('settings', SETTINGS_RESOURCE_ID, user.username);
    if (!canEdit) {
      throw new ApiError(403, 'Forbidden', 'Settings can only be edited by a Paperless admin');
    }

    const updated = await uow.getSettings().update(input, user.username);
    uow.getAuditCollector().record(AuditLogEntry.createSettingsUpdated(user.username));
    await uow.save();
    await uow.commit();

    // Best-effort: makes this process's own next read reflect the change
    // immediately rather than waiting for the poll interval. Other
    // processes still pick it up on their next tick.
    await this.config.refreshNow();

    return updated;
  }
}
