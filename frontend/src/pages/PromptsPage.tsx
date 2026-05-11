import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { apiClient } from '../services/api';
import { PromptResponse, StepType } from '../types/api';

export const PromptsPage: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptResponse | null>(null);
  const [editedTemplate, setEditedTemplate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.fetchPrompts();
      setPrompts(response.prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleEditClick = (prompt: PromptResponse) => {
    setEditingPrompt(prompt);
    setEditedTemplate(prompt.template);
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setEditingPrompt(null);
    setEditedTemplate('');
  };

  const handleSave = async () => {
    if (!editingPrompt) return;

    try {
      setSaving(true);
      setError(null);

      const updatedPrompt = await apiClient.updatePrompt(editingPrompt.stepType, editedTemplate);

      // Update the prompt in the list
      setPrompts((prev) =>
        prev.map((p) => (p.stepType === updatedPrompt.stepType ? updatedPrompt : p))
      );

      setSuccessMessage(`Prompt for "${updatedPrompt.stepType}" updated successfully (v${updatedPrompt.version})`);
      setTimeout(() => setSuccessMessage(null), 5000);

      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prompt');
    } finally {
      setSaving(false);
    }
  };

  const formatStepType = (stepType: StepType) => {
    return stepType.replace(/_/g, ' ');
  };

  const truncateTemplate = (template: string, maxLength: number = 100) => {
    if (template.length <= maxLength) return template;
    return template.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading prompts...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Prompt Templates
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure prompt templates for different step types. Templates use variables for dynamic content.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {prompts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No prompts configured
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Step Type</TableCell>
                <TableCell>Template Preview</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prompts.map((prompt) => (
                <TableRow key={prompt.stepType} hover>
                  <TableCell>
                    <Chip label={formatStepType(prompt.stepType)} color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {truncateTemplate(prompt.template)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`v${prompt.version}`} size="small" />
                  </TableCell>
                  <TableCell>{new Date(prompt.updatedAt).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditClick(prompt)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Prompt Template - {editingPrompt && formatStepType(editingPrompt.stepType)}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              Use variables like {'{{documentContent}}'}, {'{{documentTitle}}'} for dynamic content.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={15}
              value={editedTemplate}
              onChange={(e) => setEditedTemplate(e.target.value)}
              placeholder="Enter prompt template..."
              variant="outlined"
              sx={{ fontFamily: 'monospace' }}
            />
            {editingPrompt && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Current version: v{editingPrompt.version}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || editedTemplate.trim() === ''}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
