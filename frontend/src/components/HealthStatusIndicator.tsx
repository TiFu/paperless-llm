import React, { useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Typography,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Circle as CircleIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/api';
import { SystemHealthResponse, ServiceStatus } from '../types/api';

const POLL_INTERVAL = 30000; // 30 seconds

const StatusIndicator: React.FC<{ status: ServiceStatus; label: string }> = ({ status, label }) => {
  const color = status === 'healthy' ? 'success' : 'error';
  const icon = <CircleIcon sx={{ fontSize: 12 }} />;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        variant="outlined"
      />
    </Box>
  );
};

export const HealthStatusIndicator: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const fetchHealth = async () => {
    try {
      const response = await apiClient.fetchSystemStatus();
      setHealth(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Calculate overall status color
  const getStatusColor = (): 'success' | 'error' | 'warning' => {
    if (error || !health) return 'error';
    if (health.status === 'healthy') return 'success';
    return 'warning';
  };

  const statusColor = getStatusColor();

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: statusColor === 'success' ? '#4caf50' : statusColor === 'warning' ? '#ff9800' : '#f44336',
            border: '2px solid white',
            zIndex: 1,
          },
        }}
      >
        <HealthIcon />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 240 }}>
          <Typography variant="h6" gutterBottom>
            System Health
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          {health && !loading && (
            <Stack spacing={1.5}>
              <StatusIndicator
                status={health.components.database.status}
                label="Database"
              />
              <StatusIndicator
                status={health.components.paperless.status}
                label="Paperless"
              />
              <StatusIndicator
                status={health.components.llm.status}
                label="LLM Service"
              />

              <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
                Last checked: {new Date(health.timestamp).toLocaleTimeString()}
              </Typography>
            </Stack>
          )}
        </Box>
      </Popover>
    </>
  );
};
