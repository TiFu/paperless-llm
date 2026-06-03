import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { PromptResponse } from '../../services/api/generated/models/PromptResponse';

interface PromptsState {
  prompts: PromptResponse[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  saving: boolean;
}

const initialState: PromptsState = {
  prompts: [],
  loading: false,
  error: null,
  successMessage: null,
  saving: false,
};

export const fetchPrompts = createAsyncThunk('prompts/fetch', async () => {
  const response = await apiClient.fetchPrompts();
  return response.prompts;
});

export const updatePrompt = createAsyncThunk(
  'prompts/update',
  async ({ stepType, template }: { stepType: string; template: string }) => {
    return await apiClient.updatePrompt(stepType, template);
  },
);

const promptsSlice = createSlice({
  name: 'prompts',
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
      .addCase(fetchPrompts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrompts.fulfilled, (state, action) => {
        state.loading = false;
        state.prompts = action.payload;
      })
      .addCase(fetchPrompts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch prompts';
      })
      .addCase(updatePrompt.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updatePrompt.fulfilled, (state, action) => {
        state.saving = false;
        state.prompts = state.prompts.map((p) =>
          p.stepType === action.payload.stepType ? action.payload : p,
        );
        state.successMessage = `Prompt for "${action.payload.stepType}" updated successfully (v${action.payload.version})`;
      })
      .addCase(updatePrompt.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message ?? 'Failed to update prompt';
      });
  },
});

export const { clearSuccessMessage, clearError } = promptsSlice.actions;
export default promptsSlice.reducer;
