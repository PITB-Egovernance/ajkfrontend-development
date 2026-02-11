/**
 * Requisition Form Validation Schema
 * Defines validation rules for all steps in the requisition form
 */

export const requisitionFormSchema = {
  step1: {
    designation: {
      type: 'required',
      message: 'Designation is required'
    },
    scale: {
      type: 'required',
      message: 'Scale is required'
    },
    quota_percentage: {
      type: 'required',
      message: 'Quota percentage is required'
    },
    num_posts: {
      type: 'required',
      message: 'Number of posts is required',
      min: 1,
      minMessage: 'Number of posts must be at least 1'
    },
    vacancy_date: {
      type: 'required',
      message: 'Vacancy date is required'
    },
    test_type: {
      type: 'required',
      message: 'Test type is required'
    }
  },
  step2: {
    academic_qualification: {
      type: 'required',
      message: 'Academic qualification is required'
    },
    equivalent_qualification: {
      type: 'required',
      message: 'Equivalent qualification is required'
    },
    degree_equivalence: {
      type: 'required',
      message: 'Degree equivalence is required'
    }
  },
  step3: {
    min_age: {
      type: 'required',
      message: 'Minimum age is required',
      min: 18,
      minMessage: 'Minimum age must be at least 18'
    },
    max_age: {
      type: 'required',
      message: 'Maximum age is required',
      validate: (value, formData) => {
        if (value && formData.min_age && value < formData.min_age) {
          return 'Maximum age must be greater than minimum age';
        }
        return null;
      }
    },
    age_relaxation: {
      type: 'required',
      message: 'Age relaxation is required'
    },
    nationality: {
      type: 'required',
      message: 'Nationality is required'
    },
    domicile: {
      type: 'required',
      message: 'Domicile is required'
    },
    gender_basis: {
      type: 'required',
      message: 'Gender is required'
    },
    district: {
      type: 'array',
      message: 'At least one district is required',
      minLength: 1,
      minMessage: 'At least one district is required'
    }
  }
};

/**
 * Validates a specific step of the requisition form
 * @param {number} step - The step number (0, 1, or 2)
 * @param {Object} data - The form data for that step
 * @returns {Object} - Errors object with field names as keys
 */
export const validateRequisitionStep = (step, data) => {
  const errors = {};
  const stepKey = `step${step + 1}`;
  const schemaFields = requisitionFormSchema[stepKey] || {};

  Object.keys(schemaFields).forEach(fieldName => {
    const fieldSchema = schemaFields[fieldName];
    const fieldValue = data[fieldName];

    // Check required
    if (fieldSchema.type === 'required' || fieldSchema.type === 'array') {
      if (fieldSchema.type === 'array') {
        if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
          errors[fieldName] = fieldSchema.message;
        }
      } else {
        if (!fieldValue || (typeof fieldValue === 'string' && !fieldValue.trim())) {
          errors[fieldName] = fieldSchema.message;
          return;
        }
      }
    }

    // Check min value
    if (fieldSchema.min !== undefined && fieldValue) {
      if (Number(fieldValue) < fieldSchema.min) {
        errors[fieldName] = fieldSchema.minMessage || fieldSchema.message;
      }
    }

    // Check min length for arrays
    if (fieldSchema.minLength !== undefined && Array.isArray(fieldValue)) {
      if (fieldValue.length < fieldSchema.minLength) {
        errors[fieldName] = fieldSchema.minMessage || fieldSchema.message;
      }
    }

    // Custom validation
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
 * Gets validation rules for a specific step
 * @param {number} step - The step number (0, 1, or 2)
 * @returns {Object} - Validation rules for useFormValidation hook
 */
export const getRequisitionValidationRules = (step) => {
  const stepKey = `step${step + 1}`;
  const schemaFields = requisitionFormSchema[stepKey] || {};
  const rules = {};

  Object.keys(schemaFields).forEach(fieldName => {
    const fieldSchema = schemaFields[fieldName];
    rules[fieldName] = [];

    // Add required rule
    if (fieldSchema.type === 'required' || fieldSchema.type === 'array') {
      rules[fieldName].push({
        type: 'required',
        message: fieldSchema.message
      });
    }

    // Add min rule
    if (fieldSchema.min !== undefined) {
      rules[fieldName].push({
        type: 'min',
        value: fieldSchema.min,
        message: fieldSchema.minMessage
      });
    }

    // Add minLength rule for arrays
    if (fieldSchema.minLength !== undefined) {
      rules[fieldName].push({
        type: 'custom',
        validate: (value) => {
          return Array.isArray(value) && value.length >= fieldSchema.minLength;
        },
        message: fieldSchema.minMessage
      });
    }

    // Add custom validation
    if (fieldSchema.validate && typeof fieldSchema.validate === 'function') {
      rules[fieldName].push({
        type: 'custom',
        validate: (value, allValues) => {
          const error = fieldSchema.validate(value, allValues);
          return !error;
        },
        message: fieldSchema.validateMessage || 'Validation failed'
      });
    }
  });

  return rules;
};

export default requisitionFormSchema;
