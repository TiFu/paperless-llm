import React, { useEffect, useState } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

interface NumberFieldProps extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
}

/**
 * A number input that displays with the browser's locale thousand
 * separators (e.g. 300000 -> "300,000") instead of a plain digit string.
 * Native <input type="number"> doesn't allow separators, so this uses a
 * text input: formatted while unfocused, raw digits while typing, reformatted
 * on blur.
 */
export const NumberField: React.FC<NumberFieldProps> = ({ value, onChange, ...textFieldProps }) => {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value.toLocaleString());

  useEffect(() => {
    if (!focused) setText(value.toLocaleString());
  }, [value, focused]);

  return (
    <TextField
      {...textFieldProps}
      type="text"
      inputMode="numeric"
      value={focused ? text : value.toLocaleString()}
      onFocus={() => {
        setFocused(true);
        setText(String(value));
      }}
      onChange={(e) => {
        const digitsOnly = e.target.value.replace(/[^\d]/g, '');
        setText(digitsOnly);
        onChange(digitsOnly === '' ? 0 : Number(digitsOnly));
      }}
      onBlur={() => setFocused(false)}
    />
  );
};
