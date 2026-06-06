import type { FC } from 'react';
import { Typography } from '@mui/material';
import { Autocomplete, TextField } from '@mui/material';
import type { ActionDisplayProps, ActionViewProps } from './props';
import { EMPTY_VALUE, findEntityByValue, mergeEntityOptions, resolveEntityName, toEntityValue } from './utils';

export const EnumActionDisplay: FC<ActionViewProps> = ({ value, entityItems = [] }) => (
  <Typography variant="body2">
    {value ? resolveEntityName(value, entityItems) : EMPTY_VALUE}
  </Typography>
);

export const EnumActionEditor: FC<ActionDisplayProps> = ({ value, onChange, entityItems = [] }) => {
  const selectedItem = value
    ? findEntityByValue(value, entityItems) ?? toEntityValue(value)
    : null;
  const options = selectedItem
    ? mergeEntityOptions(entityItems, [selectedItem])
    : entityItems;

  return (
    <Autocomplete
      size="small"
      options={options}
      getOptionLabel={(opt) => opt.name}
      value={selectedItem}
      onChange={(_, newVal) => onChange(newVal ? String(newVal.id) : '')}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      renderInput={(params) => <TextField {...params} />}
      sx={{ minWidth: 200 }}
    />
  );
};
