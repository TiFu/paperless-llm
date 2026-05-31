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
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { AuditLogEntry } from '../services/api/generated/models/AuditLogEntry';
import { getAuditLogEntryDisplay } from './audit_entries';
import { AuditLogEntryDisplayComponent } from './AuditLogEntryDisplayComponent';

interface AuditLogTimelineProps {
  entries: AuditLogEntry[];
}


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


const MetadataDisplay: React.FC<{ entry: AuditLogEntry }> = ({ entry }) => {
  const display = getAuditLogEntryDisplay(entry);
  const fields = display.getFields();
  if (!fields || fields.length === 0) return null;
  return (
    <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
      {fields.map(f => (
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
        {entries.map((entry, index) => (
          <AuditLogEntryDisplayComponent
            key={entry.id}
            entry={entry}
            index={index}
            isLast={index === entries.length - 1}
          />
        ))}
      </Timeline>
    </Paper>
  );
};
