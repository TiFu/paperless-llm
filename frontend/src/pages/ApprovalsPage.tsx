import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import { apiClient } from '../services/api';
import { ApprovalItem } from '../types/api';
import { ApprovalCard } from '../components/ApprovalCard';

export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchApprovals = async (cursor?: string, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await apiClient.fetchPendingApprovals(50, cursor);

      if (append) {
        setApprovals((prev) => [...prev, ...response.items]);
      } else {
        setApprovals(response.items);
      }
      setNextCursor(response.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchApprovals();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchApprovals();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (stepId: string, decision: string) => {
    try {
      const response = await apiClient.processApprovalDecision(stepId, { decision });
      setSuccessMessage(response.message || `Decision "${decision}" processed successfully`);

      // Remove the approved/rejected item from the list
      setApprovals((prev) => prev.filter((approval) => approval.stepId !== stepId));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      throw err; // Let ApprovalCard handle the error display
    }
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchApprovals(nextCursor, true);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading approvals...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Pending Approvals
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Review and approve or reject proposed document changes.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {approvals.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No pending approvals
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            All approval requests have been processed.
          </Typography>
        </Paper>
      ) : (
        <>
          <Box>
            {approvals.map((approval) => (
              <ApprovalCard key={approval.stepId} approval={approval} onDecision={handleDecision} />
            ))}
          </Box>

          {nextCursor && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};
