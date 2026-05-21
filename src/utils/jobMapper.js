/**
 * Utility for normalizing job data across the application
 */

/**
 * Normalizes job details to handle both snake_case and camelCase from backend
 * @param {Object} job 
 * @returns {Object}
 */
export const normalizeJobResponse = (job) => {
  if (!job) return null;
  
  return {
    ...job,
    id: job.id,
    hash_id: job.hash_id || job.hashId || '',
    designation: job.designation || job.designation_name || 'N/A',
    jobDetails: job.job_details || job.jobDetails || [],
  };
};

/**
 * Gets the ID to be used in URLs (prefers hash_id for security/SEO)
 * @param {Object} job 
 * @returns {string|number}
 */
export const getJobRouteId = (job) => {
  if (!job) return '';
  return job.hash_id || job.hashId || job.id;
};

/**
 * Gets the numeric ID for API calls
 * @param {Object} job 
 * @returns {number}
 */
export const getJobApiId = (job) => {
  if (!job) return null;
  return job.id;
};
