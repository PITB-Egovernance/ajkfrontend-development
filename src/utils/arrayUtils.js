/**
 * Array Utilities
 * Helper functions for array operations
 */

/**
 * Removes duplicates from array
 * @param {Array} arr - Array to deduplicate
 * @param {string} key - Optional key for object arrays
 * @returns {Array} Array with unique values
 */
export const removeDuplicates = (arr, key = null) => {
  if (!Array.isArray(arr)) return [];
  
  if (key) {
    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  return [...new Set(arr)];
};

/**
 * Flattens nested array
 * @param {Array} arr - Array to flatten
 * @param {number} depth - Depth to flatten (default: Infinity)
 * @returns {Array} Flattened array
 */
export const flattenArray = (arr, depth = Infinity) => {
  if (!Array.isArray(arr)) return [];
  return arr.flat(depth);
};

/**
 * Groups array items by key
 * @param {Array} arr - Array to group
 * @param {string|function} key - Key or function to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (arr, key) => {
  if (!Array.isArray(arr)) return {};
  
  return arr.reduce((grouped, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(item);
    return grouped;
  }, {});
};

/**
 * Chunks array into smaller arrays
 * @param {Array} arr - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
export const chunkArray = (arr, size) => {
  if (!Array.isArray(arr) || size <= 0) return [];
  
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Filters array by multiple conditions
 * @param {Array} arr - Array to filter
 * @param {Object} conditions - Conditions object
 * @returns {Array} Filtered array
 */
export const filterByConditions = (arr, conditions) => {
  if (!Array.isArray(arr)) return [];
  
  return arr.filter(item => {
    return Object.entries(conditions).every(([key, value]) => {
      if (typeof value === 'function') {
        return value(item[key]);
      }
      return item[key] === value;
    });
  });
};

/**
 * Maps array to new array with transformed values
 * @param {Array} arr - Array to map
 * @param {string|function} key - Key or function to map
 * @returns {Array} Mapped array
 */
export const mapArray = (arr, key) => {
  if (!Array.isArray(arr)) return [];
  
  return arr.map(item => {
    if (typeof key === 'function') {
      return key(item);
    }
    return item[key];
  });
};

/**
 * Finds item in array by condition
 * @param {Array} arr - Array to search
 * @param {function|Object} condition - Search condition
 * @returns {*} Found item or undefined
 */
export const findItem = (arr, condition) => {
  if (!Array.isArray(arr)) return undefined;
  
  if (typeof condition === 'function') {
    return arr.find(condition);
  }

  return arr.find(item => {
    return Object.entries(condition).every(([key, value]) => item[key] === value);
  });
};

/**
 * Checks if array includes all values
 * @param {Array} arr - Array to check
 * @param {Array} values - Values to find
 * @returns {boolean} True if all values found
 */
export const includesAll = (arr, values) => {
  if (!Array.isArray(arr) || !Array.isArray(values)) return false;
  return values.every(value => arr.includes(value));
};

/**
 * Checks if array includes any value
 * @param {Array} arr - Array to check
 * @param {Array} values - Values to find
 * @returns {boolean} True if any value found
 */
export const includesAny = (arr, values) => {
  if (!Array.isArray(arr) || !Array.isArray(values)) return false;
  return values.some(value => arr.includes(value));
};

/**
 * Sorts array of objects by key
 * @param {Array} arr - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
export const sortBy = (arr, key, order = 'asc') => {
  if (!Array.isArray(arr)) return [];
  
  const sorted = [...arr].sort((a, b) => {
    const valueA = a[key];
    const valueB = b[key];

    if (valueA < valueB) return order === 'asc' ? -1 : 1;
    if (valueA > valueB) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

/**
 * Removes item from array by value or index
 * @param {Array} arr - Array to modify
 * @param {*} valueOrIndex - Value or index to remove
 * @returns {Array} Modified array
 */
export const removeItem = (arr, valueOrIndex) => {
  if (!Array.isArray(arr)) return [];
  
  if (typeof valueOrIndex === 'number') {
    return [...arr.slice(0, valueOrIndex), ...arr.slice(valueOrIndex + 1)];
  }

  return arr.filter(item => item !== valueOrIndex);
};

/**
 * Swaps items in array
 * @param {Array} arr - Array to modify
 * @param {number} index1 - First index
 * @param {number} index2 - Second index
 * @returns {Array} Modified array
 */
export const swapItems = (arr, index1, index2) => {
  if (!Array.isArray(arr) || index1 < 0 || index2 < 0) return arr;
  
  const swapped = [...arr];
  [swapped[index1], swapped[index2]] = [swapped[index2], swapped[index1]];
  return swapped;
};

/**
 * Gets difference between two arrays
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {Array} Items in arr1 not in arr2
 */
export const difference = (arr1, arr2) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
  return arr1.filter(item => !arr2.includes(item));
};

/**
 * Gets intersection of two arrays
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {Array} Items in both arrays
 */
export const intersection = (arr1, arr2) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
  return arr1.filter(item => arr2.includes(item));
};

const arrayUtils = {
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
  intersection
};

export default arrayUtils;
