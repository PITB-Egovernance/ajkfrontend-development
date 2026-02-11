/**
 * Date Utilities
 * Helper functions for date/time operations
 */

/**
 * Formats a date to DD-MM-YYYY format
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Converts date to YYYY-MM-DD format for input[type="date"]
 * @param {Date|string} date - The date to convert
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Checks if a date is in the future
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (date) => {
  if (!date) return false;
  
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return d > today;
};

/**
 * Checks if a date is in the past
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
  if (!date) return false;
  
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return d < today;
};

/**
 * Calculates the difference in days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days between dates
 */
export const daysBetween = (date1, date2) => {
  if (!date1 || !date2) return 0;
  
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Formats date as relative time (e.g., "2 hours ago")
 * @param {Date|string} date - The date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return formatDate(date);
};

/**
 * Gets the current date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export const getTodayDateString = () => {
  const today = new Date();
  return formatDateForInput(today);
};

const dateUtils = {
  formatDate,
  formatDateForInput,
  isFutureDate,
  isPastDate,
  daysBetween,
  formatRelativeTime,
  getTodayDateString
};

export default dateUtils;
