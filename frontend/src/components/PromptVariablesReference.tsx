import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { PromptVariable } from '../services/api/generated/models/PromptVariable';

interface PromptVariablesReferenceProps {
  variables: PromptVariable[];
}

/** Shared reference table of {{variable}} names/descriptions available in prompt templates — sourced from GET /api/settings, not hardcoded. */
export const PromptVariablesReference: React.FC<PromptVariablesReferenceProps> = ({ variables }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
      Available variables:
    </Typography>
    <TableContainer sx={{ mb: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ py: 0.5 }}>Variable</TableCell>
            <TableCell sx={{ py: 0.5 }}>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variables.map((variable) => (
            <TableRow key={variable.name}>
              <TableCell sx={{ py: 0.5, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {`{{${variable.name}}}`}
              </TableCell>
              <TableCell sx={{ py: 0.5 }}>
                <Typography variant="caption">{variable.description}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      The available* variables render as a list of XML elements (e.g. {'<availableTag description="...">Name</availableTag>'}); the description attribute is only present for entries with a description set on the Entity Descriptions page.
    </Typography>
  </Box>
);
