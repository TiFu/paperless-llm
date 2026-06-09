import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Sync as SyncIcon, Save as SaveIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchEntityDescriptions,
  syncEntityDescriptions,
  saveEntityDescriptions,
  setPendingDescription,
  clearPendingForType,
} from '../store/slices/entityDescriptionsSlice';

export const EntityDescriptionsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { entityTypes, loaded, loading, syncing, error } = useAppSelector(
    (state) => state.entityDescriptions,
  );
  const pendingDescriptions = useAppSelector(
    (state) => state.entityDescriptions.pendingDescriptions,
  );

  const [activeTab, setActiveTab] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) {
      dispatch(fetchEntityDescriptions());
    }
  }, [dispatch, loaded]);

  const activeType = entityTypes[activeTab];

  const getPending = (type: string, paperlessId: number): string | null | undefined =>
    pendingDescriptions[`${type}:${paperlessId}`];

  const hasPendingForTab = activeType
    ? activeType.entities.some(
        (e) => getPending(activeType.type, e.paperlessId) !== undefined,
      )
    : false;

  const handleDescriptionChange = (paperlessId: number, value: string) => {
    if (!activeType) return;
    dispatch(setPendingDescription({ type: activeType.type, paperlessId, description: value || null }));
  };

  const handleSave = async () => {
    if (!activeType) return;
    setSaveError(null);
    setSaveSuccess(null);

    const updates = activeType.entities
      .filter((e) => getPending(activeType.type, e.paperlessId) !== undefined)
      .map((e) => ({
        paperlessId: e.paperlessId,
        description: getPending(activeType.type, e.paperlessId) ?? null,
      }));

    try {
      await dispatch(saveEntityDescriptions({ type: activeType.type, updates })).unwrap();
      setSaveSuccess(`Saved ${updates.length} description${updates.length !== 1 ? 's' : ''}`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch {
      setSaveError('Failed to save descriptions');
    }
  };

  const handleSync = async () => {
    setSaveError(null);
    try {
      await dispatch(syncEntityDescriptions()).unwrap();
    } catch {
      setSaveError('Sync failed');
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Entity Descriptions</Typography>
        <Button
          variant="outlined"
          startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Sync from Paperless'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
      {saveSuccess && <Alert severity="success" sx={{ mb: 2 }}>{saveSuccess}</Alert>}

      {entityTypes.length === 0 ? (
        <Alert severity="info">
          No entities found. Click "Sync from Paperless" to load entities.
        </Alert>
      ) : (
        <Paper>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            {entityTypes.map((et) => (
              <Tab key={et.type} label={et.label} />
            ))}
          </Tabs>

          {activeType && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={!hasPendingForTab}
                >
                  Save Changes
                </Button>
              </Box>

              {activeType.entities.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  No {activeType.label.toLowerCase()} found.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '30%', fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeType.entities.map((entity) => {
                      const pending = getPending(activeType.type, entity.paperlessId);
                      const value = pending !== undefined ? (pending ?? '') : (entity.description ?? '');
                      const isDirty = pending !== undefined;

                      return (
                        <TableRow
                          key={entity.paperlessId}
                          sx={isDirty ? { backgroundColor: 'action.hover' } : undefined}
                        >
                          <TableCell>{entity.name}</TableCell>
                          <TableCell>
                            <TextField
                              fullWidth
                              multiline
                              maxRows={4}
                              size="small"
                              placeholder="Add a description..."
                              value={value}
                              onChange={(e) => handleDescriptionChange(entity.paperlessId, e.target.value)}
                              variant="standard"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
};
