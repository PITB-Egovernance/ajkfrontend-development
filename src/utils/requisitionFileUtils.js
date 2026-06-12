/**
 * Requisition File Utilities
 * Helpers for normalizing the service_rules/syllabus fields returned by the
 * requisitions API, which have been observed in several shapes: a plain
 * string path, an array containing a path, an empty object (`{}`), or a
 * relation-style object with the path under a key such as `path`/`url`.
 */

const FILE_PATH_KEYS = ['path', 'file_path', 'filepath', 'url', 'file_url', 'location', 'name'];

/**
 * Returns true if the given string looks like a file path/name with a
 * recognized document extension.
 * @param {*} str - Value to check
 * @returns {boolean}
 */
const looksLikeFilePath = (str) =>
  typeof str === 'string' && str.trim() !== '' && /\.(pdf|docx?|xlsx?)$/i.test(str.trim());

/**
 * Normalizes a service_rules/syllabus field value to a usable file path
 * string (or the original `File` object if a new upload is in progress).
 * Returns `null` if no usable path can be found (e.g. an empty `{}`).
 * @param {*} value - Raw value from form state or API response
 * @param {number} [depth] - Internal recursion guard
 * @returns {string|File|null}
 */
export const extractFilePath = (value, depth = 0) => {
  if (value === null || value === undefined || depth > 4) return null;
  if (value instanceof File) return value;
  if (typeof value === 'string') return value.trim() !== '' ? value : null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractFilePath(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const key of FILE_PATH_KEYS) {
      if (looksLikeFilePath(value[key])) return value[key];
    }
    for (const key of Object.keys(value)) {
      const found = extractFilePath(value[key], depth + 1);
      if (found) return found;
    }
    return null;
  }

  return null;
};

// Fields persisted via persistDraftFilePath/getPersistedDraftFilePath below.
const DRAFT_FILE_FIELDS = ['service_rules', 'syllabus'];

const draftFileStorageKey = (tempId, field) => `req_${tempId}_${field}`;

/**
 * Persists a resolved service_rules/syllabus file path for a draft requisition
 * to localStorage, keyed by temp_id. Workaround for the backend's
 * storeStep() fully overwriting step1_data on every save — see
 * BACKEND_FIX_REQUISITION_FILE_DROP.md. Remove once that fix is deployed.
 * @param {string} tempId
 * @param {'service_rules'|'syllabus'} field
 * @param {string|null|undefined} path
 */
export const persistDraftFilePath = (tempId, field, path) => {
  if (!tempId || typeof path !== 'string' || path.trim() === '') return;
  try {
    localStorage.setItem(draftFileStorageKey(tempId, field), path);
  } catch { /* ignore storage errors (private mode, quota, etc.) */ }
};

/**
 * Reads back a file path persisted via persistDraftFilePath.
 * @param {string} tempId
 * @param {'service_rules'|'syllabus'} field
 * @returns {string|null}
 */
export const getPersistedDraftFilePath = (tempId, field) => {
  if (!tempId) return null;
  try {
    return localStorage.getItem(draftFileStorageKey(tempId, field));
  } catch {
    return null;
  }
};

/**
 * Clears persisted file paths for a draft requisition (e.g. once confirmed
 * or deleted).
 * @param {string} tempId
 */
export const clearPersistedDraftFiles = (tempId) => {
  if (!tempId) return;
  try {
    DRAFT_FILE_FIELDS.forEach((field) => localStorage.removeItem(draftFileStorageKey(tempId, field)));
  } catch { /* ignore storage errors */ }
};
