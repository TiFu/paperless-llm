import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { JobStep, StepStatus, StepType } from '../types/api';

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
    default:
      return null;
  }
};

const getStepStatusColor = (
  status: StepStatus
): 'default' | 'info' | 'success' | 'error' => {
  switch (status) {
    case StepStatus.COMPLETED:
      return 'success';
    case StepStatus.FAILED:
      return 'error';
    case StepStatus.IN_PROGRESS:
      return 'info';
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
    (step) => step.stepStatus === StepStatus.IN_PROGRESS
  );
  if (inProgressIndex !== -1) return inProgressIndex;

  const waitingIndex = steps.findIndex(
    (step) => step.stepStatus === StepStatus.WAITING
  );
  if (waitingIndex !== -1) return waitingIndex;

  // All completed or failed
  return steps.length;
};

export const JobStepsTimeline: React.FC<JobStepsTimelineProps> = ({ steps }) => {
  const activeStep = getActiveStep(steps);

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
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.stepId} completed={step.stepStatus === StepStatus.COMPLETED}>
            <StepLabel
              icon={getStepStatusIcon(step.stepStatus)}
              error={step.stepStatus === StepStatus.FAILED}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1">{formatStepType(step.stepType)}</Typography>
                <Chip
                  label={step.stepStatus.replace(/_/g, ' ')}
                  color={getStepStatusColor(step.stepStatus)}
                  size="small"
                />
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
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};
