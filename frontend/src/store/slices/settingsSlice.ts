import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { SettingsResponse } from '../../services/api/generated/models/SettingsResponse';
import { UpdateSettingsRequest } from '../../services/api/generated/models/UpdateSettingsRequest';
import type { RootState } from '../store';

interface SettingsState {
  settings: SettingsResponse | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: SettingsState = {
  settings: null,
  loading: false,
  saving: false,
  error: null,
  successMessage: null,
};

export const fetchSettings = createAsyncThunk('settings/fetch', async () => {
  return await apiClient.fetchSettings();
});

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (settings: UpdateSettingsRequest) => {
    return await apiClient.updateSettings(settings);
  },
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSuccessMessage(state) {
      state.successMessage = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch settings';
      })
      .addCase(updateSettings.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.settings = action.payload;
        state.successMessage = 'Settings updated successfully';
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message ?? 'Failed to update settings';
      });
  },
});

export const { clearSuccessMessage, clearError } = settingsSlice.actions;
export default settingsSlice.reducer;

export const selectSettings = (state: RootState) => state.settings.settings;
export const selectSettingsLoading = (state: RootState) => state.settings.loading;
export const selectSettingsSaving = (state: RootState) => state.settings.saving;
export const selectSettingsError = (state: RootState) => state.settings.error;
export const selectSettingsSuccessMessage = (state: RootState) => state.settings.successMessage;
