import type { FC } from 'react';
import { Autocomplete, Box, Chip, TextField, Typography } from '@mui/material';
import type { ActionDisplayProps, ActionViewProps } from './props';
import {
  EMPTY_VALUE,
  mergeEntityOptions,
  parseEnumIds,
  resolveEntityName,
  resolveEntityValues,
} from './utils';

export const MultipleEnumActionDisplay: FC<ActionViewProps> = ({ value, entityItems = [] }) => {
  const ids = parseEnumIds(value);

  if (ids.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {EMPTY_VALUE}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {ids.map((id) => (
        <Chip key={String(id)} label={resolveEntityName(id, entityItems)} size="small" />
      ))}
    </Box>
  );
};

export const MultipleEnumActionEditor: FC<ActionDisplayProps> = ({
  value,
  onChange,
  entityItems = [],
}) => {
  const selectedIds = parseEnumIds(value);
  const selectedItems = resolveEntityValues(selectedIds, entityItems);
  const options = mergeEntityOptions(entityItems, selectedItems);

  return (
    <Autocomplete
      multiple
      size="small"
      options={options}
      getOptionLabel={(opt) => opt.name}
      value={selectedItems}
      onChange={(_, newVal) => onChange(JSON.stringify(newVal.map((v) => v.id)))}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      renderInput={(params) => <TextField {...params} />}
      sx={{ minWidth: 200 }}
    />
  );
};
