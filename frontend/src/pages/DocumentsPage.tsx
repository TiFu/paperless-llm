import React, { useState, useEffect } from 'react';
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
  Paper,
  Divider,
  Link,
} from '@mui/material';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { DocumentList } from '../components/DocumentList';
import { apiClient } from '../services/api';
import { Document, WorkflowType, BatchJobResponse } from '../types/api';

const DEFAULT_TAG = 'llm-process';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableJobTypes, setAvailableJobTypes] = useState<WorkflowType[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>(WorkflowType.AUTOMATED);
  const [submissionResult, setSubmissionResult] = useState<BatchJobResponse | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const docs = await apiClient.fetchDocumentsByTag(DEFAULT_TAG);
      setDocuments(docs);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to fetch documents',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobTypes = async () => {
    try {
      const types = await apiClient.fetchJobTypes();
      setAvailableJobTypes(types);
      if (types.length > 0) {
        setSelectedWorkflow(types[0]);
      }
    } catch (error) {
      console.error('Failed to fetch job types:', error);
      // Set default workflow types if API call fails
      setAvailableJobTypes([WorkflowType.AUTOMATED, WorkflowType.APPROVAL]);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchJobTypes();
  }, []);

  const handleSubmitJobs = async () => {
    if (selectedIds.length === 0) return;

    setSubmitting(true);
    setSubmissionResult(null);
    try {
      const result = await apiClient.submitJobs({
        documents: selectedIds.map((documentId) => ({
          documentId,
          jobTypes: [selectedWorkflow],
          requiresApproval: selectedWorkflow === WorkflowType.APPROVAL,
        })),
      });

      setSubmissionResult(result);
      setSnackbar({
        open: true,
        message: `Successfully submitted ${result.submitted} job(s) for ${selectedWorkflow} workflow`,
        severity: 'success',
      });

      // Clear selection and refresh documents
      setSelectedIds([]);
      await fetchDocuments();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to submit jobs',
        severity: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getWorkflowLabel = (workflow: WorkflowType) => {
    switch (workflow) {
      case WorkflowType.APPROVAL:
        return 'Approval Workflow';
      case WorkflowType.AUTOMATED:
        return 'Automated Workflow';
      default:
        return workflow;
    }
  };

  const getWorkflowDescription = (workflow: WorkflowType) => {
    switch (workflow) {
      case WorkflowType.APPROVAL:
        return 'Requires manual approval before applying changes to documents';
      case WorkflowType.AUTOMATED:
        return 'Automatically applies changes without manual approval';
      default:
        return '';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Documents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select documents and choose a workflow to process them.
        </Typography>
      </Box>

      {/* Workflow Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Workflow Selection
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <FormControl component="fieldset">
          <FormLabel component="legend">Choose Workflow Type</FormLabel>
          <RadioGroup
            value={selectedWorkflow}
            onChange={(e) => setSelectedWorkflow(e.target.value as WorkflowType)}
          >
            {availableJobTypes.map((workflow) => (
              <FormControlLabel
                key={workflow}
                value={workflow}
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {getWorkflowLabel(workflow)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getWorkflowDescription(workflow)}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </FormControl>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={submitting ? <CircularProgress size={16} /> : <PlayArrowIcon />}
            onClick={handleSubmitJobs}
            disabled={selectedIds.length === 0 || submitting}
            size="large"
          >
            {submitting
              ? 'Submitting...'
              : `Submit ${selectedIds.length} Document${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </Box>
      </Paper>

      {/* Submission Result */}
      {submissionResult && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Successfully created {submissionResult.submitted} job(s):
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            {submissionResult.jobs.map((job) => (
              <li key={job.jobId}>
                Document {job.documentId} - {job.jobType}:{' '}
                <Link component={RouterLink} to={`/jobs/${job.jobId}`}>
                  View Job
                </Link>
              </li>
            ))}
          </Box>
        </Alert>
      )}

      {/* Documents List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Available Documents
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing documents tagged with "{DEFAULT_TAG}"
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <DocumentList
            documents={documents}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
