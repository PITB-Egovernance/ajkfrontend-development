/**
 * Authentication Form Validation Schema
 * Defines validation rules for Login and Register forms
 */

export const authSchema = {
  login: {
    cnic: {
      type: 'required',
      length: 13,
      pattern: /^\d{13}$/,
      message: 'Valid CNIC required (13 digits)',
      patternMessage: 'Valid CNIC required (13 digits)'
    },
    password: {
      type: 'required',
      message: 'Password required'
    },
    captcha: {
      type: 'required',
      message: 'CAPTCHA required'
    }
  },
  register: {
    username: {
      type: 'required',
      minLength: 3,
      message: 'Username required',
      minLengthMessage: 'Username must be at least 3 characters'
    },
    cnic: {
      type: 'required',
      length: 13,
      pattern: /^\d{13}$/,
      message: 'Valid CNIC required (13 digits)',
      lengthMessage: 'CNIC must be exactly 13 digits',
      patternMessage: 'Valid CNIC required (13 digits)'
    },
    mobile: {
      type: 'required',
      length: 11,
      pattern: /^\d{11}$/,
      message: 'Mobile number required',
      lengthMessage: 'Mobile must be exactly 11 digits',
      patternMessage: 'Valid mobile number required (11 digits)'
    },
    role: {
      type: 'required',
      message: 'Role required'
    },
    password: {
      type: 'required',
      minLength: 6,
      message: 'Password required',
      minLengthMessage: 'Password must be at least 6 characters'
    },
    password_confirmation: {
      type: 'required',
      message: 'Confirm password required',
      validate: (value, formData) => {
        if (formData.password && value !== formData.password) {
          return 'Passwords must match';
        }
        return null;
      }
    }
  },
  loginPage: {
    cnic: {
      type: 'required',
      length: 13,
      pattern: /^\d{13}$/,
      message: 'Valid CNIC required (13 digits)',
      patternMessage: 'Valid CNIC required (13 digits)'
    },
    password: {
      type: 'required',
      message: 'Password required'
    },
    captcha: {
      type: 'required',
      message: 'CAPTCHA required'
    }
  },
  signupPage: {
    username: {
      type: 'required',
      minLength: 3,
      message: 'Username required',
      minLengthMessage: 'Username must be at least 3 characters'
    },
    cnic: {
      type: 'required',
      length: 13,
      pattern: /^\d{13}$/,
      message: 'Valid CNIC required (13 digits)',
      lengthMessage: 'CNIC must be exactly 13 digits',
      patternMessage: 'Valid CNIC required (13 digits)'
    },
    mobile: {
      type: 'required',
      length: 11,
      pattern: /^\d{11}$/,
      message: 'Mobile number required',
      lengthMessage: 'Mobile must be exactly 11 digits',
      patternMessage: 'Valid mobile number required (11 digits)'
    },
    role: {
      type: 'required',
      message: 'Role required'
    },
    password: {
      type: 'required',
      minLength: 6,
      message: 'Password required',
      minLengthMessage: 'Password must be at least 6 characters'
    },
    password_confirmation: {
      type: 'required',
      message: 'Confirm password required',
      validate: (value, formData) => {
        if (formData.password && value !== formData.password) {
          return 'Passwords must match';
        }
        return null;
      }
    }
  }
};

/**
 * Validates login form
 * @param {Object} data - The login form data
 * @returns {Object} - Errors object
 */
export const validateLogin = (data) => {
  const errors = {};
  const schema = authSchema.login;

  Object.keys(schema).forEach(fieldName => {
    const fieldSchema = schema[fieldName];
    const fieldValue = data[fieldName];

    // Check required
    if (!fieldValue) {
      errors[fieldName] = fieldSchema.message;
      return;
    }

    // Check pattern for CNIC
    if (fieldSchema.pattern && !fieldSchema.pattern.test(fieldValue)) {
      errors[fieldName] = fieldSchema.patternMessage || fieldSchema.message;
      return;
    }

    // Check length for CNIC
    if (fieldSchema.length && fieldValue.length !== fieldSchema.length) {
      errors[fieldName] = fieldSchema.lengthMessage || fieldSchema.message;
    }
  });

  return errors;
};

/**
 * Validates register/signup form
 * @param {Object} data - The signup form data
 * @returns {Object} - Errors object
 */
export const validateSignup = (data) => {
  const errors = {};
  const schema = authSchema.register;

  Object.keys(schema).forEach(fieldName => {
    const fieldSchema = schema[fieldName];
    const fieldValue = data[fieldName];

    // Check required
    if (!fieldValue) {
      errors[fieldName] = fieldSchema.message;
      return;
    }

    // Check minLength
    if (fieldSchema.minLength && fieldValue.length < fieldSchema.minLength) {
      errors[fieldName] = fieldSchema.minLengthMessage || fieldSchema.message;
      return;
    }

    // Check pattern for CNIC
    if (fieldSchema.pattern && !fieldSchema.pattern.test(fieldValue)) {
      errors[fieldName] = fieldSchema.patternMessage || fieldSchema.message;
      return;
    }

    // Check length for CNIC
    if (fieldSchema.length && fieldValue.length !== fieldSchema.length) {
      errors[fieldName] = fieldSchema.lengthMessage || fieldSchema.message;
      return;
    }

    // Check password match
    if (fieldSchema.validate && typeof fieldSchema.validate === 'function') {
      const customError = fieldSchema.validate(fieldValue, data);
      if (customError) {
        errors[fieldName] = customError;
      }
    }
  });

  return errors;
};

/**
 * Gets validation rules for login form (for useFormValidation hook)
 * @returns {Object} - Validation rules
 */
export const getLoginValidationRules = () => {
  return {
    cnic: [
      { type: 'required', message: 'Valid CNIC required (13 digits)' },
      { type: 'pattern', value: /^\d{13}$/, message: 'Valid CNIC required (13 digits)' }
    ],
    password: [
      { type: 'required', message: 'Password required' }
    ],
    captcha: [
      { type: 'required', message: 'CAPTCHA required' }
    ]
  };
};

/**
 * Gets validation rules for signup form (for useFormValidation hook)
 * @returns {Object} - Validation rules
 */
export const getSignupValidationRules = () => {
  return {
    username: [
      { type: 'required', message: 'Username required' },
      { type: 'minLength', value: 3, message: 'Username must be at least 3 characters' }
    ],
    cnic: [
      { type: 'required', message: 'Valid CNIC required (13 digits)' },
      { type: 'pattern', value: /^\d{13}$/, message: 'Valid CNIC required (13 digits)' }
    ],
    password: [
      { type: 'required', message: 'Password required' },
      { type: 'minLength', value: 6, message: 'Password must be at least 6 characters' }
    ],
    password_confirmation: [
      { type: 'required', message: 'Confirm password required' },
      {
        type: 'custom',
        validate: (value, allValues) => value === allValues.password,
        message: 'Passwords must match'
      }
    ]
  };
};

export default authSchema;
