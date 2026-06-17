// LOCAL BACKEND — active for development
const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";
const productionUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";

// LIVE BACKEND — disabled for local development
// const apiUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";

const apiKey =
  process.env.REACT_APP_API_KEY ||
  "9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW";

const localUrl = "http://localhost:3000";

// Candidate portal
// Development: use proxy configured in setupProxy.js to avoid CORS issues
const candidateApiUrl = "/candidate-api/api/candidate";
// Production:
// const candidateApiUrl = "https://api-candidate-ajkpsc.punjab.gov.pk/api/candidate";

const candidateApiKey = "admin-secret-key-123";

const Config = {
  apiUrl,
  apiKey,
  productionUrl,
  localUrl,
  candidateApiUrl,
  candidateApiKey,
};

export default Config;