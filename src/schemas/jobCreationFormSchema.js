/**
 * Job Creation Form Validation Schema
 * Defines validation rules for all 5 steps of the job creation form
 */

export const jobCreationFormSchema = {
  step1: {
    job_title: {
      type: 'required',
      minLength: 3,
      message: 'Job title is required',
      minLengthMessage: 'Job title must be at least 3 characters'
    },
    case_number: {
      type: 'required',
      pattern: /^[A-Z0-9-]+$/i,
      message: 'Case number is required',
      patternMessage: 'Case number should contain only letters, numbers, and hyphens'
    },
    requisition_number: {
      type: 'required',
      pattern: /^\d+$/,
      message: 'Requisition number is required',
      patternMessage: 'Requisition number should contain only digits'
    },
    advertisement_number: {
      type: 'required',
      message: 'Advertisement number is required'
    },
    advertisement_date: {
      type: 'required',
      message: 'Advertisement date is required',
      validate: (value) => {
        const advDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (advDate > today) {
          return 'Advertisement date cannot be in the future';
        }
        return null;
      }
    },
    job_type: {
      type: 'required',
      message: 'Job type is required'
    },
    department: {
      type: 'required',
      message: 'Please select a department'
    },
    designation: {
      type: 'required',
      message: 'Please select a designation'
    },
    grade_bps: {
      type: 'required',
      message: 'Please select a grade/BPS'
    },
    number_of_posts: {
      type: 'required',
      min: 1,
      max: 1000,
      message: 'Number of posts must be at least 1',
      maxMessage: 'Number of posts cannot exceed 1000'
    },
    vacant_post_detail: {
      type: 'required',
      minLength: 10,
      message: 'Vacant post details are required',
      minLengthMessage: 'Vacant post details must be at least 10 characters'
    }
  },
  step2: {
    number_of_ad_hoc_posts: {
      type: 'required',
      min: 0,
      message: 'Number of ad hoc posts is required',
      minMessage: 'Number of ad hoc posts cannot be negative'
    },
    ad_hoc_post_details: {
      type: 'conditional',
      condition: (formData) => formData.number_of_ad_hoc_posts > 0,
      message: 'Ad hoc post details are required when ad hoc posts are specified'
    },
    initial_appointment_date: {
      type: 'required',
      message: 'Initial appointment date is required'
    },
    date_of_last_extension: {
      type: 'required',
      message: 'Date of last extension is required'
    },
    post_date: {
      type: 'required',
      message: 'Post date is required'
    },
    start_date: {
      type: 'required',
      message: 'Start date is required'
    },
    end_date: {
      type: 'required',
      message: 'End date is required',
      validate: (value, formData) => {
        if (formData.start_date && new Date(value) <= new Date(formData.start_date)) {
          return 'End date must be after start date';
        }
        return null;
      }
    },
    release_date: {
      type: 'required',
      message: 'Release date is required'
    },
    close_date: {
      type: 'required',
      message: 'Close date is required',
      validate: (value, formData) => {
        if (formData.release_date && new Date(value) <= new Date(formData.release_date)) {
          return 'Close date must be after release date';
        }
        return null;
      }
    }
  },
  step3: {
    min_age: {
      type: 'required',
      min: 18,
      max: 100,
      message: 'Minimum age must be at least 18 years',
      maxMessage: 'Minimum age cannot exceed 100 years'
    },
    max_age: {
      type: 'required',
      min: 18,
      max: 100,
      message: 'Maximum age must be at least 18 years',
      maxMessage: 'Maximum age cannot exceed 100 years',
      validate: (value, formData) => {
        if (formData.min_age && value <= formData.min_age) {
          return 'Maximum age must be greater than minimum age';
        }
        return null;
      }
    },
    age_relaxation: {
      type: 'required',
      min: 0,
      message: 'Age relaxation is required (enter 0 if none)',
      minMessage: 'Age relaxation cannot be negative'
    },
    age_relaxation_note: {
      type: 'required',
      message: 'Age relaxation note is required'
    },
    gender_eligibility: {
      type: 'required',
      message: 'Please select gender eligibility'
    },
    nationality: {
      type: 'required',
      message: 'Nationality is required'
    },
    domicile: {
      type: 'required',
      message: 'Domicile is required'
    },
    educational_requirement: {
      type: 'array',
      minLength: 1,
      message: 'At least one educational requirement must be selected'
    },
    medical_requirement: {
      type: 'required',
      message: 'Medical requirement is required'
    },
    experience_requirement: {
      type: 'array',
      minLength: 1,
      message: 'At least one experience requirement must be specified'
    },
    other_requirement: {
      type: 'required',
      message: 'Other requirements field is required (enter "None" if not applicable)'
    },
    dynamic_fields: {
      type: 'required',
      message: 'Dynamic fields information is required'
    }
  },
  step4: {
    examination_fee: {
      type: 'required',
      message: 'Examination fee is required',
      validate: (value) => {
        if (isNaN(value) || parseFloat(value) < 0) {
          return 'Examination fee must be a valid positive number';
        }
        return null;
      }
    },
    payment_integration_psid: {
      type: 'required',
      message: 'Payment integration PSID is required'
    },
    psid_expiry_date: {
      type: 'required',
      message: 'PSID expiry date is required',
      validate: (value) => {
        const expiryDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          return 'PSID expiry date must be in the future';
        }
        return null;
      }
    },
    payment_status: {
      type: 'required',
      message: 'Please select payment status'
    },
    test_center_preference: {
      type: 'array',
      minLength: 1,
      message: 'At least one test center must be selected'
    },
    test_date: {
      type: 'required',
      message: 'Test date is required',
      validate: (value) => {
        const testDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (testDate < today) {
          return 'Test date must be in the future';
        }
        return null;
      }
    },
    interview_date: {
      type: 'required',
      message: 'Interview date is required',
      validate: (value, formData) => {
        if (formData.test_date && new Date(value) < new Date(formData.test_date)) {
          return 'Interview date must be on or after test date';
        }
        return null;
      }
    },
    test_duration: {
      type: 'required',
      message: 'Test duration is required'
    },
    syllabus_paper_pattern: {
      type: 'required',
      minLength: 20,
      message: 'Syllabus and paper pattern details are required',
      minLengthMessage: 'Syllabus and paper pattern must be at least 20 characters'
    }
  },
  step5: {
    short_details: {
      type: 'required',
      minLength: 20,
      maxLength: 200,
      message: 'Short details are required',
      minLengthMessage: 'Short details must be at least 20 characters',
      maxLengthMessage: 'Short details cannot exceed 200 characters'
    },
    full_job_details: {
      type: 'required',
      minLength: 50,
      message: 'Full job details are required',
      minLengthMessage: 'Full job details must be at least 50 characters'
    },
    additional_information: {
      type: 'required',
      message: 'Additional information is required (enter "None" if not applicable)'
    },
    notes_internal: {
      type: 'required',
      minLength: 10,
      message: 'Internal notes are required',
      minLengthMessage: 'Internal notes must be at least 10 characters'
    }
  }
};

