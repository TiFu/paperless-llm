import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Paper, Box } from '@mui/material';
import { AuditLogTimeline } from './AuditLogTimeline';
import { QueueItem } from '../services/api/generated/models/QueueItem';

interface StepDetailsDialogProps {
  item: QueueItem | null;
  onClose: () => void;
}

export const StepDetailsDialog: React.FC<StepDetailsDialogProps> = ({ item, onClose }) => {
  return (
    <Dialog open={item !== null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Step Details</DialogTitle>
      <DialogContent dividers>
        {item && (
          <>
            <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
              <Typography variant="subtitle1">Step ID: {item.id}</Typography>
              <Typography variant="subtitle2">Type: {item.stepType}</Typography>
              <Typography>Status: {item.status}</Typography>
              <Typography>Job State: {item.jobState}</Typography>
              <Typography>Document: {item.document?.title ?? item.documentId}</Typography>
              <Typography>Retry Count: {item.retryCount}</Typography>
              {item.retryAfter && (
                <Typography>Retry After: {new Date(item.retryAfter).toLocaleString()}</Typography>
              )}
            </Paper>
            <Box>
              <Typography variant="h6" gutterBottom>Audit Log</Typography>
              <AuditLogTimeline entries={item.auditLog ?? []} />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
