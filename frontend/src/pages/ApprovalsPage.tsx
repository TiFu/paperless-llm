import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import { ApprovalCard } from '../components/ApprovalCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchApprovals,
  processApprovalDecision,
  clearSuccessMessage,
} from '../store/slices/approvalsSlice';

export const ApprovalsPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const approvals = useAppSelector((state) => state.approvals.approvals);
  const loading = useAppSelector((state) => state.approvals.loading);
  const loadingMore = useAppSelector((state) => state.approvals.loadingMore);
  const error = useAppSelector((state) => state.approvals.error);
  const nextCursor = useAppSelector((state) => state.approvals.nextCursor);
  const successMessage = useAppSelector((state) => state.approvals.successMessage);

  useEffect(() => {
    dispatch(fetchApprovals());

    /*
    const interval = setInterval(() => {
      dispatch(fetchApprovals());
    }, 10000);

    return () => clearInterval(interval);*/
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => dispatch(clearSuccessMessage()), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleDecision = async (
    stepId: string,
    decision: string,
    actions?: { id: string; newValue: string | null }[]
  ) => {
    await dispatch(processApprovalDecision({ stepId, decision, actions })).unwrap();
    // unwrap() re-throws on rejection so ApprovalCard can handle the error
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      dispatch(fetchApprovals({ append: true }));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading approvals...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Pending Approvals
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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

