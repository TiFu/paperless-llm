import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api/api';
import { DocumentListItem } from '../../services/api/generated/models/DocumentListItem';
import { WorkflowType } from '../../services/api/generated/models/WorkflowType';
import { JobSubmissionResponse } from '../../services/api/generated/models/JobSubmissionResponse';
import { BatchJobRequestDocumentsInnerFieldsEnum } from '../../services/api/generated';
import { jobsSubmitted } from './statsSlice';

const PAGE_LIMIT = 10;

interface Snackbar {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

interface DocumentsState {
  documents: DocumentListItem[];
  selectedIds: number[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  submitting: boolean;
  availableJobTypes: string[];
  selectedWorkflow: WorkflowType;
  submissionResult: JobSubmissionResponse | null;
  availableFields: string[];
  selectedFields: string[];
  snackbar: Snackbar;
  hideInProgress: boolean;
}

const DEFAULT_FIELDS = ['title', 'tags', 'correspondent', 'document_type', 'created_date'];

const initialState: DocumentsState = {
  documents: [],
  selectedIds: [],
  nextCursor: null,
  loading: false,
  loadingMore: false,
  submitting: false,
  availableJobTypes: [],
  selectedWorkflow: WorkflowType.automated,
  submissionResult: null,
  availableFields: DEFAULT_FIELDS,
  selectedFields: DEFAULT_FIELDS,
  snackbar: { open: false, message: '', severity: 'success' },
  hideInProgress: true,
};

export const fetchDocuments = createAsyncThunk<
  { response: Awaited<ReturnType<typeof apiClient.fetchDocumentsByTag>>; append: boolean },
  { tag: string; append?: boolean },
  { state: { documents: DocumentsState } }
>(
  'documents/fetch',
  async ({ tag, append = false }, { getState }) => {
    const cursor = append ? (getState().documents.nextCursor ?? undefined) : undefined;
    const response = await apiClient.fetchDocumentsByTag(tag, PAGE_LIMIT, cursor);
    return { response, append };
  },
);

export const fetchJobTypes = createAsyncThunk('documents/fetchJobTypes', async () => {
  return await apiClient.fetchJobTypes();
});

export const fetchDocumentFields = createAsyncThunk('documents/fetchFields', async () => {
  return await apiClient.fetchDocumentFields();
});

export const submitJobs = createAsyncThunk(
  'documents/submitJobs',
  async (
    documents: Array<{
      documentId: number;
      jobType: WorkflowType;
      fields: BatchJobRequestDocumentsInnerFieldsEnum[];
    }>,
    { dispatch },
  ) => {
    const result = await apiClient.submitJobs(documents);
    dispatch(jobsSubmitted(result.submitted));
    return result;
  },
);

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setSelectedIds(state, action: PayloadAction<number[]>) {
      state.selectedIds = action.payload;
    },
    setSelectedWorkflow(state, action: PayloadAction<WorkflowType>) {
      state.selectedWorkflow = action.payload;
    },
    setSelectedFields(state, action: PayloadAction<string[]>) {
      state.selectedFields = action.payload;
    },
    closeSnackbar(state) {
      state.snackbar.open = false;
    },
    setHideInProgress(state, action: PayloadAction<boolean>) {
      state.hideInProgress = action.payload;
    },
    setRestoredDocuments(
      state,
      action: PayloadAction<{ documents: DocumentListItem[]; nextCursor: string | null }>,
    ) {
      state.documents = action.payload.documents;
      state.nextCursor = action.payload.nextCursor;
      state.loading = false;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchDocuments.pending, (state, action) => {
        if (action.meta.arg?.append) {
          state.loadingMore = true;
        } else {
          state.loading = true;
        }
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        const { response, append } = action.payload;
        if (append) {
          state.documents = [...state.documents, ...response.documents];
        } else {
          state.documents = response.documents;
        }
        state.nextCursor = response.pagination.nextCursor ?? null;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.snackbar = {
          open: true,
          message: action.error.message ?? 'Failed to fetch documents',
          severity: 'error',
        };
      })
      .addCase(fetchJobTypes.fulfilled, (state, action) => {
        state.availableJobTypes = action.payload;
        if (action.payload.length > 0) {
          state.selectedWorkflow = action.payload[0] as WorkflowType;
        }
      })
      .addCase(fetchDocumentFields.fulfilled, (state, action) => {
        state.availableFields = action.payload;
        state.selectedFields = action.payload;
      })
      .addCase(submitJobs.pending, (state) => {
        state.submitting = true;
        state.submissionResult = null;
      })
      .addCase(submitJobs.fulfilled, (state, action) => {
        state.submitting = false;
        state.submissionResult = action.payload;
        const submittedIds = new Set(action.meta.arg.map((d) => d.documentId));
        state.documents = state.documents.filter((d) => !submittedIds.has(d.id));
        state.selectedIds = [];
        state.snackbar = {
          open: true,
          message: `Successfully submitted ${action.payload.submitted} job(s) for ${state.selectedWorkflow} workflow`,
          severity: 'success',
        };
      })
      .addCase(submitJobs.rejected, (state, action) => {
        state.submitting = false;
        state.snackbar = {
          open: true,
          message: action.error.message ?? 'Failed to submit jobs',
          severity: 'error',
        };
      });
  },
});

export const {
  setSelectedIds,
  setSelectedWorkflow,
  setSelectedFields,
  closeSnackbar,
  setHideInProgress,
  setRestoredDocuments,
} = documentsSlice.actions;
export default documentsSlice.reducer;
