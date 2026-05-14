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
import { JobStep, StepStatus, StepType } from '../types/api';
import { apiClient } from '../services/api';
import { useStats } from '../contexts/StatsContext';

interface JobStepsTimelineProps {
  steps: JobStep[];
}

const getStepStatusIcon = (status: StepStatus) => {
  switch (status) {
    case StepStatus.COMPLETED:
      return <CheckCircleIcon color="success" />;
    case StepStatus.FAILED:
      return <ErrorIcon color="error" />;
    case StepStatus.IN_PROGRESS:
      return <PlayArrowIcon color="info" />;
    case StepStatus.WAITING:
      return <HourglassIcon color="disabled" />;
    case StepStatus.RETRYING:
      return <RefreshIcon color="warning" />;
    case StepStatus.IN_FALLOUT:
      return <WarningIcon color="error" />;
    default:
      return null;
  }
};

const getStepStatusColor = (
  status: StepStatus
): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  switch (status) {
    case StepStatus.COMPLETED:
      return 'success';
    case StepStatus.FAILED:
      return 'error';
    case StepStatus.IN_PROGRESS:
      return 'info';
    case StepStatus.RETRYING:
      return 'warning';
    case StepStatus.IN_FALLOUT:
      return 'error';
    case StepStatus.WAITING:
    default:
      return 'default';
  }
};

const formatStepType = (stepType: StepType): string => {
  return stepType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const getActiveStep = (steps: JobStep[]): number => {
  const inProgressIndex = steps.findIndex(
    (step) => step.stepStatus === StepStatus.IN_PROGRESS || step.stepStatus === StepStatus.RETRYING
  );
  if (inProgressIndex !== -1) return inProgressIndex;

  const waitingIndex = steps.findIndex(
    (step) => step.stepStatus === StepStatus.WAITING
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

export const JobStepsTimeline: React.FC<JobStepsTimelineProps> = ({ steps }) => {
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
      setRetrySuccess(result.message);
      
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
      setRetrySuccess(result.message);
      
      // Optimistically adjust queue stats: processing/retrying -> failed
      adjustQueueStats({ processing: -1, failed: 1 });
      setRetrySuccess(result.message);
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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Workflow Steps
      </Typography>
      
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
          <Step key={step.stepId} completed={step.stepStatus === StepStatus.COMPLETED}>
            <StepLabel
              icon={getStepStatusIcon(step.stepStatus)}
              error={step.stepStatus === StepStatus.FAILED || step.stepStatus === StepStatus.IN_FALLOUT}
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
                <Typography variant="body2" color="text.secondary">
                  <strong>Created:</strong>{' '}
                  {new Date(step.createdAt).toLocaleString()}
                </Typography>
                {step.startedAt && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Started:</strong>{' '}
                    {new Date(step.startedAt).toLocaleString()}
                  </Typography>
                )}
                {step.completedAt && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Completed:</strong>{' '}
                    {new Date(step.completedAt).toLocaleString()}
                  </Typography>
                )}
                {step.startedAt && step.completedAt && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Duration:</strong>{' '}
                    {(
                      (new Date(step.completedAt).getTime() -
                        new Date(step.startedAt).getTime()) /
                      1000
                    ).toFixed(2)}
                    s
                  </Typography>
                )}
                {/* Display outcome/message if present (future: from audit log metadata) */}
                {step.outcome && (
                  <Typography variant="body2" color="info.main">
                    <strong>Outcome:</strong> {step.outcome}
                  </Typography>
                )}
                {step.errorMessage && (
                  <Typography variant="body2" color="error.main">
                    <strong>Error:</strong> {step.errorMessage}
                  </Typography>
                )}
                {step.stepStatus === StepStatus.RETRYING && step.retryAfter && (
                  <Typography variant="body2" color="warning.main">
                    <strong>Retry scheduled:</strong>{' '}
                    {formatRetryTimer(step.retryAfter)} ({new Date(step.retryAfter).toLocaleString()})
                  </Typography>
                )}
                {(step.stepStatus === StepStatus.RETRYING || step.stepStatus === StepStatus.IN_FALLOUT) && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color={step.stepStatus === StepStatus.IN_FALLOUT ? 'error' : 'warning'}
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
                    {step.stepStatus === StepStatus.IN_FALLOUT && (
                      <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5, width: '100%' }}>
                        Maximum automatic retries exceeded. Manual intervention required.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};
