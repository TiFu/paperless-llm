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
import { FalloutCard } from '../components/FalloutCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchFallouts,
  retryFallout,
  cancelFallout,
  clearSuccessMessage,
} from '../store/slices/falloutsSlice';

export const FalloutsPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const fallouts = useAppSelector((state) => state.fallouts.fallouts);
  const loading = useAppSelector((state) => state.fallouts.loading);
  const loadingMore = useAppSelector((state) => state.fallouts.loadingMore);
  const error = useAppSelector((state) => state.fallouts.error);
  const nextCursor = useAppSelector((state) => state.fallouts.nextCursor);
  const successMessage = useAppSelector((state) => state.fallouts.successMessage);

  useEffect(() => {
    dispatch(fetchFallouts());

    // TODO: the refresh is a bit awkward due to the cursor scrolling... 
    // we disable for now
    /*
    const interval = setInterval(() => {
      dispatch(fetchFallouts());
    }, 10000);

    return () => clearInterval(interval);*/
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => dispatch(clearSuccessMessage()), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleRetry = async (stepId: string) => {
    await dispatch(retryFallout(stepId)).unwrap();
    // unwrap() re-throws on rejection so FalloutCard can handle the error
  };

  const handleCancel = async (stepId: string) => {
    await dispatch(cancelFallout(stepId)).unwrap();
    // unwrap() re-throws on rejection so FalloutCard can handle the error
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      dispatch(fetchFallouts({ append: true }));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading fallouts...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Fallouts
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Steps that have exhausted all automatic retry attempts and require manual intervention.
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

      {fallouts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="success.main" sx={{ mb: 1 }}>
            ✓ No fallouts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All systems running smoothly. No steps require manual intervention.
          </Typography>
        </Paper>
      ) : (
        <>
          <Box>
            {fallouts.map((fallout) => (
              <FalloutCard 
                key={fallout.id} 
                fallout={fallout} 
                onRetry={handleRetry} 
                onCancel={handleCancel}
              />
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

