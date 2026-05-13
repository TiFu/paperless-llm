import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Chip,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TableHead,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apiClient } from '../services/api';
import { JobResponse, JobState, Document, JobStep, AuditLogEntry } from '../types/api';
import { JobStepsTimeline } from '../components/JobStepsTimeline';
import { AuditLogTimeline } from '../components/AuditLogTimeline';

export const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobResponse | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [steps, setSteps] = useState<JobStep[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isTerminalState = (state: JobState) => {
    return [JobState.COMPLETED, JobState.FAILED, JobState.REJECTED].includes(state);
  };

  const fetchJobDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const jobData = await apiClient.fetchJobById(id);
      setJob(jobData);

      // Fetch job steps
      try {
        const stepsData = await apiClient.fetchJobSteps(id);
        setSteps(stepsData.steps);
      } catch (stepsErr) {
        console.error('Failed to fetch steps:', stepsErr);
      }

      // Fetch audit log
      try {
        const auditData = await apiClient.fetchJobAuditLog(id);
        setAuditLog(auditData.auditLog);
      } catch (auditErr) {
        console.error('Failed to fetch audit log:', auditErr);
      }

      // Fetch document details
      try {
        const docsResponse = await apiClient.fetchDocumentsByTag('llm-process');
        const doc = docsResponse.documents.find((d) => d.id === jobData.documentId);
        if (doc) {
          setDocument(doc);
        }
      } catch (docErr) {
        // Don't fail the whole page if document fetch fails
        console.error('Failed to fetch document:', docErr);
      }

      // Stop auto-refresh if job is in terminal state
      if (isTerminalState(jobData.status)) {
        setAutoRefresh(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job details');
      setAutoRefresh(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  useEffect(() => {
    if (!autoRefresh || !job) return;

    const interval = setInterval(() => {
      fetchJobDetails();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, job]);

  const getStatusColor = (state: JobState) => {
    switch (state) {
      case JobState.PENDING:
        return 'default';
      case JobState.LLM_PROCESSING:
      case JobState.UPDATING_DOCUMENT:
        return 'info';
      case JobState.PENDING_APPROVAL:
        return 'warning';
      case JobState.COMPLETED:
        return 'success';
      case JobState.FAILED:
      case JobState.REJECTED:
        return 'error';
      default:
        return 'default';
    }
  };

  const formatJobState = (state: string) => {
    return state.replace(/_/g, ' ').toUpperCase();
  };

  if (loading && !job) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading job details...
        </Typography>
      </Container>
    );
  }

  if (error && !job) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Job not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Job Details
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {autoRefresh && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Auto-refreshing...
              </Typography>
            </Box>
          )}
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchJobDetails}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Job Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Job Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Job ID</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{job.id}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Document ID</TableCell>
                    <TableCell>{job.documentId}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Job Type</TableCell>
                    <TableCell>
                      <Chip label={job.jobType} size="small" variant="outlined" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell>
                      <Chip
                        label={formatJobState(job.status)}
                        color={getStatusColor(job.status)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Created At</TableCell>
                    <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Updated At</TableCell>
                    <TableCell>{new Date(job.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                  {job.completedAt && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Completed At</TableCell>
                      <TableCell>{new Date(job.completedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                  {job.errorMessage && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Error</TableCell>
                      <TableCell>
                        <Alert severity="error" sx={{ py: 0.5 }}>
                          {job.errorMessage}
                        </Alert>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Document Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Document Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {document ? (
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                      <TableCell>{document.title || '(No title)'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Tags</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {(document.tags ?? []).map((tag) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                    {document.createdDate && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                        <TableCell>{new Date(document.createdDate).toLocaleString()}</TableCell>
                      </TableRow>
                    )}
                    {document.modifiedDate && (
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Modified</TableCell>
                        <TableCell>{new Date(document.modifiedDate).toLocaleString()}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Content Preview</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxHeight: 150,
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            bgcolor: 'grey.50',
                            p: 1,
                            borderRadius: 1,
                          }}
                        >
                          {document.content.substring(0, 500)}
                          {document.content.length > 500 && '...'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Document information not available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Workflow Steps */}
        <Grid item xs={12}>
          <JobStepsTimeline steps={steps} />
        </Grid>

        {/* Document Actions */}
        {job.documentActions && job.documentActions.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Document Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Action Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Old Value</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>New Value</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {job.documentActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <Chip label={action.actionType} size="small" />
                        </TableCell>
                        <TableCell>{action.oldValue || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 'medium' }}>
                          {action.newValue || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(action.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {/* Audit Log */}
        <Grid item xs={12}>
          <AuditLogTimeline entries={auditLog} />
        </Grid>
      </Grid>
    </Container>
  );
};
