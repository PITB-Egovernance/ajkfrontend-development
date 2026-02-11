/**
 * Number/Math Utilities
 * Helper functions for number and math operations
 */

/**
 * Formats number as currency
 * @param {number} value - Number to format
 * @param {string} currency - Currency code (default: 'PKR')
 * @param {string} locale - Locale string (default: 'en-PK')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'PKR', locale = 'en-PK') => {
  if (isNaN(value)) return value;
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${currency} ${parseFloat(value).toFixed(2)}`;
  }
};

/**
 * Formats number with thousand separators
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export const formatNumber = (value, decimals = 0) => {
  if (isNaN(value)) return value;
  
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Parses number from formatted string
 * @param {string} str - Formatted number string
 * @returns {number} Parsed number
 */
export const parseFormattedNumber = (str) => {
  if (typeof str !== 'string') return parseFloat(str);
  return parseFloat(str.replace(/[^\d.-]/g, ''));
};

/**
 * Rounds number to specified decimal places
 * @param {number} value - Number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded number
 */
export const round = (value, decimals = 0) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Calculates percentage
 * @param {number} value - Part value
 * @param {number} total - Total value
 * @param {number} decimals - Decimal places
 * @returns {number} Percentage
 */
export const calculatePercentage = (value, total, decimals = 2) => {
  if (total === 0) return 0;
  return round((value / total) * 100, decimals);
};

/**
 * Calculates percentage increase/decrease
 * @param {number} original - Original value
 * @param {number} newValue - New value
 * @param {number} decimals - Decimal places
 * @returns {number} Percentage change
 */
export const calculatePercentageChange = (original, newValue, decimals = 2) => {
  if (original === 0) return 0;
  return round(((newValue - original) / original) * 100, decimals);
};

/**
 * Converts percentage to decimal
 * @param {number} percentage - Percentage value
 * @returns {number} Decimal value
 */
export const percentageToDecimal = (percentage) => {
  return percentage / 100;
};

/**
 * Converts decimal to percentage
 * @param {number} decimal - Decimal value
 * @returns {number} Percentage value
 */
export const decimalToPercentage = (decimal) => {
  return decimal * 100;
};

/**
 * Calculates average of numbers
 * @param {number[]} numbers - Array of numbers
 * @returns {number} Average value
 */
export const average = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + parseFloat(num), 0);
  return sum / numbers.length;
};

/**
 * Finds minimum value
 * @param {number[]} numbers - Array of numbers
 * @returns {number} Minimum value
 */
export const minimum = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  return Math.min(...numbers.map(n => parseFloat(n)));
};

/**
 * Finds maximum value
 * @param {number[]} numbers - Array of numbers
 * @returns {number} Maximum value
 */
export const maximum = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  return Math.max(...numbers.map(n => parseFloat(n)));
};

/**
 * Calculates sum of numbers
 * @param {number[]} numbers - Array of numbers
 * @returns {number} Sum value
 */
export const sum = (numbers) => {
  if (!Array.isArray(numbers)) return 0;
  return numbers.reduce((acc, num) => acc + parseFloat(num), 0);
};

/**
 * Clamps a number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Generates random number between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
export const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const numberUtils = {
  formatCurrency,
  formatNumber,
  parseFormattedNumber,
  round,
  calculatePercentage,
  calculatePercentageChange,
  percentageToDecimal,
  decimalToPercentage,
  average,
  minimum,
  maximum,
  sum,
  clamp,
  randomBetween
};

export default numberUtils;
