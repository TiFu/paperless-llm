import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { QueueStatsCard } from '../components/QueueStatsCard';
import { QueueItemsTable } from '../components/QueueItemsTable';
import { apiClient } from '../services/api';
import {
  QueueStats,
  QueueItem,
  WorkItemStatus,
} from '../types/api';

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

export const QueuesPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified Queue State
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WorkItemStatus | ''>('');

  const fetchQueue = async (cursor?: string, append = false) => {
    try {
      const [statsResponse, itemsResponse] = await Promise.all([
        apiClient.fetchQueueStats(),
        apiClient.fetchQueueItems(
          50,
          cursor,
          statusFilter || undefined
        ),
      ]);

      setStats(statsResponse);
      if (append) {
        setItems((prev) => [...prev, ...itemsResponse.items]);
      } else {
        setItems(itemsResponse.items);
      }
      setNextCursor(itemsResponse.pagination.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchQueue();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up auto-refresh
    const intervalId = setInterval(() => {
      // Only refresh if no filter is active
      if (!statusFilter) {
        fetchQueue();
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchQueue(nextCursor, true);
    }
  };

  const handleStatusFilter = (status: WorkItemStatus | '') => {
    setStatusFilter(status);
    fetchQueue(undefined, false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Queue Monitoring
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor all automated processing steps across workflows.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !stats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {stats && (
            <>
              <Box sx={{ mb: 3 }}>
                <QueueStatsCard title="Queue Statistics" stats={stats} />
              </Box>
              <QueueItemsTable
                items={items}
                nextCursor={nextCursor}
                onLoadMore={handleLoadMore}
                onStatusFilter={handleStatusFilter}
                type="unified"
              />
            </>
          )}
        </Box>
      )}
    </Container>
  );
};
