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
    // STEP_FAILED, STEP_MOVED_TO_RETRYING, STEP_MOVED_TO_FALLOUT removed (not present in generated enum)
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
    case AuditEventType.APPROVAL_REJECTED:
      return 'error';
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
    // STEP_FAILED, STEP_MOVED_TO_RETRYING, STEP_MOVED_TO_FALLOUT removed (not present in generated enum)
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

const MetadataDisplay: React.FC<{ entry: any }> = ({ entry }) => {
  // Show all relevant fields for the entry type
  const fields: Array<{ label: string, value: string | number | boolean | undefined }> = [
    { label: 'Document ID', value: entry.documentId },
    { label: 'Job Type', value: entry.jobType },
    { label: 'Step Type', value: entry.stepType },
    { label: 'Retry Count', value: entry.retryCount },
    { label: 'Message', value: entry.message },
    { label: 'Error Message', value: entry.errorMessage },
    { label: 'Next Retry', value: entry.nextRetryTime ? formatFullDateTime(String(entry.nextRetryTime)) : undefined },
    { label: 'Stuck Duration', value: entry.stuckDurationMs !== undefined ? formatDuration(Number(entry.stuckDurationMs)) : undefined },
    { label: 'Decision', value: entry.decision },
    { label: 'Previous Status', value: entry.previousStatus },
    { label: 'Previous Retry Count', value: entry.previousRetryCount },
  ];
  const shown = fields.filter(f => f.value !== undefined && f.value !== null && f.value !== '');
  if (shown.length === 0) return null;
  return (
    <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
      {shown.map(f => (
        <Box key={f.label}>{f.label}: {String(f.value)}</Box>
      ))}
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
          // Type guards for stepType, jobType, etc.
          const hasStepType = 'stepType' in entry && entry.stepType !== undefined;
          const stepType = hasStepType ? String((entry as any).stepType) : undefined;
          let description = '';
          if (String(entry.eventType) === AuditEventType.STEP_CREATED && stepType) {
            description = `Step Type: ${stepType}`;
          } else if (String(entry.eventType) === AuditEventType.STEP_COMPLETED && stepType) {
            description = `Step Type: ${stepType}`;
          }
          return (
            <TimelineItem key={entry.id}>
              <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.2, paddingLeft: 0 }}>
                <Typography variant="caption">
                  {formatTime(entry.eventTimestamp as any as string)}
                </Typography>
                <Typography variant="caption" display="block">
                  {formatDate(entry.eventTimestamp as any as string)}
                </Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                  <TimelineDot color={getEventColor(String(entry.eventType) as AuditEventType)}>
                    {getEventIcon(String(entry.eventType) as AuditEventType)}
                </TimelineDot>
                {index < entries.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle2">
                    {stepType ? stepType + " - " : ""}{getEventLabel(String(entry.eventType) as AuditEventType)}
                  </Typography>
                  {entry.processingDurationMs !== null && entry.processingDurationMs !== undefined && (
                    <Chip 
                      label={formatDuration(entry.processingDurationMs ?? null)} 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  {/* Expand button if any extra fields exist */}
                  {hasStepType && (
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
                  <MetadataDisplay entry={entry} />
                </Collapse>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Paper>
  );
};
