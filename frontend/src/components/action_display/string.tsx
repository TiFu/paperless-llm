import type { FC } from 'react';
import { TextField, Typography } from '@mui/material';
import type { ActionDisplayProps, ActionViewProps } from './props';
import { EMPTY_VALUE } from './utils';

export const StringActionDisplay: FC<ActionViewProps> = ({ value }) => (
  <Typography variant="body2">{value || EMPTY_VALUE}</Typography>
);

export const StringActionEditor: FC<ActionDisplayProps> = ({ value, onChange }) => (
  <TextField
    size="small"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    fullWidth
    variant="outlined"
  />
);
