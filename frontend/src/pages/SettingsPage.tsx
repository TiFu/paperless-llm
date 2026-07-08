import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
  Divider,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Save as SaveIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSettings,
  updateSettings,
  clearSuccessMessage,
  clearError,
  selectSettings,
  selectSettingsLoading,
  selectSettingsSaving,
  selectSettingsError,
  selectSettingsSuccessMessage,
} from '../store/slices/settingsSlice';
import { selectCanEditSettings } from '../store/slices/authSlice';
import { UpdateSettingsRequest } from '../services/api/generated/models/UpdateSettingsRequest';
import { AutoProcessTagEntry, AutoProcessTagEntryFieldsEnum } from '../services/api/generated/models/AutoProcessTagEntry';
import { WorkflowType } from '../services/api/generated/models/WorkflowType';
import { NumberField } from '../components/NumberField';

const ALL_FIELDS = Object.values(AutoProcessTagEntryFieldsEnum);

function toFormState(settings: NonNullable<ReturnType<typeof selectSettings>>): UpdateSettingsRequest {
  return {
    paperless: { tags: settings.paperless.tags ?? '', autoProcessTags: settings.paperless.autoProcessTags },
    workers: settings.workers,
    retry: settings.retry,
    llm: settings.llm,
  };
}

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectSettings);
  const loading = useAppSelector(selectSettingsLoading);
  const saving = useAppSelector(selectSettingsSaving);
  const error = useAppSelector(selectSettingsError);
  const successMessage = useAppSelector(selectSettingsSuccessMessage);
  const canEdit = useAppSelector(selectCanEditSettings);

  const [form, setForm] = useState<UpdateSettingsRequest | null>(null);

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (settings) setForm(toFormState(settings));
  }, [settings]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => dispatch(clearSuccessMessage()), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  if (loading || !form) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading settings...
        </Typography>
      </Container>
    );
  }

  const handleSave = async () => {
    await dispatch(updateSettings(form));
  };

  const updateAutoProcessTag = (index: number, patch: Partial<AutoProcessTagEntry>) => {
    setForm({
      ...form,
      paperless: {
        ...form.paperless,
        autoProcessTags: form.paperless.autoProcessTags.map((t, i) => (i === index ? { ...t, ...patch } : t)),
      },
    });
  };

  const removeAutoProcessTag = (index: number) => {
    setForm({
      ...form,
      paperless: {
        ...form.paperless,
        autoProcessTags: form.paperless.autoProcessTags.filter((_, i) => i !== index),
      },
    });
  };

  const addAutoProcessTag = () => {
    setForm({
      ...form,
      paperless: {
        ...form.paperless,
        autoProcessTags: [...form.paperless.autoProcessTags, { tag: '', fields: [...ALL_FIELDS], workflowType: WorkflowType.automated }],
      },
    });
  };

  const disabled = !canEdit || saving;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Non-technical settings, live-editable without a restart. Applies to this process immediately and to every
        other server/worker process within a few seconds.
      </Typography>

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You can view settings but not edit them. Editing requires being a superuser or admin in Paperless — log in
          again after a role change to pick it up.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => dispatch(clearSuccessMessage())}>
          {successMessage}
        </Alert>
      )}

      {/* Connected systems (read-only) */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Connected Systems
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Paperless URL</Typography>
            <Typography variant="body2">{settings?.connectedSystems.paperlessUrl}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">LLM URL</Typography>
            <Typography variant="body2">{settings?.connectedSystems.llmUrl}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Database host</Typography>
            <Typography variant="body2">{settings?.connectedSystems.databaseHost}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Document filter */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Document Filter
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The default tag filter applied when browsing/listing documents in this app. Independent of automated
          pickup below.
        </Typography>
        <TextField
          fullWidth
          label="Default tag filter"
          helperText="Single tag used as the default filter when listing documents"
          value={form.paperless.tags ?? ''}
          disabled={disabled}
          onChange={(e) => setForm({ ...form, paperless: { ...form.paperless, tags: e.target.value } })}
        />
      </Paper>

      {/* Automated document pickup */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Automated Document Pickup
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tags that trigger automatic processing when the Auto-Queue worker (below) is enabled. A document carrying
          more than one of these tags is processed once, with the union of every matching tag's fields.
        </Typography>
        {form.paperless.autoProcessTags.map((entry, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              label="Tag"
              size="small"
              value={entry.tag}
              disabled={disabled}
              onChange={(e) => updateAutoProcessTag(index, { tag: e.target.value })}
            />
            <Select
              multiple
              size="small"
              value={entry.fields ?? []}
              disabled={disabled}
              onChange={(e) => updateAutoProcessTag(index, { fields: e.target.value as AutoProcessTagEntryFieldsEnum[] })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((v) => (
                    <Chip key={v} label={v} size="small" />
                  ))}
                </Box>
              )}
              sx={{ minWidth: 220 }}
            >
              {ALL_FIELDS.map((field) => (
                <MenuItem key={field} value={field}>
                  {field}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={entry.workflowType ?? WorkflowType.automated}
              disabled={disabled}
              onChange={(e) => updateAutoProcessTag(index, { workflowType: e.target.value as WorkflowType })}
            >
              <MenuItem value={WorkflowType.automated}>automated</MenuItem>
              <MenuItem value={WorkflowType.approval}>approval</MenuItem>
            </Select>
            <IconButton onClick={() => removeAutoProcessTag(index)} disabled={disabled} size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button startIcon={<AddIcon />} onClick={addAutoProcessTag} disabled={disabled} size="small">
          Add tag
        </Button>
      </Paper>

      {/* Worker loops */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Worker Loops
        </Typography>

        {/* Step Execution */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={form.workers.stepExecution.enabled}
                disabled={disabled}
                onChange={(e) =>
                  setForm({ ...form, workers: { ...form.workers, stepExecution: { ...form.workers.stepExecution, enabled: e.target.checked } } })
                }
              />
            }
            label={<Typography variant="subtitle1">Step Execution</Typography>}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, ml: 6 }}>
            Claims and executes waiting workflow steps. Disabling this pauses all document processing.
          </Typography>
          <Grid container spacing={2} sx={{ pl: 6 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Batch size"
                value={form.workers.stepExecution.batchSize}
                disabled={disabled || !form.workers.stepExecution.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    workers: { ...form.workers, stepExecution: { ...form.workers.stepExecution, batchSize: Number(e.target.value) } },
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <NumberField
                fullWidth
                label="Poll interval (ms)"
                value={form.workers.stepExecution.pollIntervalMs}
                disabled={disabled || !form.workers.stepExecution.enabled}
                onChange={(v) =>
                  setForm({ ...form, workers: { ...form.workers, stepExecution: { ...form.workers.stepExecution, pollIntervalMs: v } } })
                }
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Stuck-Step Reset */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={form.workers.stuckStepReset.enabled}
                disabled={disabled}
                onChange={(e) =>
                  setForm({ ...form, workers: { ...form.workers, stuckStepReset: { ...form.workers.stuckStepReset, enabled: e.target.checked } } })
                }
              />
            }
            label={<Typography variant="subtitle1">Stuck-Step Reset</Typography>}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, ml: 6 }}>
            Recovers steps left claimed by a crashed or hung worker so they can retry.
          </Typography>
          <Grid container spacing={2} sx={{ pl: 6 }}>
            <Grid item xs={12} sm={6}>
              <NumberField
                fullWidth
                label="Stuck timeout (ms)"
                value={form.workers.stuckStepReset.timeoutMs}
                disabled={disabled || !form.workers.stuckStepReset.enabled}
                onChange={(v) =>
                  setForm({ ...form, workers: { ...form.workers, stuckStepReset: { ...form.workers.stuckStepReset, timeoutMs: v } } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <NumberField
                fullWidth
                label="Check interval (ms)"
                value={form.workers.stuckStepReset.checkIntervalMs}
                disabled={disabled || !form.workers.stuckStepReset.enabled}
                onChange={(v) =>
                  setForm({ ...form, workers: { ...form.workers, stuckStepReset: { ...form.workers.stuckStepReset, checkIntervalMs: v } } })
                }
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Entity Sync */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={form.workers.entitySync.enabled}
                disabled={disabled}
                onChange={(e) =>
                  setForm({ ...form, workers: { ...form.workers, entitySync: { ...form.workers.entitySync, enabled: e.target.checked } } })
                }
              />
            }
            label={<Typography variant="subtitle1">Entity Sync</Typography>}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, ml: 6 }}>
            Refreshes cached tag/correspondent/document-type descriptions from Paperless.
          </Typography>
          <Grid container spacing={2} sx={{ pl: 6 }}>
            <Grid item xs={12} sm={6}>
              <NumberField
                fullWidth
                label="Poll interval (ms)"
                value={form.workers.entitySync.pollIntervalMs}
                disabled={disabled || !form.workers.entitySync.enabled}
                onChange={(v) =>
                  setForm({ ...form, workers: { ...form.workers, entitySync: { ...form.workers.entitySync, pollIntervalMs: v } } })
                }
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Auto-Queue */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={form.workers.autoQueue.enabled}
                disabled={disabled}
                onChange={(e) =>
                  setForm({ ...form, workers: { ...form.workers, autoQueue: { ...form.workers.autoQueue, enabled: e.target.checked } } })
                }
              />
            }
            label={<Typography variant="subtitle1">Auto-Queue</Typography>}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, ml: 6 }}>
            Periodically checks Paperless for documents carrying the tags configured above and creates jobs for them
            automatically.
          </Typography>
          <Grid container spacing={2} sx={{ pl: 6 }}>
            <Grid item xs={12} sm={6}>
              <NumberField
                fullWidth
                label="Poll interval (ms)"
                value={form.workers.autoQueue.pollIntervalMs}
                disabled={disabled || !form.workers.autoQueue.enabled}
                onChange={(v) =>
                  setForm({ ...form, workers: { ...form.workers, autoQueue: { ...form.workers.autoQueue, pollIntervalMs: v } } })
                }
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Retry policy */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Retry Policy
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Max retries"
              value={form.retry.maxRetries}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, retry: { ...form.retry, maxRetries: Number(e.target.value) } })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <NumberField
              fullWidth
              label="Base retry delay (ms)"
              value={form.retry.retryDelayInMs}
              disabled={disabled}
              onChange={(v) => setForm({ ...form, retry: { ...form.retry, retryDelayInMs: v } })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Backoff exponent"
              value={form.retry.retryExponent}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, retry: { ...form.retry, retryExponent: Number(e.target.value) } })}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* LLM */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          LLM
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Model"
              value={form.llm.model}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, llm: { ...form.llm, model: e.target.value } })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Temperature (0-2)"
              inputProps={{ step: 0.1, min: 0, max: 2 }}
              value={form.llm.temperature}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, llm: { ...form.llm, temperature: Number(e.target.value) } })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <NumberField
              fullWidth
              label="Request timeout (ms)"
              value={form.llm.timeoutMs}
              disabled={disabled}
              onChange={(v) => setForm({ ...form, llm: { ...form.llm, timeoutMs: v } })}
            />
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={disabled}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Box>
    </Container>
  );
};
