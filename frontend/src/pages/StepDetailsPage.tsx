import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Paper, Link } from '@mui/material';
import { apiClient } from '../services/api/api';
import { AuditLogTimeline } from '../components/AuditLogTimeline';
import { QueueItem } from '../services/api/generated/models/QueueItem';
import { AuditLogEntry } from '../services/api/generated/models/AuditLogEntry';

export const StepDetailsPage: React.FC = () => {
  const { stepId } = useParams<{ stepId: string }>();
  const location = useLocation();
  const item = (location.state as { item?: QueueItem } | null)?.item;
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      setLoading(false);
      return;
    }
    const fetchAuditLog = async () => {
      setLoading(true);
      setError(null);
      try {
        const auditRes = await apiClient.fetchJobAuditLog(item.jobId);
        setAuditLog(auditRes.auditLog.filter((e) => e.stepId === stepId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    };
    fetchAuditLog();
  }, [item, stepId]);

  if (!item) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
        <Alert severity="warning">
          Step details aren't available directly — open this page by clicking a step
          from the{' '}
          <Link component={RouterLink} to="/queues">
            Automated Steps
          </Link>{' '}
          table.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>Step Details</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1">Step ID: {item.id}</Typography>
        <Typography variant="subtitle2">Type: {item.stepType}</Typography>
        <Typography>Status: {item.status}</Typography>
        <Typography>Job State: {item.jobState}</Typography>
        <Typography>Document: {item.document?.title ?? item.documentId}</Typography>
        <Typography>Retry Count: {item.retryCount}</Typography>
        {item.retryAfter && <Typography>Retry After: {new Date(item.retryAfter).toLocaleString()}</Typography>}
      </Paper>
      <Typography variant="h6" gutterBottom>Audit Log</Typography>
      {error ? <Alert severity="error">{error}</Alert> : <AuditLogTimeline entries={auditLog} />}
    </Box>
  );
};
