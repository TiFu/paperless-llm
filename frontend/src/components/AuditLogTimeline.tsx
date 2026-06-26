import React from 'react';
import { Paper, Typography } from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import { AuditLogEntry } from '../services/api/generated/models/AuditLogEntry';
import { AuditLogEntryDisplayComponent } from './AuditLogEntryDisplayComponent';

interface AuditLogTimelineProps {
  entries: AuditLogEntry[];
}

export const AuditLogTimeline: React.FC<AuditLogTimelineProps> = ({ entries }) => {
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
            isLast={index === entries.length - 1}
          />
        ))}
      </Timeline>
    </Paper>
  );
};
