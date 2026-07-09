import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
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
import { WorkerExecutionStatus } from '../services/api/generated/models/WorkerExecutionStatus';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchWorkerExecutionDetails,
  clearWorkerExecutionDetails,
} from '../store/slices/workerExecutionsSlice';

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

const getOutcomeColor = (outcome: string): 'default' | 'success' | 'error' | 'warning' => {
  if (outcome === 'success' || outcome === 'created' || outcome === 'retrying' || outcome === 'joined') return 'success';
  if (outcome === 'failed' || outcome === 'fallout') return 'error';
  if (outcome === 'skipped') return 'warning';
  return 'default';
};

export const WorkerExecutionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const execution = useAppSelector((state) => state.workerExecutions.detail.execution);
  const items = useAppSelector((state) => state.workerExecutions.detail.items);
  const loading = useAppSelector((state) => state.workerExecutions.detail.loading);
  const error = useAppSelector((state) => state.workerExecutions.detail.error);
  const autoRefresh = useAppSelector((state) => state.workerExecutions.detail.autoRefresh);

  useEffect(() => {
    if (id) {
      dispatch(fetchWorkerExecutionDetails(id));
    }
    return () => {
      dispatch(clearWorkerExecutionDetails());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (!autoRefresh || !execution || !id) return;

    const interval = setInterval(() => {
      dispatch(fetchWorkerExecutionDetails(id));
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, execution, id, dispatch]);

  if (loading && !execution) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !execution) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  if (!execution) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Worker execution not found</Alert>
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
            Worker Execution Details
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
            onClick={() => id && dispatch(fetchWorkerExecutionDetails(id))}
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

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Execution Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell variant="head">ID</TableCell>
                <TableCell>{execution.id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell variant="head">Worker Type</TableCell>
                <TableCell>{execution.workerType.replace(/_/g, ' ')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell variant="head">Status</TableCell>
                <TableCell>
                  <Chip label={execution.status} color={getStatusColor(execution.status)} size="small" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell variant="head">Started</TableCell>
                <TableCell>{new Date(execution.startedAt).toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell variant="head">Finished</TableCell>
                <TableCell>
                  {execution.finishedAt ? new Date(execution.finishedAt).toLocaleString() : '-'}
                </TableCell>
              </TableRow>
              {execution.result && (
                <TableRow>
                  <TableCell variant="head">Result</TableCell>
                  <TableCell>
                    <code>{JSON.stringify(execution.result)}</code>
                  </TableCell>
                </TableRow>
              )}
              {execution.errorMessage && (
                <TableRow>
                  <TableCell variant="head">Error</TableCell>
                  <TableCell>
                    <Alert severity="error" sx={{ py: 0 }}>
                      {execution.errorMessage}
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Items ({items.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item Type</TableCell>
                <TableCell>Item ID</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Finished</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No items recorded for this execution
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => (
                  <TableRow key={`${item.itemType}-${item.itemId}-${idx}`}>
                    <TableCell>{item.itemType}</TableCell>
                    <TableCell>{item.itemId}</TableCell>
                    <TableCell>
                      <Chip label={item.outcome} color={getOutcomeColor(item.outcome)} size="small" />
                    </TableCell>
                    <TableCell>{new Date(item.startedAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(item.finishedAt).toLocaleString()}</TableCell>
                    <TableCell>{item.errorMessage ?? '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};
