import React, { useState } from 'react';
import {
  Card,
  CardContent,
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
  Link,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { ApprovalItem } from '../types/api';

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

  const formatActionType = (actionType: string) => {
    return actionType.replace(/_/g, ' ').toUpperCase();
  };

  const getDecisionColor = (decision: string): 'success' | 'error' | 'primary' => {
    if (decision.toLowerCase().includes('approve')) return 'success';
    if (decision.toLowerCase().includes('reject')) return 'error';
    return 'primary';
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {`Job #${approval.jobId.slice(0, 8)} - Document "${approval.document?.title || approval.documentId}"`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip label={approval.jobType} size="small" variant="outlined" />
              {approval.paperlessUrl && (
                <Link href={approval.paperlessUrl} target="_blank" rel="noopener" sx={{ ml: 1 }} underline="hover">
                  View in Paperless <OpenInNew fontSize="small" sx={{ verticalAlign: 'middle' }} />
                </Link>
              )}
            </Box>
            {/* Document content preview removed as per requirements */}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {new Date(approval.createdAt).toLocaleString()}
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
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
        </Box>

        {/* Removed duplicate 'View Document in Paperless' link from bottom of card as per requirements */}
      </CardContent>
    </Card>
  );
};
