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
import { apiClient } from '../services/api/api';
import { QueueItem } from '../services/api/generated/models/QueueItem';
import { WorkItemStatus } from '../services/api/generated/models/WorkItemStatus';
import { FalloutCard } from '../components/FalloutCard';
import { useStats } from '../contexts/StatsContext';

export const FalloutsPage: React.FC = () => {
  const [fallouts, setFallouts] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { adjustQueueStats } = useStats();

  const fetchFallouts = async (cursor?: string, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await apiClient.fetchQueueItems(50, cursor, WorkItemStatus.in_fallout);
      if (append) {
        setFallouts((prev) => [...prev, ...response.items]);
      } else {
        setFallouts(response.items);
      }
      setNextCursor(response.pagination.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fallouts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFallouts();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchFallouts();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (stepId: string) => {
    try {
      const response = await apiClient.retryStep(stepId);
      setSuccessMessage(response.message || 'Step retry initiated successfully');

      // Remove the retried item from the list
      setFallouts((prev) => prev.filter((fallout) => fallout.id !== stepId));

      // Optimistically update queue stats (one less in fallout, one more processing)
      adjustQueueStats({ failed: -1, processing: 1 });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      throw err; // Let FalloutCard handle the error display
    }
  };

  const handleCancel = async (stepId: string) => {
    try {
      const response = await apiClient.cancelStep(stepId);
      setSuccessMessage(response.message || 'Step cancelled successfully');

      // Remove the cancelled item from the list
      setFallouts((prev) => prev.filter((fallout) => fallout.id !== stepId));

      // Optimistically update queue stats (one less in fallout)
      adjustQueueStats({ failed: -1 });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      throw err; // Let FalloutCard handle the error display
    }
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchFallouts(nextCursor, true);
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
