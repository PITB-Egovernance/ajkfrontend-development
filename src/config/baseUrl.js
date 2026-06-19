// LIVE BACKEND — disabled. Uncomment to use the live API again.
const apiUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";
const productionUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";

// LOCAL BACKEND — active. Develop against the local Laravel server.
// const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

const apiKey = process.env.REACT_APP_API_KEY || "9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW";

const localUrl      = "http://localhost:3000";

// In development the dev-server proxy (src/setupProxy.js) routes /candidate-api →
// candidate portal (avoids CORS, since the live candidate portal doesn't allow
// http://localhost:3000 as an origin). In production the candidate portal must
// allow the admin domain via CORS headers, so the absolute URL is used directly.
const candidateApiUrl = process.env.REACT_APP_CANDIDATE_API_URL
  || (process.env.NODE_ENV === 'development'
        ? '/candidate-api/api/candidate'
        : 'https://api-candidate-ajkpsc.punjab.gov.pk/api/candidate');

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
