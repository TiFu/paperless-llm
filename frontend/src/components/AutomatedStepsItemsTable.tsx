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
import { QueueItem, WorkItemStatus } from '../types/api';
import { apiClient } from '../services/api';

interface AutomatedStepsItemsTableProps {
  items: QueueItem[];
  nextCursor: string | null;
  onLoadMore: () => void;
  onStatusFilter: (status: WorkItemStatus | '') => void;
  type: 'unified';
}

export const AutomatedStepsItemsTable: React.FC<AutomatedStepsItemsTableProps> = ({
  items,
  nextCursor,
  onLoadMore,
  onStatusFilter,
}) => {
  const [filterStatus, setFilterStatus] = useState<WorkItemStatus | ''>('');
  const [processingStepId, setProcessingStepId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleStatusChange = (event: { target: { value: string } }) => {
    const value = event.target.value as WorkItemStatus | '';
    setFilterStatus(value);
    onStatusFilter(value);
  };

  const handleRetry = async (stepId: string) => {
    setProcessingStepId(stepId);
    setActionError(null);
    setActionSuccess(null);
    
    try {
      const result = await apiClient.retryStep(stepId);
      setActionSuccess(result.message);
      setTimeout(() => {
        setActionSuccess(null);
        onStatusFilter(filterStatus); // Refresh the list
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
      setActionSuccess(result.message);
      setTimeout(() => {
        setActionSuccess(null);
        onStatusFilter(filterStatus); // Refresh the list
      }, 2000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to cancel step');
    } finally {
      setProcessingStepId(null);
    }
  };

  const canRetryOrCancel = (status: WorkItemStatus) => {
    return status === WorkItemStatus.RETRYING || status === WorkItemStatus.IN_FALLOUT;
  };

  const getStatusColor = (status: WorkItemStatus) => {
    switch (status) {
      case WorkItemStatus.PENDING:
        return 'default';
      case WorkItemStatus.PROCESSING:
        return 'info';
      case WorkItemStatus.COMPLETED:
        return 'success';
      case WorkItemStatus.FAILED:
        return 'error';
      case WorkItemStatus.RETRYING:
        return 'warning';
      case WorkItemStatus.IN_FALLOUT:
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  if (items.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No automated steps found.
        </Typography>
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
          <Select value={filterStatus} label="Status Filter" onChange={handleStatusChange}>
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
              <TableCell>Document ID</TableCell>
              <TableCell>Step Type</TableCell>
              <TableCell>Job Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Job State</TableCell>
              <TableCell>Created At</TableCell>
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
                    underline="hover"
                    color="primary"
                  >
                    {item.id.substring(0, 8)}...
                  </Link>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {item.jobId.substring(0, 8)}...
                </TableCell>
                <TableCell>{item.documentId}</TableCell>
                <TableCell>
                  <Chip label={item.stepType} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{item.jobType}</TableCell>
                <TableCell>
                  <Chip label={item.status} color={getStatusColor(item.status)} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={item.jobState} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell>
                  {canRetryOrCancel(item.status) && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Retry step">
                        <IconButton
                          size="small"
                          color={item.status === WorkItemStatus.IN_FALLOUT ? 'error' : 'warning'}
                          onClick={() => handleRetry(item.id)}
                          disabled={processingStepId === item.id}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel step">
                        <IconButton
                          size="small"
                          color="error"
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
