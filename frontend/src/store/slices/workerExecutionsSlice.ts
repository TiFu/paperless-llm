import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { WorkerExecutionSummary } from '../../services/api/generated/models/WorkerExecutionSummary';
import { WorkerExecutionItem } from '../../services/api/generated/models/WorkerExecutionItem';
import { WorkerType } from '../../services/api/generated/models/WorkerType';
import { WorkerExecutionStatus } from '../../services/api/generated/models/WorkerExecutionStatus';
import type { RootState } from '../store';

interface WorkerExecutionListState {
  executions: WorkerExecutionSummary[];
  nextCursor: string | null;
  workerTypeFilter: WorkerType | '';
  statusFilter: WorkerExecutionStatus | '';
  loading: boolean;
  error: string | null;
  hasLoadedMore: boolean;
}

interface WorkerExecutionDetailState {
  execution: WorkerExecutionSummary | null;
  items: WorkerExecutionItem[];
  loading: boolean;
  error: string | null;
  autoRefresh: boolean;
}

interface WorkerExecutionsState {
  list: WorkerExecutionListState;
  detail: WorkerExecutionDetailState;
}

const initialState: WorkerExecutionsState = {
  list: {
    executions: [],
    nextCursor: null,
    workerTypeFilter: '',
    statusFilter: '',
    loading: false,
    error: null,
    hasLoadedMore: false,
  },
  detail: {
    execution: null,
    items: [],
    loading: false,
    error: null,
    autoRefresh: true,
  },
};

export const fetchWorkerExecutions = createAsyncThunk(
  'workerExecutions/fetchList',
  async ({
    cursor,
    append,
    workerType,
    status,
  }: {
    cursor?: string;
    append?: boolean;
    workerType: WorkerType | '';
    status: WorkerExecutionStatus | '';
  }) => {
    const response = await apiClient.fetchWorkerExecutions(20, cursor, workerType || undefined, status || undefined);
    return { response, append: append ?? false };
  },
);

export const fetchWorkerExecutionDetails = createAsyncThunk(
  'workerExecutions/fetchDetail',
  async (id: string) => {
    return await apiClient.fetchWorkerExecutionById(id);
  },
);

const workerExecutionsSlice = createSlice({
  name: 'workerExecutions',
  initialState,
  reducers: {
    setWorkerTypeFilter(state, action: PayloadAction<WorkerType | ''>) {
      state.list.workerTypeFilter = action.payload;
      state.list.executions = [];
      state.list.nextCursor = null;
      state.list.hasLoadedMore = false;
    },
    setStatusFilter(state, action: PayloadAction<WorkerExecutionStatus | ''>) {
      state.list.statusFilter = action.payload;
      state.list.executions = [];
      state.list.nextCursor = null;
      state.list.hasLoadedMore = false;
    },
    setAutoRefresh(state, action: PayloadAction<boolean>) {
      state.detail.autoRefresh = action.payload;
    },
    clearWorkerExecutionDetails(state) {
      state.detail = initialState.detail;
    },
  },
  extraReducers(builder) {
    // List
    builder
      .addCase(fetchWorkerExecutions.pending, (state, action) => {
        if (!action.meta.arg.append) {
          state.list.loading = true;
          state.list.hasLoadedMore = false;
        }
        state.list.error = null;
      })
      .addCase(fetchWorkerExecutions.fulfilled, (state, action) => {
        state.list.loading = false;
        const { response, append } = action.payload;
        if (append) {
          state.list.executions = [...state.list.executions, ...response.executions];
          state.list.hasLoadedMore = true;
        } else {
          state.list.executions = response.executions;
          state.list.hasLoadedMore = false;
        }
        state.list.nextCursor = response.nextCursor;
      })
      .addCase(fetchWorkerExecutions.rejected, (state, action) => {
        state.list.loading = false;
        state.list.error = action.error.message ?? 'Failed to fetch worker executions';
      });

    // Detail
    builder
      .addCase(fetchWorkerExecutionDetails.pending, (state, action) => {
        state.detail.loading = true;
        state.detail.error = null;
        state.detail.autoRefresh = true;
        const id = action.meta.arg;
        const existing = state.list.executions.find((e) => e.id === id);
        if (existing) {
          state.detail.execution = existing;
        }
      })
      .addCase(fetchWorkerExecutionDetails.fulfilled, (state, action) => {
        state.detail.loading = false;
        const { items, ...execution } = action.payload;
        state.detail.execution = execution;
        state.detail.items = items;
        if (execution.status !== WorkerExecutionStatus.running) {
          state.detail.autoRefresh = false;
        }
      })
      .addCase(fetchWorkerExecutionDetails.rejected, (state, action) => {
        state.detail.loading = false;
        state.detail.error = action.error.message ?? 'Failed to fetch worker execution details';
        state.detail.autoRefresh = false;
      });
  },
});

export const { setWorkerTypeFilter, setStatusFilter, setAutoRefresh, clearWorkerExecutionDetails } =
  workerExecutionsSlice.actions;

export const selectHasRunningExecutions = (state: RootState) =>
  state.workerExecutions.list.executions.some((e) => e.status === WorkerExecutionStatus.running);

export default workerExecutionsSlice.reducer;
