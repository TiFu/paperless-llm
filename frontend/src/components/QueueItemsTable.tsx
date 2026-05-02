import React from 'react';
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
} from '@mui/material';
import { LLMQueueItem, DocumentUpdateQueueItem, WorkItemStatus } from '../types/api';

interface QueueItemsTableProps {
  items: (LLMQueueItem | DocumentUpdateQueueItem)[];
  nextCursor: string | null;
  onLoadMore: () => void;
  onStatusFilter: (status: WorkItemStatus | '') => void;
  type: 'llm' | 'docUpdate';
}

export const QueueItemsTable: React.FC<QueueItemsTableProps> = ({
  items,
  nextCursor,
  onLoadMore,
  onStatusFilter,
  type,
}) => {
  const [filterStatus, setFilterStatus] = React.useState<WorkItemStatus | ''>('');

  const handleStatusChange = (event: { target: { value: string } }) => {
    const value = event.target.value as WorkItemStatus | '';
    setFilterStatus(value);
    onStatusFilter(value);
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
          No queue items found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select value={filterStatus} label="Status Filter" onChange={handleStatusChange}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value={WorkItemStatus.PENDING}>Pending</MenuItem>
            <MenuItem value={WorkItemStatus.PROCESSING}>Processing</MenuItem>
            <MenuItem value={WorkItemStatus.COMPLETED}>Completed</MenuItem>
            <MenuItem value={WorkItemStatus.FAILED}>Failed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Document ID</TableCell>
              {type === 'llm' ? (
                <TableCell>Job Type</TableCell>
              ) : (
                <>
                  <TableCell>Action Type</TableCell>
                  <TableCell>Document System</TableCell>
                </>
              )}
              <TableCell>Status</TableCell>
              <TableCell>Retry Count</TableCell>
              <TableCell>Claimed By</TableCell>
              <TableCell>Created At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {item.id.substring(0, 8)}...
                </TableCell>
                <TableCell>{item.documentId}</TableCell>
                {type === 'llm' ? (
                  <TableCell>{(item as LLMQueueItem).jobType}</TableCell>
                ) : (
                  <>
                    <TableCell>{(item as DocumentUpdateQueueItem).actionType}</TableCell>
                    <TableCell>{(item as DocumentUpdateQueueItem).documentSystem}</TableCell>
                  </>
                )}
                <TableCell>
                  <Chip label={item.status} color={getStatusColor(item.status)} size="small" />
                </TableCell>
                <TableCell>{item.retryCount}</TableCell>
                <TableCell>{item.claimedBy || '-'}</TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
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
