import { AppSettingsData } from './AppSettingsTypes.js';

export interface AppSettingsRecord extends AppSettingsData {
  readonly updatedAt: Date;
  readonly updatedBy: string | null;
}

export interface IAppSettingsRepository {
  get(): Promise<AppSettingsRecord>;
  update(input: AppSettingsData, updatedBy: string | null): Promise<AppSettingsRecord>;
}
