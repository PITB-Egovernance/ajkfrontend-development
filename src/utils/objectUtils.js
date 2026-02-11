/**
 * Data/Object Utilities
 * Helper functions for object and data manipulation
 */

/**
 * Deep clones an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
};

/**
 * Checks if two objects are equal
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} True if objects are equal
 */
export const objectsEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

/**
 * Gets nested value from object using dot notation
 * @param {Object} obj - Object to query
 * @param {string} path - Dot notation path (e.g., "user.profile.name")
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or default
 */
export const getNestedValue = (obj, path, defaultValue = null) => {
  try {
    const value = path.split('.').reduce((current, prop) => current?.[prop], obj);
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Sets nested value in object using dot notation
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path (e.g., "user.profile.name")
 * @param {*} value - Value to set
 * @returns {Object} Modified object
 */
export const setNestedValue = (obj, path, value) => {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
  return obj;
};

/**
 * Filters out null/undefined values from object
 * @param {Object} obj - Object to filter
 * @returns {Object} Filtered object
 */
export const filterNull = (obj) => {
  const filtered = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined) {
      filtered[key] = obj[key];
    }
  }
  return filtered;
};

/**
 * Merges multiple objects
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
export const mergeObjects = (...objects) => {
  return objects.reduce((merged, obj) => ({ ...merged, ...obj }), {});
};

/**
 * Extracts specified keys from object
 * @param {Object} obj - Object to extract from
 * @param {string[]} keys - Keys to extract
 * @returns {Object} Object with only specified keys
 */
export const pickKeys = (obj, keys) => {
  const picked = {};
  keys.forEach(key => {
    if (key in obj) {
      picked[key] = obj[key];
    }
  });
  return picked;
};

/**
 * Removes specified keys from object
 * @param {Object} obj - Object to modify
 * @param {string[]} keys - Keys to remove
 * @returns {Object} Object without specified keys
 */
export const omitKeys = (obj, keys) => {
  const omitted = { ...obj };
  keys.forEach(key => delete omitted[key]);
  return omitted;
};

/**
 * Converts object keys to camelCase
 * @param {Object} obj - Object to convert
 * @returns {Object} Object with camelCase keys
 */
export const toCamelCaseObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const converted = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      converted[camelKey] = obj[key];
    }
  }
  return converted;
};

/**
 * Converts object keys to snake_case
 * @param {Object} obj - Object to convert
 * @returns {Object} Object with snake_case keys
 */
export const toSnakeCaseObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const converted = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      converted[snakeKey] = obj[key];
    }
  }
  return converted;
};

/**
 * Checks if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is empty
 */
export const isEmpty = (obj) => {
  if (!obj || typeof obj !== 'object') return true;
  return Object.keys(obj).length === 0;
};

const objectUtils = {
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
  isEmpty
};

export default objectUtils;
