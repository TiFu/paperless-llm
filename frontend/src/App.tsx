import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  CssBaseline,
  ThemeProvider,
  createTheme,
  CircularProgress,
} from '@mui/material';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { bootstrap, logout, selectAuthStatus } from './store/slices/authSlice';
import { onUnauthorized } from './services/auth/tokenStorage';
import { DocumentsPage } from './pages/DocumentsPage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { FalloutsPage } from './pages/FalloutsPage';
import { PromptsPage } from './pages/PromptsPage';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { AutomatedStepsPage } from './pages/AutomatedStepsPage';
import { StepDetailsPage } from './pages/StepDetailsPage';
import { EntityDescriptionsPage } from './pages/EntityDescriptionsPage';
import { WorkerExecutionsPage } from './pages/WorkerExecutionsPage';
import { WorkerExecutionDetailsPage } from './pages/WorkerExecutionDetailsPage';

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

const AuthenticatedLayout: React.FC = () => (
  <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    <Sidebar />
    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <Outlet />
    </Box>
  </Box>
);

const RequireAuth: React.FC = () => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(bootstrap());
    }
  }, [status, dispatch]);

  useEffect(() => {
    return onUnauthorized(() => {
      dispatch(logout());
    });
  }, [dispatch]);

  if (status === 'idle' || status === 'loading') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <AuthenticatedLayout />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Provider store={store}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Navigate to="/documents" replace />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/jobs/:id" element={<JobDetailsPage />} />
                <Route path="/queues" element={<AutomatedStepsPage />} />
                <Route path="/steps/:stepId" element={<StepDetailsPage />} />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/fallouts" element={<FalloutsPage />} />
                <Route path="/prompts" element={<PromptsPage />} />
                <Route path="/entities" element={<EntityDescriptionsPage />} />
                <Route path="/workers" element={<WorkerExecutionsPage />} />
                <Route path="/workers/:id" element={<WorkerExecutionDetailsPage />} />
                <Route path="*" element={<Navigate to="/documents" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </Provider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
