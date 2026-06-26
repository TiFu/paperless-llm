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
import { WorkerType } from '../services/api/generated/models/WorkerType';
import { WorkerExecutionStatus } from '../services/api/generated/models/WorkerExecutionStatus';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchWorkerExecutions,
  setWorkerTypeFilter,
  setStatusFilter,
  selectHasRunningExecutions,
} from '../store/slices/workerExecutionsSlice';

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

const getStatusColor = (status: WorkerExecutionStatus): 'default' | 'info' | 'success' | 'error' => {
  switch (status) {
    case WorkerExecutionStatus.running:
      return 'info';
    case WorkerExecutionStatus.succeeded:
      return 'success';
    case WorkerExecutionStatus.failed:
      return 'error';
    default:
      return 'default';
  }
};

export const WorkerExecutionsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const executions = useAppSelector((state) => state.workerExecutions.list.executions);
  const nextCursor = useAppSelector((state) => state.workerExecutions.list.nextCursor);
  const workerTypeFilter = useAppSelector((state) => state.workerExecutions.list.workerTypeFilter);
  const statusFilter = useAppSelector((state) => state.workerExecutions.list.statusFilter);
  const loading = useAppSelector((state) => state.workerExecutions.list.loading);
  const error = useAppSelector((state) => state.workerExecutions.list.error);
  const hasLoadedMore = useAppSelector((state) => state.workerExecutions.list.hasLoadedMore);
  const hasRunningExecutions = useAppSelector(selectHasRunningExecutions);

  useEffect(() => {
    dispatch(fetchWorkerExecutions({ workerType: workerTypeFilter, status: statusFilter }));
  }, [workerTypeFilter, statusFilter, dispatch]);

  useEffect(() => {
    if (hasRunningExecutions && !hasLoadedMore) {
      const interval = setInterval(() => {
        dispatch(fetchWorkerExecutions({ workerType: workerTypeFilter, status: statusFilter }));
      }, AUTO_REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [hasRunningExecutions, hasLoadedMore, workerTypeFilter, statusFilter, dispatch]);

  const handleLoadMore = () => {
    if (nextCursor) {
      dispatch(fetchWorkerExecutions({ cursor: nextCursor, append: true, workerType: workerTypeFilter, status: statusFilter }));
    }
  };

  const handleRowClick = (id: string) => {
    navigate(`/workers/${id}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Worker Executions
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Observe background worker loop runs (step processing, stuck-step reset, entity sync, document auto-queue).
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel>Worker Type</InputLabel>
          <Select
            value={workerTypeFilter}
            label="Worker Type"
            onChange={(e) => dispatch(setWorkerTypeFilter(e.target.value as WorkerType | ''))}
          >
            <MenuItem value="">All Worker Types</MenuItem>
            {Object.values(WorkerType).map((type) => (
              <MenuItem key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => dispatch(setStatusFilter(e.target.value as WorkerExecutionStatus | ''))}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {Object.values(WorkerExecutionStatus).map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          onClick={() => dispatch(fetchWorkerExecutions({ workerType: workerTypeFilter, status: statusFilter }))}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {loading && executions.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Execution ID</TableCell>
                  <TableCell>Worker Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Result</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Finished</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {executions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No worker executions found
                    </TableCell>
                  </TableRow>
                ) : (
                  executions.map((execution) => (
                    <TableRow
                      key={execution.id}
                      hover
                      onClick={() => handleRowClick(execution.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{execution.id.substring(0, 8)}...</TableCell>
                      <TableCell>{execution.workerType.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Chip label={execution.status} color={getStatusColor(execution.status)} size="small" />
                      </TableCell>
                      <TableCell>
                        {execution.result ? (
                          <code style={{ fontSize: '0.8em' }}>{JSON.stringify(execution.result)}</code>
                        ) : (
                          <em>–</em>
                        )}
                      </TableCell>
                      <TableCell>{new Date(execution.startedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {execution.finishedAt ? new Date(execution.finishedAt).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {nextCursor && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button variant="contained" onClick={handleLoadMore} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Load More'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};
