import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayArrowIcon,
  AddCircle as AddCircleIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  WarningAmber as WarningIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { AuditLogEntry } from '../services/api/generated/models/AuditLogEntry';
import { AuditEventType } from '../services/api/generated/models/AuditEventType';

interface AuditLogTimelineProps {
  entries: AuditLogEntry[];
}

const getEventIcon = (eventType: AuditEventType) => {
  switch (eventType) {
    case AuditEventType.JOB_CREATED:
      return <AddCircleIcon />;
    case AuditEventType.STEP_CREATED:
      return <AddCircleIcon />;
    case AuditEventType.STEP_COMPLETED:
      return <CheckCircleIcon />;
    case AuditEventType.STEP_FAILED:
      return <ErrorIcon />;
    case AuditEventType.STEP_MOVED_TO_RETRYING:
      return <RefreshIcon />;
    case AuditEventType.STEP_MOVED_TO_FALLOUT:
      return <WarningIcon />;
    case AuditEventType.APPROVAL_REQUESTED:
      return <PlayArrowIcon />;
    case AuditEventType.APPROVAL_APPROVED:
      return <ThumbUpIcon />;
    case AuditEventType.APPROVAL_REJECTED:
      return <ThumbDownIcon />;
    case AuditEventType.STEP_MANUALLY_RETRIED:
      return <RefreshIcon />;
    case AuditEventType.STEP_CANCELLED:
      return <CancelIcon />;
    case AuditEventType.STUCK_STEP_RESET:
      return <WarningIcon />;
    default:
      return <PlayArrowIcon />;
  }
};

const getEventColor = (eventType: AuditEventType): 'success' | 'error' | 'warning' | 'info' | 'grey' => {
  switch (eventType) {
    case AuditEventType.JOB_CREATED:
    case AuditEventType.STEP_CREATED:
      return 'info';
    case AuditEventType.STEP_COMPLETED:
    case AuditEventType.APPROVAL_APPROVED:
      return 'success';
    case AuditEventType.STEP_FAILED:
    case AuditEventType.STEP_MOVED_TO_FALLOUT:
    case AuditEventType.APPROVAL_REJECTED:
      return 'error';
    case AuditEventType.STEP_MOVED_TO_RETRYING:
    case AuditEventType.STEP_MANUALLY_RETRIED:
    case AuditEventType.STUCK_STEP_RESET:
      return 'warning';
    case AuditEventType.APPROVAL_REQUESTED:
    case AuditEventType.STEP_CANCELLED:
      return 'grey';
    default:
      return 'grey';
  }
};

const getEventLabel = (eventType: AuditEventType): string => {
  switch (eventType) {
    case AuditEventType.JOB_CREATED:
      return 'Job Created';
    case AuditEventType.STEP_EXECUTED:
      return 'Step Executed';
    case AuditEventType.STEP_CREATED:
      return 'Step Created';
    case AuditEventType.STEP_COMPLETED:
      return 'Step Completed';
    case AuditEventType.STEP_FAILED:
      return 'Step Failed';
    case AuditEventType.STEP_MOVED_TO_RETRYING:
      return 'Moved to Retrying';
    case AuditEventType.STEP_MOVED_TO_FALLOUT:
      return 'Moved to Fallout';
    case AuditEventType.APPROVAL_REQUESTED:
      return 'Approval Requested';
    case AuditEventType.APPROVAL_APPROVED:
      return 'Approved';
    case AuditEventType.APPROVAL_REJECTED:
      return 'Rejected';
    case AuditEventType.STEP_MANUALLY_RETRIED:
      return 'Manually Retried';
    case AuditEventType.STEP_CANCELLED:
      return 'Cancelled';
    case AuditEventType.STUCK_STEP_RESET:
      return 'Stuck Step Reset';
    default:
      return eventType;
  }
};

const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) return 'N/A';
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = (durationMs / 1000).toFixed(2);
  return `${seconds}s`;
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFullDateTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const MetadataDisplay: React.FC<{ metadata: Record<string, unknown> | null }> = ({ metadata }) => {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  return (
    <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
      {metadata.documentId !== undefined && (
        <Box>Document ID: {String(metadata.documentId)}</Box>
      )}
      {metadata.jobType !== undefined && (
        <Box>Job Type: {String(metadata.jobType)}</Box>
      )}
      {metadata.stepType !== undefined && (
        <Box>Step Type: {String(metadata.stepType)}</Box>
      )}
      {metadata.retryCount !== undefined && (
        <Box>Retry Count: {String(metadata.retryCount)}</Box>
      )}
      {metadata.message !== undefined && (
        <Box sx={{ color: 'error.main', mt: 0.5 }}>
          {String(metadata.message)}</Box>
      )}
      {metadata.errorMessage !== undefined && (
        <Box sx={{ color: 'error.main', mt: 0.5 }}>
          Error: {String(metadata.errorMessage)}</Box>
      )}
      {metadata.nextRetryTime !== undefined && (
        <Box>Next Retry: {formatFullDateTime(String(metadata.nextRetryTime))}</Box>
      )}
      {metadata.stuckDurationMs !== undefined && (
        <Box>Stuck Duration: {formatDuration(Number(metadata.stuckDurationMs))}</Box>
      )}
      {metadata.decision !== undefined && (
        <Box>Decision: {String(metadata.decision)}</Box>
      )}
      {metadata.previousStatus !== undefined && (
        <Box>Previous Status: {String(metadata.previousStatus)}</Box>
      )}
      {metadata.previousRetryCount !== undefined && (
        <Box>Previous Retry Count: {String(metadata.previousRetryCount)}</Box>
      )}
    </Box>
  );
};

export const AuditLogTimeline: React.FC<AuditLogTimelineProps> = ({ entries }) => {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const toggleExpand = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  if (!entries || entries.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No audit log entries available.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Audit Log
      </Typography>
      <Timeline position="right">
        {entries.map((entry, index) => {
          const stepType = entry.metadata?.stepType ? String(entry.metadata.stepType) : undefined;
          let description = '';
          if (entry.eventType === AuditEventType.STEP_CREATED && stepType) {
            description = `Step Type: ${stepType}`;
          } else if ((entry.eventType === AuditEventType.STEP_COMPLETED || entry.eventType === AuditEventType.STEP_FAILED) && stepType) {
            description = `Step Type: ${stepType}`;
          }
          return (
            <TimelineItem key={entry.id}>
              <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.2, paddingLeft: 0 }}>
                <Typography variant="caption">
                  {formatTime(entry.eventTimestamp)}
                </Typography>
                <Typography variant="caption" display="block">
                  {formatDate(entry.eventTimestamp)}
                </Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color={getEventColor(entry.eventType)}>
                  {getEventIcon(entry.eventType)}
                </TimelineDot>
                {index < entries.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle2">
                    {entry.metadata?.stepType ? entry.metadata.stepType + " - " : ""}{getEventLabel(entry.eventType)}
                  </Typography>
                  {entry.processingDurationMs !== null && (
                    <Chip 
                      label={formatDuration(entry.processingDurationMs)} 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <IconButton
                      size="small"
                      onClick={() => toggleExpand(entry.id)}
                      sx={{
                        transform: expandedEntry === entry.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                {description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{description}</Typography>
                )}
                {/* Always show a message for completion/error/job events */}
                <Collapse in={expandedEntry === entry.id}>
                  <MetadataDisplay metadata={entry.metadata} />
                </Collapse>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Paper>
  );
};
