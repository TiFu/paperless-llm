import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { DocumentsPage } from './pages/DocumentsPage';
import { QueuesPage } from './pages/QueuesPage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { PromptsPage } from './pages/PromptsPage';
import { Sidebar } from './components/Sidebar';
import { StatsProvider } from './contexts/StatsContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 8, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h4" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <StatsProvider>
          <BrowserRouter>
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
              <Sidebar />
              <Box
                component="main"
                sx={{
                  flexGrow: 1,
                  p: 3,
                }}
              >
                <Routes>
                  <Route path="/" element={<Navigate to="/documents" replace />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/jobs/:id" element={<JobDetailsPage />} />
                  <Route path="/queues" element={<QueuesPage />} />
                  <Route path="/approvals" element={<ApprovalsPage />} />
                  <Route path="/prompts" element={<PromptsPage />} />
                  <Route path="*" element={<Navigate to="/documents" replace />} />
                </Routes>
              </Box>
            </Box>
          </BrowserRouter>
        </StatsProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
