import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { QueueItem } from '../../services/api/generated/models/QueueItem';
import { WorkItemStatus } from '../../services/api/generated/models/WorkItemStatus';
import type { RootState } from '../store';

interface QueueState {
  items: QueueItem[];
  nextCursor: string | null;
  statusFilter: WorkItemStatus | '';
  loading: boolean;
  error: string | null;
}

const initialState: QueueState = {
  items: [],
  nextCursor: null,
  statusFilter: '',
  loading: false,
  error: null,
};

export const fetchQueueItems = createAsyncThunk(
  'queue/fetchItems',
  async ({
    cursor,
    append,
    statusFilter,
  }: {
    cursor?: string;
    append?: boolean;
    statusFilter: WorkItemStatus | '';
  }) => {
    const response = await apiClient.fetchQueueItems(50, cursor, statusFilter || undefined);
    return { response, append: append ?? false };
  },
);

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<WorkItemStatus | ''>) {
      state.statusFilter = action.payload;
      state.items = [];
      state.nextCursor = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchQueueItems.pending, (state, action) => {
        if (!action.meta.arg.append) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchQueueItems.fulfilled, (state, action) => {
        state.loading = false;
        const { response, append } = action.payload;
        if (append) {
          state.items = [...state.items, ...response.items];
        } else {
          state.items = response.items;
        }
        state.nextCursor = response.pagination.nextCursor;
      })
      .addCase(fetchQueueItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch queue';
      });
  },
});

export const { setStatusFilter, clearError } = queueSlice.actions;

export const selectNotCompletedCount = (state: RootState) => {
  const { items } = state.queue;
  const notCompleted = items.filter(
    (item) =>
      item.status !== WorkItemStatus.failed && item.status !== WorkItemStatus.completed,
  ).length;
  const inFallout = items.filter((item) => item.status === WorkItemStatus.in_fallout).length;
  return notCompleted + inFallout;
};

export default queueSlice.reducer;
