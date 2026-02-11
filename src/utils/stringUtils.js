/**
 * String Utilities
 * Helper functions for string operations
 */

/**
 * Capitalizes the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Converts string to title case
 * @param {string} str - The string to convert
 * @returns {string} Title case string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str.split(' ').map(word => capitalize(word)).join(' ');
};

/**
 * Converts string to uppercase
 * @param {string} str - The string to convert
 * @returns {string} Uppercase string
 */
export const toUpperCase = (str) => {
  return str ? str.toUpperCase() : '';
};

/**
 * Converts string to lowercase
 * @param {string} str - The string to convert
 * @returns {string} Lowercase string
 */
export const toLowerCase = (str) => {
  return str ? str.toLowerCase() : '';
};

/**
 * Truncates a string to a specified length
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: "...")
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength, suffix = '...') => {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Removes all whitespace from a string
 * @param {string} str - The string to clean
 * @returns {string} String without whitespace
 */
export const removeWhitespace = (str) => {
  return str ? str.replace(/\s+/g, '') : '';
};

/**
 * Converts snake_case to camelCase
 * @param {string} str - Snake case string
 * @returns {string} Camel case string
 */
export const snakeToCamel = (str) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Converts camelCase to snake_case
 * @param {string} str - Camel case string
 * @returns {string} Snake case string
 */
export const camelToSnake = (str) => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

/**
 * Checks if string is empty or whitespace only
 * @param {string} str - The string to check
 * @returns {boolean} True if empty or whitespace
 */
export const isEmpty = (str) => {
  return !str || str.trim().length === 0;
};

/**
 * Formats CNIC with hyphens (12345-1234567-1)
 * @param {string} cnic - The CNIC number
 * @returns {string} Formatted CNIC
 */
export const formatCNIC = (cnic) => {
  if (!cnic) return '';
  const cleaned = cnic.replace(/\D/g, '').slice(0, 13);
  if (cleaned.length <= 5) return cleaned;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
};

/**
 * Removes hyphens from CNIC
 * @param {string} cnic - The formatted CNIC
 * @returns {string} CNIC without hyphens
 */
export const cleanCNIC = (cnic) => {
  return cnic ? cnic.replace(/-/g, '') : '';
};

/**
 * Slugifies a string (converts to URL-friendly format)
 * @param {string} str - The string to slugify
 * @returns {string} Slugified string
 */
export const slugify = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const stringUtils = {
  capitalize,
  toTitleCase,
  toUpperCase,
  toLowerCase,
  truncate,
  removeWhitespace,
  snakeToCamel,
  camelToSnake,
  isEmpty,
  formatCNIC,
  cleanCNIC,
  slugify
};

export default stringUtils;
