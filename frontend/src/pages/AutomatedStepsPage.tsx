import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { AutomatedStepsStatsCard } from '../components/AutomatedStepsStatsCard';
import { AutomatedStepsItemsTable } from '../components/AutomatedStepsItemsTable';
import { WorkItemStatus } from '../services/api/generated/models/WorkItemStatus';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchQueueItems, setStatusFilter, clearError } from '../store/slices/queueSlice';
import { selectQueueStats } from '../store/slices/statsSlice';

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

export const AutomatedStepsPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const items = useAppSelector((state) => state.queue.items);
  const nextCursor = useAppSelector((state) => state.queue.nextCursor);
  const statusFilter = useAppSelector((state) => state.queue.statusFilter);
  const loading = useAppSelector((state) => state.queue.loading);
  const error = useAppSelector((state) => state.queue.error);
  const stats = useAppSelector(selectQueueStats);

  useEffect(() => {
    dispatch(fetchQueueItems({ statusFilter }));
  }, [statusFilter, dispatch]);

  const handleLoadMore = () => {
    if (nextCursor) {
      dispatch(fetchQueueItems({ cursor: nextCursor, append: true, statusFilter }));
    }
  };

  const handleStatusFilter = (status: WorkItemStatus | '') => {
    dispatch(setStatusFilter(status));
    // fetchQueueItems is triggered by the useEffect reacting to statusFilter change
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Automated Steps Monitoring
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor all automated processing steps across workflows.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {stats && (
        <Box sx={{ mb: 3 }}>
          <AutomatedStepsStatsCard title="Automated Steps Statistics" stats={stats} />
        </Box>
      )}

      <AutomatedStepsItemsTable
        items={items}
        loading={loading}
        nextCursor={nextCursor}
        statusFilter={statusFilter}
        onLoadMore={handleLoadMore}
        onStatusFilter={handleStatusFilter}
        type="unified"
      />
    </Container>
  );
};

