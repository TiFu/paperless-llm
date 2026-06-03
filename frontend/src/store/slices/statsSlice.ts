import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { QueueStats } from '../../services/api/generated/models/QueueStats';
import { ApprovalStats } from '../../services/api/generated/models/ApprovalStats';
import { JobStats } from '../../services/api/generated/models/JobStats';
import type { RootState } from '../store';

interface StatsState {
  queueStats: QueueStats | null;
  approvalStats: ApprovalStats | null;
  jobStats: JobStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: StatsState = {
  queueStats: null,
  approvalStats: null,
  jobStats: null,
  loading: false,
  error: null,
};

export const fetchDashboardStats = createAsyncThunk('stats/fetchDashboard', async () => {
  return await apiClient.fetchDashboardStats();
});

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    /** Dispatched by approvalsSlice after a successful approval/rejection decision. */
    approvalProcessed(state) {
      if (state.approvalStats) {
        state.approvalStats.pendingCount = Math.max(0, state.approvalStats.pendingCount - 1);
      }
    },
    /** Dispatched by documentsSlice after a successful job submission. */
    jobsSubmitted(state, action: PayloadAction<number>) {
      if (state.jobStats) {
        state.jobStats.pending += action.payload;
      }
    },
    /** Dispatched by falloutsSlice after a successful step retry. */
    falloutRetried(state) {
      if (state.queueStats) {
        state.queueStats.failed = Math.max(0, state.queueStats.failed - 1);
        state.queueStats.processing += 1;
      }
    },
    /** Dispatched by falloutsSlice after a successful step cancel. */
    falloutCancelled(state) {
      if (state.queueStats) {
        state.queueStats.failed = Math.max(0, state.queueStats.failed - 1);
      }
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.queueStats = action.payload.queue ?? null;
        state.approvalStats = action.payload.approvals ?? null;
        state.jobStats = action.payload.jobs ?? null;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch stats';
      });
  },
});

export const { approvalProcessed, jobsSubmitted, falloutRetried, falloutCancelled } = statsSlice.actions;

export const selectQueueStats = (state: RootState) => state.stats.queueStats;
export const selectApprovalStats = (state: RootState) => state.stats.approvalStats;
export const selectJobStats = (state: RootState) => state.stats.jobStats;

export default statsSlice.reducer;
