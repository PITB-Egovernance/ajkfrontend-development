/**
 * Central export file for all form validation schemas
 * Import any schema from here instead of individual files
 */

export {
  requisitionFormSchema,
  validateRequisitionStep,
  getRequisitionValidationRules
} from './requisitionFormSchema';

export {
  jobCreationFormSchema,
  validateJobCreationStep
} from './jobCreationFormSchema';

export {
  authSchema,
  validateLogin,
  validateSignup,
  getLoginValidationRules,
  getSignupValidationRules
} from './authSchema';

// Re-export everything for convenience
export * from './requisitionFormSchema';
export * from './jobCreationFormSchema';
export * from './authSchema';
