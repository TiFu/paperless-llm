import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import { apiClient } from '../services/api/api';
import { AuditLogTimeline } from '../components/AuditLogTimeline';
import { JobStep } from '../services/api/generated/models/JobStep';
import { AuditLogEntry } from '../services/api/generated/models/AuditLogEntry';

export const StepDetailsPage: React.FC = () => {
  const { stepId } = useParams<{ stepId: string }>();
  const [step, setStep] = useState<JobStep | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStepAndAudit = async () => {
      setLoading(true);
      setError(null);
      try {
        // There is no direct API for a single step, so fetch all steps for the job and filter
        // Assume stepId is unique enough to find the job (if not, this will need to be improved)
        // For now, try to fetch audit log and filter by stepId
        const auditLogResp = await apiClient.fetchAuditLog({ stepId: String(stepId) });
        const entries = (auditLogResp as any).entries ?? [];
        setAuditLog(entries);
        // Try to extract step details from audit log if possible
        const stepCreated = entries.find((e: any) => e.stepId === stepId && e.eventType && e.eventType.includes('STEP'));
        if (stepCreated) {
          setStep({
            stepId: stepCreated.stepId!,
            stepType: stepCreated.details?.stepType || '',
            stepStatus: stepCreated.details?.stepStatus || '',
            children: null,
            startedAt: stepCreated.timestamp,
            retryCount: stepCreated.details?.retryCount || 0,
            retryAfter: stepCreated.details?.retryAfter || null,
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load step details');
      } finally {
        setLoading(false);
      }
    };
    if (stepId) fetchStepAndAudit();
  }, [stepId]);

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!step) {
    return <Alert severity="warning">Step not found.</Alert>;
  }
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>Step Details</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1">Step ID: {step.stepId}</Typography>
        <Typography variant="subtitle2">Type: {step.stepType}</Typography>
        <Typography>Status: {step.stepStatus}</Typography>
        <Typography>Started At: {typeof step.startedAt === 'string' ? new Date(step.startedAt).toLocaleString() : ''}</Typography>
        <Typography>Retry Count: {step.retryCount}</Typography>
        {step.retryAfter && <Typography>Retry After: {typeof step.retryAfter === 'string' ? new Date(step.retryAfter).toLocaleString() : ''}</Typography>}
      </Paper>
      <Typography variant="h6" gutterBottom>Audit Log</Typography>
      <AuditLogTimeline entries={auditLog.filter(e => e.stepId === step.stepId)} />
    </Box>
  );
};
