import React, { useState } from 'react';
import { TimelineItem, TimelineOppositeContent, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent } from '@mui/lab';
import { Box, Typography, Chip, IconButton, Collapse } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { AuditLogEntry } from '../services/api/generated/models/AuditLogEntry';
import { getAuditLogEntryDisplay } from './audit_entries';

interface AuditLogEntryDisplayComponentProps {
  entry: AuditLogEntry;
  isLast: boolean;
}

export const AuditLogEntryDisplayComponent: React.FC<AuditLogEntryDisplayComponentProps> = ({ entry, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const display = getAuditLogEntryDisplay(entry);
  const fields = display.getFields();
  const alwaysDisplayFields = display.alwaysDisplayFields || [];
  const hasExpandableFields = fields.length > alwaysDisplayFields.length;

  const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) return 'N/A';
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = (durationMs / 1000).toFixed(2);
  return `${seconds}s`;
};

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const formatDate = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TimelineItem>
      <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.2, paddingLeft: 0 }}>
        <Typography variant="caption">
          {formatTime(entry.eventTimestamp)}
        </Typography>
        <Typography variant="caption" display="block">
          {formatDate(entry.eventTimestamp)}
        </Typography>
      </TimelineOppositeContent>
      <TimelineSeparator>
        <TimelineDot color={display.getColor()}>
          {display.getIcon()}
        </TimelineDot>
        {!isLast && <TimelineConnector />}
      </TimelineSeparator>
      <TimelineContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="subtitle2">
            {display.getLabel()}
          </Typography>
          {'processingDurationMs' in entry && entry.processingDurationMs !== null && entry.processingDurationMs !== undefined && (
            <Chip
              label={`${formatDuration(entry.processingDurationMs)}`}
              size="small"
              variant="outlined"
            />
          )}
          {hasExpandableFields && (
            <IconButton
              size="small"
              onClick={() => setExpanded(e => !e)}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        <Box>
          {fields.filter(f => alwaysDisplayFields.includes(f.label)).map(f => (
            <Box key={f.label} sx={{ fontSize: '0.875rem', color: 'text.secondary', wordBreak: 'break-word' }}>{f.label}: {String(f.value)}</Box>
          ))}
        </Box>
        <Collapse in={expanded}>
          <Box>
            {fields.filter(f => !alwaysDisplayFields.includes(f.label)).map(f => (
              <Box key={f.label} sx={{ fontSize: '0.875rem', color: 'text.secondary', wordBreak: 'break-word' }}>{f.label}: {String(f.value)}</Box>
            ))}
          </Box>
        </Collapse>
      </TimelineContent>
    </TimelineItem>
  );
};
