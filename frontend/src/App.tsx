import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Queue as QueueIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { DocumentsPage } from './pages/DocumentsPage';
import { QueuesPage } from './pages/QueuesPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { PromptsPage } from './pages/PromptsPage';
import { JobDetailsPage } from './pages/JobDetailsPage';

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
        <Container maxWidth="md" sx={{ py: 8 }}>
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
        </Container>
      );
    }

    return this.props.children;
  }
}

const Navigation: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          Paperless LLM
        </Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/documents"
            startIcon={<DescriptionIcon />}
          >
            Documents
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/queues"
            startIcon={<QueueIcon />}
          >
            Queue
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/approvals"
            startIcon={<CheckCircleIcon />}
          >
            Approvals
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/prompts"
            startIcon={<SettingsIcon />}
          >
            Prompts
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<Navigate to="/documents" replace />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/queues" element={<QueuesPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/prompts" element={<PromptsPage />} />
            <Route path="/jobs/:id" element={<JobDetailsPage />} />
            <Route path="*" element={<Navigate to="/documents" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
