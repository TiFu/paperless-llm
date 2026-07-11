import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import { OpenInNew, Refresh, Cancel } from '@mui/icons-material';
import { QueueItem } from '../services/api/generated/models/QueueItem';
import { AuditLogTimeline } from './AuditLogTimeline';

interface FalloutCardProps {
  fallout: QueueItem;
  onRetry: (stepId: string) => Promise<void>;
  onCancel: (stepId: string) => Promise<void>;
  paperlessBaseUrl?: string;
}

export const FalloutCard: React.FC<FalloutCardProps> = ({ 
  fallout, 
  onRetry, 
  onCancel,
  paperlessBaseUrl = 'http://localhost:8000'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'retry' | 'cancel' | null>(null);

  const handleRetry = async () => {
    setLoading(true);
    setActionType('retry');
    setError(null);
    try {
      await onRetry(fallout.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry step');
      setLoading(false);
      setActionType(null);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setActionType('cancel');
    setError(null);
    try {
      await onCancel(fallout.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel step');
      setLoading(false);
      setActionType(null);
    }
  };

  const formatStepType = (stepType: string) => {
    return stepType.replace(/_/g, ' ');
  };

  const paperlessUrl = `${paperlessBaseUrl}/documents/${fallout.documentId}`;

  return (
    <Card sx={{ mb: 2, border: '2px solid', borderColor: 'error.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Document {fallout.documentId}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={formatStepType(fallout.stepType)} 
                size="small" 
                variant="outlined" 
                color="primary"
              />
              <Chip 
                label={fallout.jobType} 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                label={`Retry Count: ${fallout.retryCount}`} 
                size="small" 
                color="error"
                variant="filled"
              />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {new Date(fallout.createdAt).toLocaleString()}
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Step Failed After {fallout.retryCount} Retries
          </Typography>
          <Typography variant="body2">
            This step has exhausted all automatic retry attempts and requires manual intervention.
            You can retry the step to attempt processing again, or cancel it to permanently fail the step.
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRetry}
              disabled={loading}
              startIcon={loading && actionType === 'retry' ? <CircularProgress size={16} /> : <Refresh />}
            >
              Retry
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancel}
              disabled={loading}
              startIcon={loading && actionType === 'cancel' ? <CircularProgress size={16} /> : <Cancel />}
            >
              Cancel
            </Button>
          </Box>
          <Link
            href={`/jobs/${fallout.jobId}`}
            sx={{
              textDecoration: 'none',
              color: 'primary.main',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            View Job Details
          </Link>
        </Box>

        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            View Document in Paperless
          </Typography>
          <Link
            href={paperlessUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              textDecoration: 'none',
              color: 'primary.main',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Open document in Paperless
            <OpenInNew fontSize="small" />
          </Link>
        </Box>

        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Job ID: {fallout.jobId}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
            Step ID: {fallout.id}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
            Job State: {fallout.jobState}
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          <AuditLogTimeline entries={fallout.auditLog ?? []} />
        </Box>
      </CardContent>
    </Card>
  );
};
