import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { QueueItem } from '../../services/api/generated/models/QueueItem';
import { WorkItemStatus } from '../../services/api/generated/models/WorkItemStatus';
import { falloutRetried, falloutCancelled } from './statsSlice';

interface FalloutsState {
  fallouts: QueueItem[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: FalloutsState = {
  fallouts: [],
  nextCursor: null,
  loading: false,
  loadingMore: false,
  error: null,
  successMessage: null,
};

export const fetchFallouts = createAsyncThunk<
  { response: Awaited<ReturnType<typeof apiClient.fetchQueueItems>>; append: boolean },
  { append?: boolean } | undefined,
  { state: { fallouts: FalloutsState } }
>(
  'fallouts/fetch',
  async (arg = {}, { getState }) => {
    const append = arg.append ?? false;
    const cursor = append ? (getState().fallouts.nextCursor ?? undefined) : undefined;
    const response = await apiClient.fetchQueueItems(50, cursor, WorkItemStatus.in_fallout);
    return { response, append };
  },
);

export const retryFallout = createAsyncThunk(
  'fallouts/retry',
  async (stepId: string, { dispatch }) => {
    const response = await apiClient.retryStep(stepId);
    dispatch(falloutRetried());
    return { stepId, message: response.message || 'Step retry initiated successfully' };
  },
);

export const cancelFallout = createAsyncThunk(
  'fallouts/cancel',
  async (stepId: string, { dispatch }) => {
    const response = await apiClient.cancelStep(stepId);
    dispatch(falloutCancelled());
    return { stepId, message: response.message || 'Step cancelled successfully' };
  },
);

const falloutsSlice = createSlice({
  name: 'fallouts',
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
      .addCase(fetchFallouts.pending, (state, action) => {
        if (action.meta.arg?.append) {
          state.loadingMore = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchFallouts.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        const { response, append } = action.payload;
        if (append) {
          state.fallouts = [...state.fallouts, ...response.items];
        } else {
          state.fallouts = response.items;
        }
        state.nextCursor = response.pagination.nextCursor;
      })
      .addCase(fetchFallouts.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.error.message ?? 'Failed to fetch fallouts';
      })
      .addCase(retryFallout.fulfilled, (state, action) => {
        state.fallouts = state.fallouts.filter((f) => f.id !== action.payload.stepId);
        state.successMessage = action.payload.message;
      })
      .addCase(cancelFallout.fulfilled, (state, action) => {
        state.fallouts = state.fallouts.filter((f) => f.id !== action.payload.stepId);
        state.successMessage = action.payload.message;
      });
    // retryFallout.rejected / cancelFallout.rejected handled by component via .unwrap()
  },
});

export const { clearSuccessMessage, clearError } = falloutsSlice.actions;
export default falloutsSlice.reducer;
