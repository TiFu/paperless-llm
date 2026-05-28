import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';
import { QueueStats } from '../services/api/generated/models/QueueStats';
import { ApprovalStats } from '../services/api/generated/models/ApprovalStats';
import { JobStats } from '../services/api/generated/models/JobStats';

interface StatsContextValue {
  queueStats: QueueStats | null;
  approvalStats: ApprovalStats | null;
  jobStats: JobStats | null;
  loading: boolean;
  error: string | null;
  // Optimistic update methods
  decrementApprovalCount: () => void;
  adjustQueueStats: (changes: { failed?: number; retrying?: number; processing?: number }) => void;
}

const StatsContext = createContext<StatsContextValue | undefined>(undefined);

const POLL_INTERVAL = 10000; // 10 seconds

export const StatsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const stats = await apiClient.fetchDashboardStats();

      setQueueStats(stats.queue);
      setApprovalStats(stats.approvals);
      setJobStats(stats.jobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Optimistic update: decrement approval count after processing an approval
  const decrementApprovalCount = () => {
    setApprovalStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pendingCount: Math.max(0, prev.pendingCount - 1),
      };
    });
  };

  // Optimistic update: adjust queue stats after retry/cancel actions
  const adjustQueueStats = (changes: { failed?: number; retrying?: number; processing?: number }) => {
    setQueueStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        failed: Math.max(0, prev.failed + (changes.failed || 0)),
        processing: Math.max(0, prev.processing + (changes.processing || 0)),
        // Note: retrying is not in QueueStats interface, but processing covers in-progress retries
      };
    });
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <StatsContext.Provider 
      value={{ 
        queueStats, 
        approvalStats, 
        jobStats, 
        loading, 
        error,
        decrementApprovalCount,
        adjustQueueStats,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = (): StatsContextValue => {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
};
