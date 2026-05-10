import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ApprovalItem, DocumentActionType } from '../types/api';

interface ApprovalCardProps {
  approval: ApprovalItem;
  onDecision: (stepId: string, decision: string) => Promise<void>;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval, onDecision }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecision = async (decision: string) => {
    setLoading(true);
    setError(null);
    try {
      await onDecision(approval.stepId, decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process decision');
      setLoading(false);
    }
  };

  const formatActionType = (actionType: DocumentActionType) => {
    return actionType.replace(/_/g, ' ').toUpperCase();
  };

  const truncateContent = (content: string, maxLength: number = 500) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getDecisionColor = (decision: string) => {
    if (decision.toLowerCase().includes('approve')) return 'success';
    if (decision.toLowerCase().includes('reject')) return 'error';
    return 'default';
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {approval.documentTitle || 'Untitled Document'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip label={approval.jobType} size="small" variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                Document ID: {approval.documentId}
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {new Date(approval.createdAt).toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Document Preview
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {truncateContent(approval.documentContent)}
          </Typography>
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Proposed Changes
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Action Type</TableCell>
                <TableCell>Current Value</TableCell>
                <TableCell>Proposed Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approval.proposedActions.map((action, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip label={formatActionType(action.actionType)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                      {action.oldValue || '(empty)'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {action.newValue}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
        {approval.possibleDecisions.map((decision) => (
          <Button
            key={decision}
            variant="contained"
            color={getDecisionColor(decision)}
            onClick={() => handleDecision(decision)}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {decision}
          </Button>
        ))}
      </CardActions>
    </Card>
  );
};
