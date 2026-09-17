// LOCAL BACKEND — active for local dev against the shared local DB (see
// D:\GitHub\ajk\LOCAL_DUAL_PORTAL_SETUP.md). To revert to the live API, comment this line
// back out and uncomment the "LIVE BACKEND" line below instead.
const apiUrl = "http://localhost:8000/api/v1";
// LIVE BACKEND — production. Restore this to go back to the live API.
// const apiUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";
const productionUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";

// LOCAL BACKEND — used ONLY by the result import (upload) endpoints for local testing.
// Remove/ignore when local testing of the result module is done.
const localApiUrl = process.env.REACT_APP_LOCAL_API_URL || "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";

const apiKey =
  process.env.REACT_APP_API_KEY ||
  "9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW";

// const localUrl = "http://localhost:3000";

// Candidate portal
// LOCAL BACKEND — active for local dev (candidate backend runs on port 8001 locally, see
// D:\GitHub\ajk\LOCAL_DUAL_PORTAL_SETUP.md). To revert, comment this out and uncomment the
// "Production" line below instead.
const candidateApiUrl = "http://localhost:8001/api/candidate";
// Production:
// const candidateApiUrl = "https://api-candidate-ajkpsc.punjab.gov.pk/api/candidate";

// Candidate portal — admin-scoped endpoints (e.g. CCE subject selection lookup
// by roll number). Called directly from the browser — the candidate portal's
// config/cors.php allows this admin frontend's origin (both localhost:3000 and
// localhost:3001 are already in that allow-list).
const candidateAdminApiUrl = "http://localhost:8001/api/admin";
// Production:
// const candidateAdminApiUrl = "https://api-candidate-ajkpsc.punjab.gov.pk/api/admin";

const candidateApiKey = "admin-secret-key-123";

const Config = {
  apiUrl,
  localApiUrl,
  apiKey,
  productionUrl,
  // localUrl,
  candidateApiUrl,
  candidateAdminApiUrl,
  candidateApiKey,
};

export default Config;
