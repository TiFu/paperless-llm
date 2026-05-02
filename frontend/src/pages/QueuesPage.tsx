import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { QueueStatsCard } from '../components/QueueStatsCard';
import { QueueItemsTable } from '../components/QueueItemsTable';
import { apiClient } from '../services/api';
import {
  QueueStats,
  LLMQueueItem,
  DocumentUpdateQueueItem,
  WorkItemStatus,
} from '../types/api';

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

export const QueuesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // LLM Queue State
  const [llmStats, setLlmStats] = useState<QueueStats | null>(null);
  const [llmItems, setLlmItems] = useState<LLMQueueItem[]>([]);
  const [llmNextCursor, setLlmNextCursor] = useState<string | null>(null);
  const [llmStatusFilter, setLlmStatusFilter] = useState<WorkItemStatus | ''>('');

  // Document Update Queue State
  const [docUpdateStats, setDocUpdateStats] = useState<QueueStats | null>(null);
  const [docUpdateItems, setDocUpdateItems] = useState<DocumentUpdateQueueItem[]>([]);
  const [docUpdateNextCursor, setDocUpdateNextCursor] = useState<string | null>(null);
  const [docUpdateStatusFilter, setDocUpdateStatusFilter] = useState<WorkItemStatus | ''>('');

  const fetchLLMQueue = async (cursor?: string, append = false) => {
    try {
      const [stats, itemsResponse] = await Promise.all([
        apiClient.fetchLLMQueueStats(),
        apiClient.fetchLLMQueueItems(
          50,
          cursor,
          llmStatusFilter || undefined
        ),
      ]);

      setLlmStats(stats);
      if (append) {
        setLlmItems((prev) => [...prev, ...itemsResponse.items]);
      } else {
        setLlmItems(itemsResponse.items);
      }
      setLlmNextCursor(itemsResponse.pagination.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch LLM queue');
    }
  };

  const fetchDocUpdateQueue = async (cursor?: string, append = false) => {
    try {
      const [stats, itemsResponse] = await Promise.all([
        apiClient.fetchDocUpdateQueueStats(),
        apiClient.fetchDocUpdateQueueItems(
          50,
          cursor,
          docUpdateStatusFilter || undefined
        ),
      ]);

      setDocUpdateStats(stats);
      if (append) {
        setDocUpdateItems((prev) => [...prev, ...itemsResponse.items]);
      } else {
        setDocUpdateItems(itemsResponse.items);
      }
      setDocUpdateNextCursor(itemsResponse.pagination.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch document update queue');
    }
  };

  const fetchActiveQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 0) {
        await fetchLLMQueue();
      } else {
        await fetchDocUpdateQueue();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveQueue();

    // Set up auto-refresh
    const intervalId = setInterval(() => {
      // Only refresh if no filter is active
      if (activeTab === 0 && !llmStatusFilter) {
        fetchLLMQueue();
      } else if (activeTab === 1 && !docUpdateStatusFilter) {
        fetchDocUpdateQueue();
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, llmStatusFilter, docUpdateStatusFilter]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleLlmLoadMore = () => {
    if (llmNextCursor) {
      fetchLLMQueue(llmNextCursor, true);
    }
  };

  const handleDocUpdateLoadMore = () => {
    if (docUpdateNextCursor) {
      fetchDocUpdateQueue(docUpdateNextCursor, true);
    }
  };

  const handleLlmStatusFilter = (status: WorkItemStatus | '') => {
    setLlmStatusFilter(status);
    fetchLLMQueue(undefined, false);
  };

  const handleDocUpdateStatusFilter = (status: WorkItemStatus | '') => {
    setDocUpdateStatusFilter(status);
    fetchDocUpdateQueue(undefined, false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Queue Monitoring
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="LLM Queue" />
          <Tab label="Document Update Queue" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !llmStats && !docUpdateStats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {activeTab === 0 && llmStats && (
            <>
              <Box sx={{ mb: 3 }}>
                <QueueStatsCard title="LLM Queue Statistics" stats={llmStats} />
              </Box>
              <QueueItemsTable
                items={llmItems}
                nextCursor={llmNextCursor}
                onLoadMore={handleLlmLoadMore}
                onStatusFilter={handleLlmStatusFilter}
                type="llm"
              />
            </>
          )}

          {activeTab === 1 && docUpdateStats && (
            <>
              <Box sx={{ mb: 3 }}>
                <QueueStatsCard title="Document Update Queue Statistics" stats={docUpdateStats} />
              </Box>
              <QueueItemsTable
                items={docUpdateItems}
                nextCursor={docUpdateNextCursor}
                onLoadMore={handleDocUpdateLoadMore}
                onStatusFilter={handleDocUpdateStatusFilter}
                type="docUpdate"
              />
            </>
          )}
        </Box>
      )}
    </Container>
  );
};
