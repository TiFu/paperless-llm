import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { ApprovalItem } from '../services/api/generated/models/ApprovalItem';
import { ApprovalItemProposedActionsInner } from '../services/api/generated/models/ApprovalItemProposedActionsInner';
import { DocumentActionViewer } from './DocumentActionViewer';

interface ApprovalCardProps {
  approval: ApprovalItem;
  onDecision: (
    stepId: string,
    decision: string,
    actions?: { id: string; newValue: string | null }[]
  ) => Promise<void>;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval, onDecision }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedActions, setEditedActions] = useState<ApprovalItemProposedActionsInner[]>(
    () => [...approval.proposedActions]
  );

  const handleActionsUpdate = async (updated: ApprovalItemProposedActionsInner[]) => {
    setEditedActions(updated);
  };

  const handleDecision = async (decision: string) => {
    setLoading(true);
    setError(null);
    try {
      const isApprove = decision.toLowerCase().includes('approve');
      const actions = isApprove
        ? editedActions.map((a) => ({ id: a.id, newValue: a.newValue ?? null }))
        : undefined;
      await onDecision(approval.stepId, decision, actions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process decision');
      setLoading(false);
    }
  };


  const getDecisionColor = (decision: string): 'success' | 'error' | 'primary' => {
    if (decision.toLowerCase().includes('approve')) return 'success';
    if (decision.toLowerCase().includes('reject')) return 'error';
    return 'primary';
  };

  const isApproveDisabled = (decision: string) =>
    decision.toLowerCase().includes('approve') && editedActions.length === 0;

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

        <DocumentActionViewer
          actions={editedActions}
          editable
          onUpdate={handleActionsUpdate}
        />

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
              disabled={loading || isApproveDisabled(decision)}
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
