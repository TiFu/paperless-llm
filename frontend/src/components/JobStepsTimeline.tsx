import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Button,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { JobStep } from '../services/api/generated/models/JobStep';
import { StepStatus } from '../services/api/generated/models/StepStatus';
import { StepType } from '../services/api/generated/models/StepType';
import { apiClient } from '../services/api/api';
import { useStats } from '../contexts/StatsContext';

interface JobStepsTimelineProps {
  steps: JobStep[];
  showStepsAsActive: boolean
}

const getStepStatusIcon = (status: StepStatus) => {
  switch (status) {
    case StepStatus.completed:
      return <CheckCircleIcon color="success" />;
    case StepStatus.failed:
      return <ErrorIcon color="error" />;
    case StepStatus.in_progress:
      return <PlayArrowIcon color="info" />;
    case StepStatus.waiting:
      return <HourglassIcon color="disabled" />;
    case StepStatus.retrying:
      return <RefreshIcon color="warning" />;
    case StepStatus.in_fallout:
      return <WarningIcon color="error" />;
    default:
      return null;
  }
};

const getStepStatusColor = (
  status: StepStatus
): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  switch (status) {
    case StepStatus.completed:
      return 'success';
    case StepStatus.failed:
      return 'error';
    case StepStatus.in_progress:
      return 'info';
    case StepStatus.retrying:
      return 'warning';
    case StepStatus.in_fallout:
      return 'error';
    case StepStatus.waiting:
    default:
      return 'default';
  }
};

const formatStepType = (stepType: StepType): string => {
  return stepType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const getActiveStep = (steps: JobStep[]): number => {
  const inProgressIndex = steps.findIndex(
    (step) => step.stepStatus === StepStatus.in_progress || step.stepStatus === StepStatus.retrying
  );
  if (inProgressIndex !== -1) return inProgressIndex;

  const waitingIndex = steps.findIndex(
    (step) => step.stepStatus === StepStatus.waiting
  );
  if (waitingIndex !== -1) return waitingIndex;

  // All completed or failed
  return steps.length;
};

const formatRetryTimer = (retryAfter: string | null): string => {
  if (!retryAfter) return '';
  
  const retryTime = new Date(retryAfter);
  const now = new Date();
  const diffMs = retryTime.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Ready now';
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}h ${remainingMinutes}m`;
  } else if (diffMinutes > 0) {
    const remainingSeconds = diffSeconds % 60;
    return `${diffMinutes}m ${remainingSeconds}s`;
  } else {
    return `${diffSeconds}s`;
  }
};

export const JobStepsTimeline: React.FC<JobStepsTimelineProps> = ({ steps, showStepsAsActive }) => {
  const activeStep = getActiveStep(steps);
  const [retryingStepId, setRetryingStepId] = useState<string | null>(null);
  const [cancelingStepId, setCancelingStepId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrySuccess, setRetrySuccess] = useState<string | null>(null);
  const { adjustQueueStats } = useStats();

  // Optionally, fetch audit log entries for richer step info (if available)
  // This is a placeholder for future integration if you want to show outcome/messages from audit log
  // const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  // useEffect(() => { ... }, [jobId]);

  const handleRetry = async (stepId: string) => {
    setRetryingStepId(stepId);
    setRetryError(null);
    setRetrySuccess(null);
    
    try {
      const result = await apiClient.retryStep(stepId);
      setRetrySuccess(result.message ?? null);
      
      // Optimistically adjust queue stats: failed -> processing
      adjustQueueStats({ failed: -1, processing: 1 });
      
      // Clear success message after 3 seconds
      setTimeout(() => setRetrySuccess(null), 3000);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Failed to retry step');
    } finally {
      setRetryingStepId(null);
    }
  };

  const handleCancel = async (stepId: string) => {
    setCancelingStepId(stepId);
    setRetryError(null);
    setRetrySuccess(null);
    
    try {
      const result = await apiClient.cancelStep(stepId);
      setRetrySuccess(result.message ?? null);
      
      // Optimistically adjust queue stats: processing/retrying -> failed
      adjustQueueStats({ processing: -1, failed: 1 });
      setRetrySuccess(result.message ?? null);
      // Clear success message after 3 seconds
      setTimeout(() => setRetrySuccess(null), 3000);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Failed to cancel step');
    } finally {
      setCancelingStepId(null);
    }
  };

  if (steps.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No steps found for this job
        </Typography>
      </Paper>
    );
  }

  return (
    <div>      
      {retryError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRetryError(null)}>
          {retryError}
        </Alert>
      )}
      
      {retrySuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRetrySuccess(null)}>
          {retrySuccess}
        </Alert>
      )}
      
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step) => (
          <Step key={step.stepId} active={showStepsAsActive} completed={step.stepStatus === StepStatus.completed}>
            <StepLabel
              icon={getStepStatusIcon(step.stepStatus)}
              error={step.stepStatus === StepStatus.failed || step.stepStatus === StepStatus.in_fallout}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body1">{formatStepType(step.stepType)}</Typography>
                <Chip
                  label={step.stepStatus.replace(/_/g, ' ')}
                  color={getStepStatusColor(step.stepStatus)}
                  size="small"
                />
                {step.retryCount > 0 && (
                  <Chip
                    label={`Retry #${step.retryCount}`}
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                {step.stepStatus === StepStatus.retrying && step.retryAfter && (
                  <Typography variant="body2" color="warning.main">
                    <strong>Retry scheduled:</strong>{' '}
                    {typeof step.retryAfter === 'string' ? formatRetryTimer(step.retryAfter) : ''} {step.retryAfter ? `(${new Date(step.retryAfter).toLocaleString()})` : ''}
                  </Typography>
                )}
                {(step.stepStatus === StepStatus.retrying || step.stepStatus === StepStatus.in_fallout) && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color={step.stepStatus === StepStatus.in_fallout ? 'error' : 'warning'}
                      startIcon={<RefreshIcon />}
                      onClick={() => handleRetry(step.stepId)}
                      disabled={retryingStepId === step.stepId || cancelingStepId === step.stepId}
                    >
                      {retryingStepId === step.stepId ? 'Retrying...' : 'Manual Retry'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => handleCancel(step.stepId)}
                      disabled={retryingStepId === step.stepId || cancelingStepId === step.stepId}
                    >
                      {cancelingStepId === step.stepId ? 'Cancelling...' : 'Cancel'}
                    </Button>
                    {step.stepStatus === StepStatus.in_fallout && (
                      <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5, width: '100%' }}>
                        Maximum automatic retries exceeded. Manual intervention required.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              <Box>
                {step.children != null &&
                <JobStepsTimeline showStepsAsActive={false} steps={step.children} />
                }
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </div>
  );
};
