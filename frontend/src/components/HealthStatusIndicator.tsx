import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Circle as CircleIcon } from '@mui/icons-material';
import { apiClient } from '../services/api';
import { SystemHealthResponse, ServiceStatus } from '../types/api';

const POLL_INTERVAL = 30000; // 30 seconds

const StatusDot: React.FC<{ status: ServiceStatus | 'unknown'; label: string }> = ({ status, label }) => {
  const getColor = () => {
    if (status === 'healthy') return '#4caf50'; // green
    if (status === 'unhealthy') return '#f44336'; // red
    return '#9e9e9e'; // gray for unknown
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <CircleIcon sx={{ fontSize: 10, color: getColor() }} />
      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
        {label}
      </Typography>
    </Box>
  );
};

interface HealthStatusIndicatorProps {
  vertical?: boolean;
}

export const HealthStatusIndicator: React.FC<HealthStatusIndicatorProps> = ({ vertical = false }) => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const response = await apiClient.fetchSystemStatus();
      setHealth(response);
    } catch (err) {
      // On error, keep previous health state or set to null
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: vertical ? 'flex-start' : 'center', gap: vertical ? 1 : 2 }}>
      <StatusDot
        status={health?.components.database.status || 'unknown'}
        label="Database"
      />
      <StatusDot
        status={health?.components.paperless.status || 'unknown'}
        label="Paperless"
      />
      <StatusDot
        status={health?.components.llm.status || 'unknown'}
        label="LLM"
      />
    </Box>
  );
};
