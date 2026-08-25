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
  Box,
  IconButton,
  Tooltip,
  Link,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Refresh as RefreshIcon, Cancel as CancelIcon, OpenInNew } from '@mui/icons-material';
import { QueueItem } from '../services/api/generated/models/QueueItem';

interface FalloutsTableProps {
  fallouts: QueueItem[];
  onRetry: (stepId: string) => Promise<void>;
  onCancel: (stepId: string) => Promise<void>;
}

const formatStepType = (stepType: string) => stepType.replace(/_/g, ' ');

export const FalloutsTable: React.FC<FalloutsTableProps> = ({ fallouts, onRetry, onCancel }) => {
  const [processingStepId, setProcessingStepId] = useState<string | null>(null);

  const handleRetry = async (stepId: string) => {
    setProcessingStepId(stepId);
    try {
      await onRetry(stepId);
    } finally {
      setProcessingStepId(null);
    }
  };

  const handleCancel = async (stepId: string) => {
    setProcessingStepId(stepId);
    try {
      await onCancel(stepId);
    } finally {
      setProcessingStepId(null);
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Job ID</TableCell>
            <TableCell>Step Type</TableCell>
            <TableCell>Document Link</TableCell>
            <TableCell>Error Message</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fallouts.map((fallout) => (
            <TableRow key={fallout.id}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <Link component={RouterLink} to={`/jobs/${fallout.jobId}`} underline="hover" color="primary">
                  {fallout.jobId.substring(0, 8)}...
                </Link>
              </TableCell>
              <TableCell>
                <Chip label={formatStepType(fallout.stepType)} size="small" variant="outlined" color="primary" />
              </TableCell>
              <TableCell>
                <Link
                  href={fallout.paperlessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                >
                  {fallout.document?.title ?? fallout.documentId}
                  <OpenInNew fontSize="small" />
                </Link>
              </TableCell>
              <TableCell sx={{ maxWidth: 320 }}>
                {fallout.errorMessage ? (
                  <Tooltip title={fallout.errorMessage}>
                    <Typography
                      variant="body2"
                      color="error.main"
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {fallout.errorMessage}
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Retry">
                    <IconButton
                      size="small"
                      onClick={() => handleRetry(fallout.id)}
                      disabled={processingStepId === fallout.id}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton
                      size="small"
                      onClick={() => handleCancel(fallout.id)}
                      disabled={processingStepId === fallout.id}
                    >
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
