import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { ApprovalItem } from '../../services/api/generated/models/ApprovalItem';
import { approvalProcessed } from './statsSlice';

interface ApprovalsState {
  approvals: ApprovalItem[];
  stats: { pendingCount: number } | null;
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: ApprovalsState = {
  approvals: [],
  stats: null,
  nextCursor: null,
  loading: false,
  loadingMore: false,
  error: null,
  successMessage: null,
};

export const fetchApprovals = createAsyncThunk<
  {
    approvalsRes: Awaited<ReturnType<typeof apiClient.fetchPendingApprovals>>;
    statsRes: Awaited<ReturnType<typeof apiClient.fetchApprovalStats>> | null;
    append: boolean;
  },
  { append?: boolean } | undefined,
  { state: { approvals: ApprovalsState } }
>(
  'approvals/fetch',
  async (arg = {}, { getState }) => {
    const append = arg.append ?? false;
    const cursor = append ? (getState().approvals.nextCursor ?? undefined) : undefined;
    const [approvalsRes, statsRes] = await Promise.all([
      apiClient.fetchPendingApprovals(50, cursor),
      // Only fetch stats on first page load, not on pagination
      append ? Promise.resolve(null) : apiClient.fetchApprovalStats(),
    ]);
    return { approvalsRes, statsRes, append };
  },
);

export const processApprovalDecision = createAsyncThunk(
  'approvals/processDecision',
  async ({ stepId, decision }: { stepId: string; decision: string }, { dispatch }) => {
    const response = await apiClient.processApprovalDecision(stepId, decision);
    dispatch(approvalProcessed());
    return {
      stepId,
      message: (response as any).message ?? `Decision "${decision}" processed successfully`,
    };
  },
);

const approvalsSlice = createSlice({
  name: 'approvals',
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
      .addCase(fetchApprovals.pending, (state, action) => {
        if (action.meta.arg?.append) {
          state.loadingMore = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchApprovals.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        const { approvalsRes, statsRes, append } = action.payload;
        if (append) {
          state.approvals = [...state.approvals, ...approvalsRes.items];
        } else {
          state.approvals = approvalsRes.items;
        }
        state.nextCursor = approvalsRes.nextCursor;
        if (statsRes) {
          state.stats = statsRes as any;
        }
      })
      .addCase(fetchApprovals.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.error.message ?? 'Failed to fetch approvals';
      })
      .addCase(processApprovalDecision.fulfilled, (state, action) => {
        state.approvals = state.approvals.filter((a) => a.stepId !== action.payload.stepId);
        state.successMessage = action.payload.message;
      });
    // processApprovalDecision.rejected is handled by the component via .unwrap()
  },
});

export const { clearSuccessMessage, clearError } = approvalsSlice.actions;
export default approvalsSlice.reducer;
