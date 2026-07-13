// LIVE BACKEND — active. Use the live API for deployment.
const apiUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";
// const apiUrl = "http://localhost:8000/api/v1";
const productionUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";

// LOCAL BACKEND — used ONLY by the result import (upload) endpoints for local testing.
// Remove/ignore when local testing of the result module is done.
const localApiUrl = process.env.REACT_APP_LOCAL_API_URL || "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";

const apiKey =
  process.env.REACT_APP_API_KEY ||
  "9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW";

const localUrl = "http://localhost:3000";

// Candidate portal
// Development: use proxy configured in setupProxy.js to avoid CORS issues
// const candidateApiUrl = "/candidate-api/api/candidate";
// Production:
const candidateApiUrl = "https://api-candidate-ajkpsc.punjab.gov.pk/api/candidate";

// Candidate portal — admin-scoped endpoints (e.g. CCE subject selection lookup
// by roll number). Called directly from the browser — the candidate portal's
// config/cors.php allows this admin frontend's origin.
const candidateAdminApiUrl = "https://api-candidate-ajkpsc.punjab.gov.pk/api/admin";
// Local dev (uses the setupProxy.js proxy instead, to avoid needing localhost
// added to the candidate portal's CORS allow-list):
// const candidateAdminApiUrl = "/candidate-api/api/admin";

const candidateApiKey = "admin-secret-key-123";

const Config = {
  apiUrl,
  localApiUrl,
  apiKey,
  productionUrl,
  localUrl,
  candidateApiUrl,
  candidateAdminApiUrl,
  candidateApiKey,
};

export default Config;