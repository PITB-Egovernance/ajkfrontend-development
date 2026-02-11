/**
 * Central export file for all utility functions
 * Import any utility from here instead of individual files
 */

// Class name utilities
export { cn, default as classNameUtils } from './classNameUtils';

// Date utilities
export {
  formatDate,
  formatDateForInput,
  isFutureDate,
  isPastDate,
  daysBetween,
  formatRelativeTime,
  getTodayDateString,
  default as dateUtils
} from './dateUtils';

// String utilities
export {
  capitalize,
  toTitleCase,
  toUpperCase,
  toLowerCase,
  truncate,
  removeWhitespace,
  snakeToCamel,
  camelToSnake,
  isEmpty as isStringEmpty,
  formatCNIC,
  cleanCNIC,
  slugify,
  default as stringUtils
} from './stringUtils';

// Storage utilities
export {
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  hasStorageItem,
  clearStorage,
  getStorageKeys,
  getStorageSize,
  setStorageItems,
  removeStorageItems,
  default as storageUtils
} from './storageUtils';

// Object utilities
export {
  deepClone,
  objectsEqual,
  getNestedValue,
  setNestedValue,
  filterNull,
  mergeObjects,
  pickKeys,
  omitKeys,
  toCamelCaseObject,
  toSnakeCaseObject,
  isEmpty as isObjectEmpty,
  default as objectUtils
} from './objectUtils';

// Validation utilities
export {
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
  validatePasswordStrength,
  default as validationUtils
} from './validationUtils';

// API utilities
export {
  getAPIHeaders,
  getFormDataHeaders,
  buildAPIUrl,
  buildQueryString,
  handleAPIError,
  objectToFormData,
  formDataToObject,
  isSuccessResponse,
  formatAPIErrorMessage,
  default as apiUtils
} from './apiUtils';

// Number utilities
export {
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
  randomBetween,
  default as numberUtils
} from './numberUtils';

// Array utilities
export {
  removeDuplicates,
  flattenArray,
  groupBy,
  chunkArray,
  filterByConditions,
  mapArray,
  findItem,
  includesAll,
  includesAny,
  sortBy,
  removeItem,
  swapItems,
  difference,
  intersection,
  default as arrayUtils
} from './arrayUtils';
