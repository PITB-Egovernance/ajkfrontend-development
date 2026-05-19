import { useState, useCallback } from 'react';

/**
 * Custom hook for form validation
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - Validation rules object
 * @returns {Object} - Form state and handlers
 */
const useFormValidation = (initialValues = {}, validationRules = {}, options = {}) => {
  // options:
  //   validateOnChange (default true)  — re-run validation as the user types
  //   validateOnBlur   (default true)  — re-run validation when the field loses focus
  //   liveErrorsUntouched (default false) — by default errors only appear after the
  //     field is touched (jquery-style). Set true to show errors immediately on render.
  const {
    validateOnChange    = true,
    validateOnBlur      = true,
    liveErrorsUntouched = false,
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common validation functions
  const validators = {
    required: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    email: (value) => {
      if (!value) return true; // Let required handle empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    minLength: (value, length) => {
      if (!value) return true;
      return value.length >= length;
    },
    maxLength: (value, length) => {
      if (!value) return true;
      return value.length <= length;
    },
    min: (value, minVal) => {
      if (value === '' || value === null || value === undefined) return true;
      return Number(value) >= minVal;
    },
    max: (value, maxVal) => {
      if (value === '' || value === null || value === undefined) return true;
      return Number(value) <= maxVal;
    },
    pattern: (value, regex) => {
      if (!value) return true;
      return regex.test(value);
    },
    cnic: (value) => {
      if (!value) return true;
      return /^\d{13}$/.test(value.replace(/-/g, ''));
    },
    match: (value, fieldToMatch, allValues) => {
      return value === allValues[fieldToMatch];
    }
  };

  // Validate a single field
  const validateField = useCallback((fieldName, value, allValues = values) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    for (const rule of rules) {
      const { type, message, value: ruleValue } = rule;

      let isValid = true;

      switch (type) {
        case 'required':
          isValid = validators.required(value);
          break;
        case 'email':
          isValid = validators.email(value);
          break;
        case 'minLength':
          isValid = validators.minLength(value, ruleValue);
          break;
        case 'maxLength':
          isValid = validators.maxLength(value, ruleValue);
          break;
        case 'min':
          isValid = validators.min(value, ruleValue);
          break;
        case 'max':
          isValid = validators.max(value, ruleValue);
          break;
        case 'pattern':
          isValid = validators.pattern(value, ruleValue);
          break;
        case 'cnic':
          isValid = validators.cnic(value);
          break;
        case 'match':
          isValid = validators.match(value, ruleValue, allValues);
          break;
        case 'custom':
          isValid = rule.validate(value, allValues);
          break;
        default:
          isValid = true;
      }

      if (!isValid) {
        return message || `Invalid ${fieldName}`;
      }
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationRules, values]);

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName], values);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField, validationRules, values]);

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked, files } = e.target;

    let newValue;
    if (type === 'checkbox') {
      newValue = checked;
    } else if (type === 'file') {
      newValue = files[0];
    } else {
      newValue = value;
    }

    setValues(prev => {
      const next = { ...prev, [name]: newValue };
      if (validateOnChange) {
        // Run validation against the just-applied value
        const err = validateField(name, newValue, next);
        setErrors(prevErrs => ({ ...prevErrs, [name]: err }));
      } else if (errors[name]) {
        // No live-validation: just clear stale error when user starts typing
        setErrors(prevErrs => ({ ...prevErrs, [name]: null }));
      }
      return next;
    });
  }, [errors, validateOnChange, validateField]);

  // Set single value programmatically
  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  }, [errors]);

  // Set multiple values at once
  const setMultipleValues = useCallback((newValues) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }));
  }, []);

  // Handle blur (mark field as touched)
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate on blur
    const error = validateField(name, values[name], values);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, [validateField, values]);

  // Reset form
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Clear specific error
  const clearError = useCallback((fieldName) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: null
    }));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Set specific error
  const setError = useCallback((fieldName, message) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: message
    }));
  }, []);

  // Set multiple errors (useful for server-side validation)
  const setMultipleErrors = useCallback((errorObj) => {
    setErrors(prev => ({
      ...prev,
      ...errorObj
    }));
  }, []);

  // Check if form has any errors
  const hasErrors = Object.values(errors).some(error => error !== null);

  // Check if form is dirty (values changed from initial)
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    hasErrors,
    isDirty,

    // Actions
    handleChange,
    handleBlur,
    setValue,
    setValues: setMultipleValues,
    setError,
    setErrors: setMultipleErrors,
    clearError,
    clearAllErrors,
    validateField,
    validateAll,
    reset,
    setIsSubmitting,

    // Helper to get field props
    // Default shape is suitable for <input>; the wrapper component
    // <ValidatedTextField> picks the message off `helperText` instead.
    getFieldProps: (name) => ({
      name,
      value: values[name] ?? '',
      onChange: handleChange,
      onBlur: handleBlur,
      error: touched[name] && errors[name] ? errors[name] : undefined,
    }),

    // MUI-friendly variant: returns `error` as boolean and `helperText` as
    // string, ready to spread directly onto <TextField>.
    getMuiFieldProps: (name, fallbackHelper = ' ') => {
      const showError = !!errors[name] && (liveErrorsUntouched || touched[name]);
      return {
        name,
        value: values[name] ?? '',
        onChange: handleChange,
        onBlur:   handleBlur,
        error:    showError,
        helperText: showError ? errors[name] : fallbackHelper,
      };
    },
  };
};

export default useFormValidation;
