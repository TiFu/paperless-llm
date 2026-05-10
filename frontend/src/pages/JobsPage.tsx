import React, { useState, useEffect } from 'react';
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
import { apiClient } from '../services/api';
import { JobResponse, JobState, JobStats } from '../types/api';

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

const getStatusColor = (status: JobState): 'default' | 'info' | 'warning' | 'success' | 'error' => {
  switch (status) {
    case JobState.PENDING:
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

const isTerminalState = (status: JobState): boolean => {
  return [JobState.COMPLETED, JobState.FAILED, JobState.REJECTED].includes(status);
};

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<JobState | ''>('');

  const fetchJobs = async (cursor?: string, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const [jobsResponse, statsResponse] = await Promise.all([
        apiClient.fetchJobs(20, cursor, stateFilter || undefined),
        cursor ? Promise.resolve(stats) : apiClient.fetchJobStats(),
      ]);

      if (append) {
        setJobs((prev) => [...prev, ...jobsResponse.jobs]);
      } else {
        setJobs(jobsResponse.jobs);
      }
      setNextCursor(jobsResponse.nextCursor);
      
      if (!cursor && statsResponse) {
        setStats(statsResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [stateFilter]);

  useEffect(() => {
    // Auto-refresh if there are non-terminal jobs
    const hasActiveJobs = jobs.some((job) => !isTerminalState(job.status));
    
    if (hasActiveJobs) {
      const interval = setInterval(() => {
        fetchJobs();
      }, AUTO_REFRESH_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [jobs]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchJobs(nextCursor, true);
    }
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Jobs
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by State</InputLabel>
            <Select
              value={stateFilter}
              label="Filter by State"
              onChange={(e) => setStateFilter(e.target.value as JobState | '')}
            >
              <MenuItem value="">All States</MenuItem>
              {Object.values(JobState).map((state) => (
                <MenuItem key={state} value={state}>
                  {state.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => fetchJobs()} disabled={loading}>
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
      </Box>
    </Container>
  );
};
