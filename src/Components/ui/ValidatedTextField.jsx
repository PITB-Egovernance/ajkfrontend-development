import React from 'react';
import { TextField } from '@mui/material';

/**
 * Thin wrapper around MUI TextField that pulls value/error/helperText from a
 * useFormValidation() instance. Real-time validation works out of the box.
 *
 * Usage:
 *   const form = useFormValidation(initialValues, rules);
 *
 *   <ValidatedTextField form={form} name="email" label="Email" />
 *   <ValidatedTextField form={form} name="cnic"  label="CNIC"  helperText="13 digits, no dashes" />
 *
 * Any prop you pass through (label, size, select, type, InputLabelProps, …) is
 * forwarded to the underlying TextField. `helperText` you pass becomes the
 * fallback shown while the field is valid; the error message takes over when
 * the field becomes invalid.
 */
const ValidatedTextField = ({ form, name, helperText = ' ', ...rest }) => {
  if (!form || typeof form.getMuiFieldProps !== 'function') {
    // Helpful guard: makes a developer-time mistake obvious instead of silent.
    return <TextField name={name} helperText={helperText} {...rest} />;
  }

  const muiProps = form.getMuiFieldProps(name, helperText);
  // `rest` wins for label/size/select/type/etc., but the validation props win
  // for value/onChange/onBlur/error/helperText (set last on purpose).
  return <TextField {...rest} {...muiProps} />;
};

export default ValidatedTextField;
