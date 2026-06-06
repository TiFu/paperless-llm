import React from 'react';
import { ApprovalItemProposedActionsInner } from '@/services/api/generated';
import {
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DeleteOutline } from '@mui/icons-material';
import { DocumentActionDisplay } from './DocumentActionDisplay';

interface DocumentActionViewerProps {
  actions: ApprovalItemProposedActionsInner[];
  editable: boolean;
  onUpdate: (editedActions: ApprovalItemProposedActionsInner[]) => Promise<void>;
}

const formatActionType = (actionType: string) => {
  return actionType.replace(/_/g, ' ').toUpperCase();
};

export const DocumentActionViewer: React.FC<DocumentActionViewerProps> = ({
  actions,
  editable,
  onUpdate,
}) => {
  const handleValueChange = (id: string, newValue: string) => {
    const updated = actions.map((a) => (a.id === id ? { ...a, newValue } : a));
    void onUpdate(updated);
  };

  const handleRemoveAction = (id: string) => {
    const updated = actions.filter((a) => a.id !== id);
    void onUpdate(updated);
  };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Action Type</TableCell>
            <TableCell>Current Value</TableCell>
            <TableCell>Proposed Value</TableCell>
            {editable && <TableCell padding="checkbox" />}
          </TableRow>
        </TableHead>
        <TableBody>
          {actions.map((action) => (
            <TableRow key={action.id}>
              <TableCell>
                <Chip label={formatActionType(action.actionType)} size="small" />
              </TableCell>
              <TableCell>
                <Box sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                  <DocumentActionDisplay
                    action={action}
                    value={action.oldValue ?? null}
                    editable={false}
                  />
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: 220 }}>
                <DocumentActionDisplay
                  action={action}
                  value={action.newValue ?? null}
                  editable={editable}
                  onChange={(newValue) => handleValueChange(action.id, newValue)}
                />
              </TableCell>
              {editable && (
                <TableCell padding="checkbox">
                  <Tooltip title="Remove this action">
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveAction(action.id)}
                      color="error"
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
          {editable && actions.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                  All actions removed, nothing to display.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
