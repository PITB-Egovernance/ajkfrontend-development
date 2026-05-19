const productionUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";
const localUrl      = "http://localhost:3000";
// const apiUrl        = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";
const apiUrl        = "http://localhost:8000/api/v1";

// rollNumberApiUrl stays pointed at local — same target as apiUrl now
// (the split mattered only when apiUrl was live).
const rollNumberApiUrl = "http://localhost:8000/api/v1";

// In development the CRACO proxy routes /candidate-api → candidate portal (avoids CORS).
// In production the candidate portal must allow the admin domain via CORS headers.
const candidateApiUrl = process.env.NODE_ENV === 'development'
  ? '/candidate-api/api/candidate'
  : 'https://api-candidate-ajkpsc.punjab.gov.pk/api/candidate';

const apiKey        = "9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW";
const candidateApiKey = "admin-secret-key-123";


const Config = {
  productionUrl,
  localUrl,
  apiUrl,
  rollNumberApiUrl,
  candidateApiUrl,
  apiKey,
  candidateApiKey
};

export default Config;