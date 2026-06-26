import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Link,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { QueueItem } from '../services/api/generated/models/QueueItem';
import { WorkItemStatus } from '../services/api/generated/models/WorkItemStatus';
import { JobState } from '../services/api/generated/models/JobState';
import { apiClient } from '../services/api/api';

interface AutomatedStepsItemsTableProps {
  items: QueueItem[];
  loading: boolean;
  nextCursor: string | null;
  statusFilter: WorkItemStatus | '';
  onLoadMore: () => void;
  onStatusFilter: (status: WorkItemStatus | '') => void;
  type: 'unified';
}

const getJobStateColor = (state: string): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  switch (state) {
    case JobState.completed: return 'success';
    case JobState.failed:
    case JobState.rejected: return 'error';
    case JobState.pending_approval: return 'warning';
    case JobState.llm_processing:
    case JobState.updating_document:
    case JobState.removing_tags: return 'info';
    default: return 'default';
  }
};

export const AutomatedStepsItemsTable: React.FC<AutomatedStepsItemsTableProps> = ({
  items,
  loading,
  nextCursor,
  statusFilter,
  onLoadMore,
  onStatusFilter,
}) => {
  const [processingStepId, setProcessingStepId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleStatusChange = (event: { target: { value: string } }) => {
    const value = event.target.value as WorkItemStatus | '';
    onStatusFilter(value);
  };

  const handleRetry = async (stepId: string) => {
    setProcessingStepId(stepId);
    setActionError(null);
    setActionSuccess(null);
    
    try {
      const result = await apiClient.retryStep(stepId);
      setActionSuccess(result.message ?? null);
      setTimeout(() => {
        setActionSuccess(null);
        onStatusFilter(statusFilter); // Refresh the list
      }, 2000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to retry step');
    } finally {
      setProcessingStepId(null);
    }
  };

  const handleCancel = async (stepId: string) => {
    setProcessingStepId(stepId);
    setActionError(null);
    setActionSuccess(null);
    
    try {
      const result = await apiClient.cancelStep(stepId);
      setActionSuccess(result.message ?? null);
      setTimeout(() => {
        setActionSuccess(null);
        onStatusFilter(statusFilter); // Refresh the list
      }, 2000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to cancel step');
    } finally {
      setProcessingStepId(null);
    }
  };

  const canRetryOrCancel = (status: WorkItemStatus) => {
    return status === WorkItemStatus.retrying || status === WorkItemStatus.in_fallout;
  };

  const getStatusColor = (status: WorkItemStatus) => {
    switch (status) {
      case WorkItemStatus.pending:
        return 'default';
      case WorkItemStatus.processing:
        return 'info';
      case WorkItemStatus.completed:
        return 'success';
      case WorkItemStatus.failed:
        return 'error';
      case WorkItemStatus.retrying:
        return 'warning';
      case WorkItemStatus.in_fallout:
        return 'error';
      default:
        return 'default';
    }
  };

  const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formatDate = (value: Date | string | null | undefined) => {
    if (!value) return '-';
    return fmt.format(typeof value === 'string' ? new Date(value) : value);
  };

  if (items.length === 0) {
    return (
      <Box>
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select value={statusFilter} label="Status Filter" onChange={handleStatusChange}>
              <MenuItem value="">All</MenuItem>
              {Object.values(WorkItemStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Step ID</TableCell>
                <TableCell>Job ID</TableCell>
                <TableCell>Document</TableCell>
                <TableCell>Step Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Job State</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">No automated steps found.</Typography>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  return (
    <Box>
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      
      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select value={statusFilter} label="Status Filter" onChange={handleStatusChange}>
            <MenuItem value="">All</MenuItem>
            {Object.values(WorkItemStatus).map((status) => (
              <MenuItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Step ID</TableCell>
              <TableCell>Job ID</TableCell>
              <TableCell>Document</TableCell>
              <TableCell>Step Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Job State</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Updated At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  <Link
                    component={RouterLink}
                    to={`/steps/${item.id}`}
                    state={{ item }}
                    underline="hover"
                    color="primary"
                  >
                    {item.id.substring(0, 8)}...
                  </Link>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  <Link component={RouterLink} to={`/jobs/${item.jobId}`} underline="hover" color="primary">
                    {item.jobId.substring(0, 8)}...
                  </Link>
                </TableCell>
                <TableCell>{item.document?.title ?? item.documentId}</TableCell>
                <TableCell>
                  <Chip label={item.stepType} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip label={item.status} color={getStatusColor(item.status)} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={item.jobState} color={getJobStateColor(item.jobState)} size="small" />
                </TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell>{formatDate(item.updatedAt)}</TableCell>
                <TableCell>
                  {canRetryOrCancel(item.status) && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Retry">
                        <IconButton
                          size="small"
                          onClick={() => handleRetry(item.id)}
                          disabled={processingStepId === item.id}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton
                          size="small"
                          onClick={() => handleCancel(item.id)}
                          disabled={processingStepId === item.id}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {nextCursor && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="outlined" onClick={onLoadMore}>
            Load More
          </Button>
        </Box>
      )}
    </Box>
  );
};
