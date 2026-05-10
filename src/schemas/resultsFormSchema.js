/**
 * Results Module Validation Schema
 * Defines validation rules for mark entry, awards, and publication
 */

export const resultsFormSchema = {
  markEntry: {
    job_post_id: { 
      type: 'required', 
      message: 'Job post is required' 
    },
    exam_date: { 
      type: 'required', 
      message: 'Exam date is required' 
    },
    result_type: {
      type: 'required',
      message: 'Result type (Detailed/Summary) is required'
    },
    total_max_marks: { 
      type: 'required', 
      min: 1, 
      message: 'Total max marks is required and must be at least 1' 
    },
    passing_marks: {
      type: 'custom',
      validate: (value, formData) => {
        if (value === undefined || value === null || value === '') {
          return 'Passing marks is required';
        }
        if (Number(value) < 0) {
          return 'Passing marks cannot be negative';
        }
        if (Number(value) > Number(formData.total_max_marks)) {
          return 'Passing marks cannot exceed total max marks';
        }
        return null;
      }
    }
  },
  subjectRow: {
    subject_name: { 
      type: 'required', 
      message: 'Subject name is required',
      maxLength: 150,
      maxMessage: 'Subject name cannot exceed 150 characters'
    },
    max_marks: { 
      type: 'required', 
      min: 0, 
      message: 'Max marks is required' 
    },
    obtained_marks: {
      type: 'custom',
      validate: (value, rowData) => {
        if (value === undefined || value === null || value === '') {
          return 'Obtained marks is required';
        }
        if (Number(value) < 0) {
          return 'Obtained marks cannot be negative';
        }
        if (Number(value) > Number(rowData.max_marks)) {
          return 'Obtained marks cannot exceed max marks';
        }
        return null;
      }
    }
  },
  awardEntry: {
    part_a_marks: { 
      type: 'required', 
      min: 0, 
      message: 'Part-A marks is required' 
    },
    part_b_marks: { 
      type: 'required', 
      min: 0, 
      message: 'Part-B marks is required' 
    },
    total_validation: {
      type: 'custom',
      validate: (_, formData) => {
        const total = (Number(formData.part_a_marks) || 0) + (Number(formData.part_b_marks) || 0);
        if (total > 100) {
          return 'Grand total (Part A + B) cannot exceed 100';
        }
        return null;
      }
    }
  },
  publication: {
    pub_type: { 
      type: 'required', 
      message: 'Publication type is required' 
    },
    gazette_ref: {
      type: 'optional'
    },
    notify_candidates: {
      type: 'boolean'
    }
  }
};

/**
 * Generic validator base
 */
const validate = (schemaKey, data) => {
  const errors = {};
  const schemaFields = resultsFormSchema[schemaKey] || {};

  Object.keys(schemaFields).forEach(fieldName => {
    const fieldSchema = schemaFields[fieldName];
    const fieldValue = data[fieldName];

    // Check required
    if (fieldSchema.type === 'required') {
      const isString = typeof fieldValue === 'string';
      const isEmpty = fieldValue === undefined || fieldValue === null || (isString && !fieldValue.trim());
      
      if (isEmpty) {
        errors[fieldName] = fieldSchema.message;
        return;
      }
    }

    // Check min value
    if (fieldSchema.min !== undefined && (fieldValue !== undefined && fieldValue !== null)) {
      if (Number(fieldValue) < fieldSchema.min) {
        errors[fieldName] = fieldSchema.minMessage || fieldSchema.message;
      }
    }

    // Check max length
    if (fieldSchema.maxLength !== undefined && fieldValue) {
      if (fieldValue.length > fieldSchema.maxLength) {
        errors[fieldName] = fieldSchema.maxMessage;
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
 * Specific exports for each form as requested in Phase 2
 */
export const validateMarkEntry = (data) => validate('markEntry', data);
export const validateSubjectRow = (data) => validate('subjectRow', data);
export const validateAwardEntry = (data) => validate('awardEntry', data);
export const validatePublication = (data) => validate('publication', data);

/**
 * Legacy support for generic validator
 */
export const validateResultsForm = validate;

export default resultsFormSchema;
