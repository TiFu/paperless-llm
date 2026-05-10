import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';
import { QueueStats, ApprovalStats, JobStats } from '../types/api';

interface StatsContextValue {
  queueStats: QueueStats | null;
  approvalStats: ApprovalStats | null;
  jobStats: JobStats | null;
  loading: boolean;
  error: string | null;
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
      const [queue, approval, job] = await Promise.all([
        apiClient.fetchQueueStats(),
        apiClient.fetchApprovalStats(),
        apiClient.fetchJobStats(),
      ]);

      setQueueStats(queue);
      setApprovalStats(approval);
      setJobStats(job);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <StatsContext.Provider value={{ queueStats, approvalStats, jobStats, loading, error }}>
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
