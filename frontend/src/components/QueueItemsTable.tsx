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
import { QueueItem, WorkItemStatus } from '../types/api';

interface QueueItemsTableProps {
  items: QueueItem[];
  nextCursor: string | null;
  onLoadMore: () => void;
  onStatusFilter: (status: WorkItemStatus | '') => void;
  type: 'unified';
}

export const QueueItemsTable: React.FC<QueueItemsTableProps> = ({
  items,
  nextCursor,
  onLoadMore,
  onStatusFilter,
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
              <TableCell>Step ID</TableCell>
              <TableCell>Job ID</TableCell>
              <TableCell>Document ID</TableCell>
              <TableCell>Step Type</TableCell>
              <TableCell>Job Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Job State</TableCell>
              <TableCell>Created At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {item.id.substring(0, 8)}...
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
