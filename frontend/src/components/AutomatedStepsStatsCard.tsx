import React from 'react';
import { Card, CardContent, Typography, Grid, Chip, Box } from '@mui/material';
import { QueueStats } from '../types/api';

interface AutomatedStepsStatsCardProps {
  title: string;
  stats: QueueStats;
}

export const AutomatedStepsStatsCard: React.FC<AutomatedStepsStatsCardProps> = ({ title, stats }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Box textAlign="center">
              <Chip
                label={stats.pending}
                color="default"
                sx={{ fontSize: '1.5rem', height: 40, '& .MuiChip-label': { px: 2 } }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Pending
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Box textAlign="center">
              <Chip
                label={stats.processing}
                color="info"
                sx={{ fontSize: '1.5rem', height: 40, '& .MuiChip-label': { px: 2 } }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Processing
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Box textAlign="center">
              <Chip
                label={stats.completed}
                color="success"
                sx={{ fontSize: '1.5rem', height: 40, '& .MuiChip-label': { px: 2 } }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Completed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Box textAlign="center">
              <Chip
                label={stats.failed}
                color="error"
                sx={{ fontSize: '1.5rem', height: 40, '& .MuiChip-label': { px: 2 } }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Failed
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