/**
 * Validates a specific step of the job creation form
 * @param {number} step - The step number (1-5)
 * @param {Object} formData - The complete form data
 * @returns {Object} - Errors object with field names as keys
 */
export const validateJobCreationStep = (step, formData) => {
  const stepErrors = {};
  const schemaFields = jobCreationFormSchema[`step${step}`] || {};

  Object.keys(schemaFields).forEach(fieldName => {
    const fieldSchema = schemaFields[fieldName];
    const fieldValue = formData[fieldName];

    // Handle conditional validation
    if (fieldSchema.type === 'conditional') {
      if (fieldSchema.condition(formData) && (!fieldValue || (typeof fieldValue === 'string' && !fieldValue.trim()))) {
        stepErrors[fieldName] = fieldSchema.message;
      }
      return;
    }

    // Handle required validation
    if (fieldSchema.type === 'required' || fieldSchema.type === 'array') {
      if (fieldSchema.type === 'array') {
        if (!Array.isArray(fieldValue) || fieldValue.length === 0) {
          stepErrors[fieldName] = fieldSchema.message;
          return;
        }
        if (fieldSchema.minLength && fieldValue.length < fieldSchema.minLength) {
          stepErrors[fieldName] = fieldSchema.message;
          return;
        }
      } else {
        if (!fieldValue || (typeof fieldValue === 'string' && !fieldValue.trim())) {
          stepErrors[fieldName] = fieldSchema.message;
          return;
        }
      }
    }

    // Handle min validation
    if (fieldSchema.min !== undefined && fieldValue !== '' && fieldValue !== null && fieldValue !== undefined) {
      const numValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue;
      if (!isNaN(numValue) && numValue < fieldSchema.min) {
        stepErrors[fieldName] = fieldSchema.minMessage || fieldSchema.message;
        return;
      }
    }

    // Handle max validation
    if (fieldSchema.max !== undefined && fieldValue !== '' && fieldValue !== null && fieldValue !== undefined) {
      const numValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue;
      if (!isNaN(numValue) && numValue > fieldSchema.max) {
        stepErrors[fieldName] = fieldSchema.maxMessage || fieldSchema.message;
        return;
      }
    }

    // Handle minLength validation
    if (fieldSchema.minLength !== undefined && fieldValue && typeof fieldValue === 'string' && fieldValue.trim().length < fieldSchema.minLength) {
      stepErrors[fieldName] = fieldSchema.minLengthMessage || fieldSchema.message;
      return;
    }

    // Handle maxLength validation
    if (fieldSchema.maxLength !== undefined && fieldValue && typeof fieldValue === 'string' && fieldValue.length > fieldSchema.maxLength) {
      stepErrors[fieldName] = fieldSchema.maxLengthMessage || fieldSchema.message;
      return;
    }

    // Handle pattern validation
    if (fieldSchema.pattern && fieldValue && typeof fieldValue === 'string' && !fieldSchema.pattern.test(fieldValue)) {
      stepErrors[fieldName] = fieldSchema.patternMessage || fieldSchema.message;
      return;
    }

    // Handle custom validation
    if (fieldSchema.validate && typeof fieldSchema.validate === 'function') {
      const customError = fieldSchema.validate(fieldValue, formData);
      if (customError) {
        stepErrors[fieldName] = customError;
      }
    }
  });

  return stepErrors;
};

export default jobCreationFormSchema;
