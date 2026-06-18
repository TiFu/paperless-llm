import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
  Link,
  Checkbox,
} from '@mui/material';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { DocumentList } from '../components/DocumentList';
import { apiClient } from '../services/api/api';
import { DocumentListItem } from '../services/api/generated/models/DocumentListItem';
import { WorkflowType } from '../services/api/generated/models/WorkflowType';
import { BatchJobRequestDocumentsInnerFieldsEnum } from '@/services/api/generated';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchDocuments,
  fetchJobTypes,
  fetchDocumentFields,
  submitJobs,
  setSelectedIds,
  setSelectedWorkflow,
  setSelectedFields,
  closeSnackbar,
  setHideInProgress,
  setRestoredDocuments,
} from '../store/slices/documentsSlice';

const DEFAULT_TAG = 'llm-process';
const PAGE_LIMIT = 10;

export const DocumentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  const documents = useAppSelector((state) => state.documents.documents);
  const selectedIds = useAppSelector((state) => state.documents.selectedIds);
  const loading = useAppSelector((state) => state.documents.loading);
  const loadingMore = useAppSelector((state) => state.documents.loadingMore);
  const nextCursor = useAppSelector((state) => state.documents.nextCursor);
  const submitting = useAppSelector((state) => state.documents.submitting);
  const availableJobTypes = useAppSelector((state) => state.documents.availableJobTypes);
  const selectedWorkflow = useAppSelector((state) => state.documents.selectedWorkflow);
  const submissionResult = useAppSelector((state) => state.documents.submissionResult);
  const availableFields = useAppSelector((state) => state.documents.availableFields);
  const selectedFields = useAppSelector((state) => state.documents.selectedFields);
  const snackbar = useAppSelector((state) => state.documents.snackbar);
  const hideInProgress = useAppSelector((state) => state.documents.hideInProgress);

  const visibleDocuments = hideInProgress ? documents.filter((d) => !d.inProgress) : documents;

  // Sync nextCursor to URL after successful fetch
  useEffect(() => {
    if (nextCursor) {
      setSearchParams({ cursor: nextCursor }, { replace: true });
    } else if (documents.length > 0) {
      setSearchParams({}, { replace: true });
    }
  }, [nextCursor, documents.length, setSearchParams]);

  useEffect(() => {
    const urlCursor = searchParams.get('cursor');
    if (urlCursor) {
      restorePaginationState(urlCursor);
    } else {
      dispatch(fetchDocuments());
    }
    dispatch(fetchJobTypes());
    dispatch(fetchDocumentFields());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restorePaginationState = async (targetCursor: string) => {
    // Temporarily mark loading in store by dispatching a pending signal
    const allDocs: DocumentListItem[] = [];
    let currentCursor: string | undefined = undefined;

    try {
      while (true) {
        const response = await apiClient.fetchDocumentsByTag(DEFAULT_TAG, PAGE_LIMIT, currentCursor);
        allDocs.push(...response.documents);

        if (response.pagination.nextCursor === targetCursor || !response.pagination.nextCursor) {
          dispatch(
            setRestoredDocuments({
              documents: allDocs,
              nextCursor: response.pagination.nextCursor ?? null,
            }),
          );
          break;
        }
        currentCursor = response.pagination.nextCursor;
      }
    } catch {
      // Fall back to initial load
      dispatch(fetchDocuments());
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      dispatch(fetchDocuments({ append: true }));
    }
  };

  const handleSubmitJobs = () => {
    if (selectedIds.length === 0) return;
    const docs = selectedIds.map((documentId) => ({
      documentId,
      jobType: selectedWorkflow,
      fields: selectedFields as BatchJobRequestDocumentsInnerFieldsEnum[],
    }));
    dispatch(submitJobs(docs));
  };

  const getWorkflowLabel = (workflow: WorkflowType) => {
    switch (workflow) {
      case WorkflowType.approval:
        return 'Approval Workflow';
      case WorkflowType.automated:
        return 'Automated Workflow';
      default:
        return workflow;
    }
  };

  const getWorkflowDescription = (workflow: WorkflowType) => {
    switch (workflow) {
      case WorkflowType.approval:
        return 'Requires manual approval before applying changes to documents';
      case WorkflowType.automated:
        return 'Automatically applies changes without manual approval';
      default:
        return '';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Documents
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select documents and choose a workflow to process them.
      </Typography>

      {/* Workflow Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Workflow Selection
          </Typography>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Choose Workflow Type</FormLabel>
            <RadioGroup
              value={selectedWorkflow}
              onChange={(e) => dispatch(setSelectedWorkflow(e.target.value as WorkflowType))}
            >
              {availableJobTypes.map((workflow) => (
                <FormControlLabel
                  key={workflow}
                  value={workflow}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {getWorkflowLabel(workflow as WorkflowType)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getWorkflowDescription(workflow as WorkflowType)}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
          {/* Fields Selection */}
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Select Fields</FormLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {availableFields.map((field) => (
                <FormControlLabel
                  key={field}
                  control={
                    <Checkbox
                      checked={selectedFields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          dispatch(setSelectedFields([...selectedFields, field]));
                        } else {
                          dispatch(setSelectedFields(selectedFields.filter((f) => f !== field)));
                        }
                      }}
                    />
                  }
                  label={field}
                />
              ))}
            </Box>
          </FormControl>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={submitting ? <CircularProgress size={16} /> : <PlayArrowIcon />}
              onClick={handleSubmitJobs}
              disabled={selectedIds.length === 0 || submitting || selectedFields.length === 0}
              size="large"
            >
              {submitting
                ? 'Submitting...'
                : `Submit ${selectedIds.length} Document${selectedIds.length !== 1 ? 's' : ''}`}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Submission Result */}
      {submissionResult && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Successfully created {submissionResult.submitted} job(s):
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            {submissionResult.jobs.map((job: { documentId: number; jobType: string; id: string }) => (
              <li key={job.id}>
                Document {job.documentId} - {job.jobType}:{' '}
                <Link component={RouterLink} to={`/jobs/${job.id}`}>
                  View Job
                </Link>
              </li>
            ))}
          </Box>
        </Alert>
      )}

      {/* Documents List */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Available Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing documents tagged with "{DEFAULT_TAG}"
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={hideInProgress}
                onChange={(e) => dispatch(setHideInProgress(e.target.checked))}
              />
            }
            label="Hide in-progress documents"
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DocumentList
            documents={visibleDocuments}
            selectedIds={selectedIds}
            onSelectionChange={(ids) => dispatch(setSelectedIds(ids))}
            onLoadMore={nextCursor ? handleLoadMore : undefined}
            loadingMore={loadingMore}
          />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => dispatch(closeSnackbar())}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => dispatch(closeSnackbar())} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

