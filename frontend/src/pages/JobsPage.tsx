import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { JobState } from '../services/api/generated/models/JobState';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchJobs,
  setStateFilter,
  selectHasActiveJobs,
  TERMINAL_STATES,
} from '../store/slices/jobsSlice';

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

const getStatusColor = (status: JobState): 'default' | 'info' | 'warning' | 'success' | 'error' => {
  switch (status) {
    case JobState.pending:
    case JobState.llm_processing:
    case JobState.updating_document:
      return 'info';
    case JobState.pending_approval:
      return 'warning';
    case JobState.completed:
      return 'success';
    case JobState.rejected:
      return 'error';
    case JobState.failed:
      return 'error';
    default:
      return 'default';
  }
};

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const jobs = useAppSelector((state) => state.jobs.list.jobs);
  const nextCursor = useAppSelector((state) => state.jobs.list.nextCursor);
  const stateFilter = useAppSelector((state) => state.jobs.list.stateFilter);
  const loading = useAppSelector((state) => state.jobs.list.loading);
  const error = useAppSelector((state) => state.jobs.list.error);
  const hasLoadedMore = useAppSelector((state) => state.jobs.list.hasLoadedMore);
  const hasActiveJobs = useAppSelector(selectHasActiveJobs);

  // Initial load + reload when filter changes
  useEffect(() => {
    dispatch(fetchJobs({ stateFilter }));
  }, [stateFilter, dispatch]);

  // Auto-refresh when there are active jobs and user hasn't paginated
  useEffect(() => {
    if (hasActiveJobs && !hasLoadedMore) {
      const interval = setInterval(() => {
        dispatch(fetchJobs({ stateFilter }));
      }, AUTO_REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [hasActiveJobs, hasLoadedMore, stateFilter, dispatch]);

  const handleLoadMore = () => {
    if (nextCursor) {
      dispatch(fetchJobs({ cursor: nextCursor, append: true, stateFilter }));
    }
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Jobs
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track and monitor document processing jobs.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by State</InputLabel>
            <Select
              value={stateFilter}
              label="Filter by State"
              onChange={(e) => dispatch(setStateFilter(e.target.value as JobState | ''))}
            >
              <MenuItem value="">All States</MenuItem>
              {Object.values(JobState).map((state) => (
                <MenuItem key={state} value={state}>
                  {state.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        <Button variant="outlined" onClick={() => dispatch(fetchJobs({ stateFilter }))} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {loading && jobs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Document ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Correspondent</TableCell>
                    <TableCell>Job Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell>Completed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No jobs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map((job) => (
                      <TableRow
                        key={job.id}
                        hover
                        onClick={() => handleJobClick(job.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{job.id.substring(0, 8)}...</TableCell>
                        <TableCell>{job.documentId}</TableCell>
                        <TableCell>{job.document?.title ?? <em>–</em>}</TableCell>
                        <TableCell><em>–</em></TableCell>
                        <TableCell>{job.jobType.replace(/_/g, ' ')}</TableCell>
                        <TableCell>
                          <Chip
                            label={job.status.replace(/_/g, ' ')}
                            color={getStatusColor(job.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(job.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {new Date(job.updatedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {job.completedAt
                            ? new Date(job.completedAt).toLocaleString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {nextCursor && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Load More'}
                </Button>
              </Box>
            )}
          </>
        )}
    </Container>
  );
};

