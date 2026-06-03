import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { JobResponse } from '../../services/api/generated/models/JobResponse';
import { JobState } from '../../services/api/generated/models/JobState';
import { JobStep } from '../../services/api/generated/models/JobStep';
import { AuditLogEntry } from '../../services/api/generated/models/AuditLogEntry';
import type { RootState } from '../store';

export const TERMINAL_STATES = [JobState.completed, JobState.failed, JobState.rejected];

interface JobListState {
  jobs: JobResponse[];
  nextCursor: string | null;
  stateFilter: JobState | '';
  loading: boolean;
  error: string | null;
  hasLoadedMore: boolean;
}

interface JobDetailState {
  job: JobResponse | null;
  steps: JobStep[];
  auditLog: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  autoRefresh: boolean;
}

interface JobsState {
  list: JobListState;
  detail: JobDetailState;
}

const initialState: JobsState = {
  list: {
    jobs: [],
    nextCursor: null,
    stateFilter: '',
    loading: false,
    error: null,
    hasLoadedMore: false,
  },
  detail: {
    job: null,
    steps: [],
    auditLog: [],
    loading: false,
    error: null,
    autoRefresh: true,
  },
};

export const fetchJobs = createAsyncThunk(
  'jobs/fetchList',
  async ({
    cursor,
    append,
    stateFilter,
  }: {
    cursor?: string;
    append?: boolean;
    stateFilter: JobState | '';
  }) => {
    const response = await apiClient.fetchJobs(20, cursor, stateFilter || undefined);
    return { response, append: append ?? false };
  },
);

export const fetchJobDetails = createAsyncThunk('jobs/fetchDetail', async (id: string) => {
  const job = await apiClient.fetchJobById(id);
  const [stepsRes, auditRes] = await Promise.allSettled([
    apiClient.fetchJobSteps(id),
    apiClient.fetchJobAuditLog(id),
  ]);
  return {
    job,
    steps: stepsRes.status === 'fulfilled' ? stepsRes.value.steps : [],
    auditLog: auditRes.status === 'fulfilled' ? auditRes.value.auditLog : [],
  };
});

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setStateFilter(state, action: PayloadAction<JobState | ''>) {
      state.list.stateFilter = action.payload;
      state.list.jobs = [];
      state.list.nextCursor = null;
      state.list.hasLoadedMore = false;
    },
    setAutoRefresh(state, action: PayloadAction<boolean>) {
      state.detail.autoRefresh = action.payload;
    },
    clearJobDetails(state) {
      state.detail = initialState.detail;
    },
  },
  extraReducers(builder) {
    // List
    builder
      .addCase(fetchJobs.pending, (state, action) => {
        if (!action.meta.arg.append) {
          state.list.loading = true;
          state.list.hasLoadedMore = false;
        }
        state.list.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.list.loading = false;
        const { response, append } = action.payload;
        if (append) {
          state.list.jobs = [...state.list.jobs, ...response.jobs];
          state.list.hasLoadedMore = true;
        } else {
          state.list.jobs = response.jobs;
          state.list.hasLoadedMore = false;
        }
        state.list.nextCursor = response.nextCursor;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.list.loading = false;
        state.list.error = action.error.message ?? 'Failed to fetch jobs';
      });

    // Detail
    builder
      .addCase(fetchJobDetails.pending, (state, action) => {
        state.detail.loading = true;
        state.detail.error = null;
        state.detail.autoRefresh = true;
        // Prefill from list to avoid loading flash
        const id = action.meta.arg;
        const existing = state.list.jobs.find((j) => j.id === id);
        if (existing) {
          state.detail.job = existing;
        }
      })
      .addCase(fetchJobDetails.fulfilled, (state, action) => {
        state.detail.loading = false;
        state.detail.job = action.payload.job;
        state.detail.steps = action.payload.steps;
        state.detail.auditLog = action.payload.auditLog;
        if (TERMINAL_STATES.includes(action.payload.job.status)) {
          state.detail.autoRefresh = false;
        }
      })
      .addCase(fetchJobDetails.rejected, (state, action) => {
        state.detail.loading = false;
        state.detail.error = action.error.message ?? 'Failed to fetch job details';
        state.detail.autoRefresh = false;
      });
  },
});

export const { setStateFilter, setAutoRefresh, clearJobDetails } = jobsSlice.actions;

export const selectHasActiveJobs = (state: RootState) =>
  state.jobs.list.jobs.some((job) => !TERMINAL_STATES.includes(job.status));

export const selectIsTerminalJob = (state: RootState) =>
  state.jobs.detail.job ? TERMINAL_STATES.includes(state.jobs.detail.job.status) : false;

export default jobsSlice.reducer;
