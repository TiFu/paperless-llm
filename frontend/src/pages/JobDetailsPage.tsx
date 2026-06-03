import React, { useEffect } from 'react';
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
import { JobState } from '../services/api/generated/models/JobState';
import { JobStepsTimeline } from '../components/JobStepsTimeline';
import { AuditLogTimeline } from '../components/AuditLogTimeline';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchJobDetails,
  clearJobDetails,
  setAutoRefresh,
} from '../store/slices/jobsSlice';

export const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const job = useAppSelector((state) => state.jobs.detail.job);
  const steps = useAppSelector((state) => state.jobs.detail.steps);
  const auditLog = useAppSelector((state) => state.jobs.detail.auditLog);
  const loading = useAppSelector((state) => state.jobs.detail.loading);
  const error = useAppSelector((state) => state.jobs.detail.error);
  const autoRefresh = useAppSelector((state) => state.jobs.detail.autoRefresh);

  const document = job?.document ?? null;

  useEffect(() => {
    if (id) {
      dispatch(fetchJobDetails(id));
    }
    return () => {
      dispatch(clearJobDetails());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (!autoRefresh || !job || !id) return;

    const interval = setInterval(() => {
      dispatch(fetchJobDetails(id));
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, job, id, dispatch]);

  const getStatusColor = (state: JobState) => {
    switch (state) {
      case JobState.pending:
        return 'default';
      case JobState.llm_processing:
      case JobState.updating_document:
        return 'info';
      case JobState.pending_approval:
        return 'warning';
      case JobState.completed:
        return 'success';
      case JobState.failed:
      case JobState.rejected:
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading && !job) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
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
            onClick={() => id && dispatch(fetchJobDetails(id))}
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
                        label={job.status}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}
        {/* Workflow Steps */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Workflow Steps
            </Typography>  
            <JobStepsTimeline showStepsAsActive={true} steps={steps} />
          </Paper>
        </Grid>

        {/* Audit Log */}
        <Grid item xs={12}>
          <AuditLogTimeline entries={auditLog} />
        </Grid>
      </Grid>
    </Container>
  );
};

