/**
 * Storage Utilities
 * Helper functions for localStorage operations
 */

/**
 * Safely sets an item in localStorage
 * @param {string} key - The storage key
 * @param {*} value - The value to store (will be JSON stringified if object)
 * @returns {boolean} Success status
 */
export const setStorageItem = (key, value) => {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`Error setting localStorage item "${key}":`, error);
    return false;
  }
};

/**
 * Safely gets an item from localStorage
 * @param {string} key - The storage key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Parsed value or default
 */
export const getStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    
    try {
      return JSON.parse(item);
    } catch {
      return item; // Return as string if not JSON
    }
  } catch (error) {
    console.error(`Error getting localStorage item "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Removes an item from localStorage
 * @param {string} key - The storage key
 * @returns {boolean} Success status
 */
export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage item "${key}":`, error);
    return false;
  }
};

/**
 * Checks if a key exists in localStorage
 * @param {string} key - The storage key
 * @returns {boolean} True if key exists
 */
export const hasStorageItem = (key) => {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking localStorage item "${key}":`, error);
    return false;
  }
};

/**
 * Clears all items from localStorage (use with caution)
 * @returns {boolean} Success status
 */
export const clearStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/**
 * Gets all keys from localStorage
 * @returns {string[]} Array of storage keys
 */
export const getStorageKeys = () => {
  try {
    return Object.keys(localStorage);
  } catch (error) {
    console.error('Error getting localStorage keys:', error);
    return [];
  }
};

/**
 * Gets the size of localStorage in bytes
 * @returns {number} Size in bytes
 */
export const getStorageSize = () => {
  let size = 0;
  try {
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
  } catch (error) {
    console.error('Error calculating storage size:', error);
  }
  return size;
};

/**
 * Safely sets multiple items in localStorage
 * @param {Object} items - Key-value pairs to store
 * @returns {boolean} Success status
 */
export const setStorageItems = (items) => {
  try {
    Object.entries(items).forEach(([key, value]) => {
      setStorageItem(key, value);
    });
    return true;
  } catch (error) {
    console.error('Error setting multiple storage items:', error);
    return false;
  }
};

/**
 * Safely removes multiple items from localStorage
 * @param {string[]} keys - Array of storage keys to remove
 * @returns {boolean} Success status
 */
export const removeStorageItems = (keys) => {
  try {
    keys.forEach(key => removeStorageItem(key));
    return true;
  } catch (error) {
    console.error('Error removing multiple storage items:', error);
    return false;
  }
};

const storageUtils = {
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  hasStorageItem,
  clearStorage,
  getStorageKeys,
  getStorageSize,
  setStorageItems,
  removeStorageItems
};

export default storageUtils;
