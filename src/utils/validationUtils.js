/**
 * Validation Utilities
 * Helper functions for form and data validation
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates CNIC format (13 digits)
 * @param {string} cnic - CNIC to validate
 * @returns {boolean} True if valid CNIC
 */
export const isValidCNIC = (cnic) => {
  if (!cnic) return false;
  const cleaned = cnic.replace(/\D/g, '');
  return /^\d{13}$/.test(cleaned);
};

/**
 * Validates phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9\s\-+()]{10,}$/;
  return phoneRegex.test(phone?.replace(/\s+/g, '') || '');
};

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates if value is a number
 * @param {*} value - Value to check
 * @returns {boolean} True if numeric
 */
export const isNumeric = (value) => {
  return !isNaN(value) && !isNaN(parseFloat(value));
};

/**
 * Validates if value is a positive number
 * @param {*} value - Value to check
 * @returns {boolean} True if positive number
 */
export const isPositiveNumber = (value) => {
  return isNumeric(value) && parseFloat(value) > 0;
};

/**
 * Validates minimum string length
 * @param {string} str - String to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} True if valid
 */
export const minLength = (str, minLength) => {
  return str && str.trim().length >= minLength;
};

/**
 * Validates maximum string length
 * @param {string} str - String to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} True if valid
 */
export const maxLength = (str, maxLength) => {
  return !str || str.length <= maxLength;
};

/**
 * Validates if value matches a pattern
 * @param {string} value - Value to validate
 * @param {RegExp} pattern - Pattern to match
 * @returns {boolean} True if matches
 */
export const matchesPattern = (value, pattern) => {
  return pattern.test(value);
};

/**
 * Validates if two values are equal
 * @param {*} value1 - First value
 * @param {*} value2 - Second value
 * @returns {boolean} True if equal
 */
export const equals = (value1, value2) => {
  return value1 === value2;
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with score and requirements
 */
export const validatePasswordStrength = (password) => {
  const requirements = {
    minLength: password?.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()\-_+={}[\];:'",.<>/?|]/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  const strength = score <= 2 ? 'weak' : score <= 3 ? 'fair' : score <= 4 ? 'good' : 'strong';

  return { score, strength, requirements };
};

const validationUtils = {
  isValidEmail,
  isValidCNIC,
  isValidPhone,
  isValidURL,
  isNumeric,
  isPositiveNumber,
  minLength,
  maxLength,
  matchesPattern,
  equals,
  validatePasswordStrength
};

export default validationUtils;
