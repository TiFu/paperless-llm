import React, { useState } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Badge,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Queue as QueueIcon,
  History as HistoryIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  Menu as MenuIcon,
  TextSnippet as TextSnippetIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useStats } from '../contexts/StatsContext';
import { HealthStatusIndicator } from './HealthStatusIndicator';

const DRAWER_WIDTH = 280;

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  nested?: boolean;
  badgeColor?: 'error' | 'warning' | 'info' | 'success';
  getBadgeCount?: () => number;
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { queueStats, approvalStats, jobStats } = useStats();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const navItems: NavItem[] = [
    {
      path: '/documents',
      label: 'Documents',
      icon: <DescriptionIcon />,
    },
    {
      path: '/jobs',
      label: 'Jobs',
      icon: <WorkIcon />,
      getBadgeCount: () => {
        if (!jobStats) return 0;
        return (
          jobStats.pending +
          jobStats.llmProcessing +
          jobStats.pendingApproval +
          jobStats.updatingDocument
        );
      },
      // Add sub-items for jobs (Automated Steps last)
    },
    {
      path: '/approvals',
      label: 'Approvals',
      icon: <CheckCircleIcon />, 
      nested: true,
      getBadgeCount: () => {
        if (!approvalStats) return 0;
        return approvalStats.pendingCount;
      },
    },
    {
      path: '/fallouts',
      label: 'Fallouts',
      icon: <ErrorIcon />, 
      nested: true,
      badgeColor: 'warning',
      getBadgeCount: () => {
        // inFallout removed: not present on QueueStats
        return 0;
      },
    },
    // Automated Steps as last sub-item under Jobs
    {
      path: '/queues',
      label: 'Automated Steps',
      icon: <QueueIcon />, 
      nested: true,
      getBadgeCount: () => {
        if (!queueStats) return 0;
        return queueStats.pending + queueStats.processing;
      },
    },
    {
      path: '/prompts',
      label: 'Prompts',
      icon: <TextSnippetIcon />,
    },
    {
      path: '/audit',
      label: 'Audit Log',
      icon: <HistoryIcon />,
    },
  ];

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" component="div" noWrap sx={{ color: 'white' }}>
          Paperless LLM
        </Typography>
      </Box>

      {/* Navigation List */}
      <List sx={{ flexGrow: 0, py: 1 }}>
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const badgeCount = item.getBadgeCount ? item.getBadgeCount() : undefined;
          const badgeColor = item.badgeColor || 'error';

          return (
            <React.Fragment key={item.path}>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={isActive}
                onClick={handleNavigation}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  color: 'rgba(255, 255, 255, 0.7)',
                  pl: item.nested ? 4 : 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.24)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: item.nested ? 36 : 40 }}>
                  {badgeCount !== undefined ? (
                    <Badge
                      badgeContent={badgeCount}
                      color={badgeColor}
                      max={999}
                      overlap="circular"
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
              {/* subItems removed: not present on NavItem */}
              {index < navItems.length - 1 && !item.nested && !navItems[index + 1]?.nested && (
                <Divider sx={{ my: 1, mx: 2, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
              )}
            </React.Fragment>
          );
        })}
      </List>

      {/* Spacer to push health indicator to bottom */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Health Status at Bottom */}
      <Box>
        <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" sx={{ mb: 1, display: 'block', color: 'rgba(255, 255, 255, 0.7)' }}>
            System Status
          </Typography>
          <HealthStatusIndicator vertical />
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ position: 'fixed', top: 8, left: 8, zIndex: 1300 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: 'primary.main',
            borderRight: 'none',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};
