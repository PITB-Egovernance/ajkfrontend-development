/**
 * Utility functions for frontend validation
 */

/**
 * Validates the Pakistani CNIC pattern (5-7-1)
 * @param {string} cnic 
 * @returns {boolean}
 */
export const validateCnicPattern = (cnic) => {
  if (!cnic) return false;
  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
  return cnicRegex.test(cnic);
};

export const isValidCNIC = (cnic) => validateCnicPattern(cnic);

/**
 * Validates if a string has a minimum length after trimming
 * @param {string} str 
 * @param {number} min 
 * @returns {boolean}
 */
export const hasMinLength = (str, min) => {
  return str && str.trim().length >= min;
};

export const minLength = (str, min) => hasMinLength(str, min);

export const maxLength = (str, max) => {
  return !str || str.trim().length <= max;
};

/**
 * Email validation
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Phone validation
 */
export const isValidPhone = (phone) => {
  const re = /^((\+92)|(0092))-{0,1}\d{3}-{0,1}\d{7}$|^\d{11}$|^\d{4}-\d{7}$/;
  return re.test(phone);
};

/**
 * URL validation
 */
export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Numeric validation
 */
export const isNumeric = (val) => {
  return !isNaN(parseFloat(val)) && isFinite(val);
};

export const isPositiveNumber = (val) => {
  return isNumeric(val) && parseFloat(val) > 0;
};

/**
 * Regex pattern matching
 */
export const matchesPattern = (str, pattern) => {
  const re = new RegExp(pattern);
  return re.test(str);
};

/**
 * Equality check
 */
export const equals = (a, b) => {
  return a === b;
};

/**
 * Password strength validation
 */
export const validatePasswordStrength = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return re.test(password);
};

const validationUtils = {
  validateCnicPattern,
  isValidCNIC,
  hasMinLength,
  minLength,
  maxLength,
  isValidEmail,
  isValidPhone,
  isValidURL,
  isNumeric,
  isPositiveNumber,
  matchesPattern,
  equals,
  validatePasswordStrength
};

export default validationUtils;
