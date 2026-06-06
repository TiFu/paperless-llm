import type { FC } from 'react';
import { Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import type { ActionDisplayProps, ActionViewProps } from './props';
import { EMPTY_VALUE } from './utils';

const formatDateValue = (value: string | null): string => {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const DateActionDisplay: FC<ActionViewProps> = ({ value }) => (
  <Typography variant="body2">{formatDateValue(value)}</Typography>
);

export const DateActionEditor: FC<ActionDisplayProps> = ({ value, onChange }) => (
  <DatePicker
    value={value ? dayjs(value) : null}
    onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : '')}
    format="DD MMM YYYY"
    slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'outlined' } }}
  />
);
