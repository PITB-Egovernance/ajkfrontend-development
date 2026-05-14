const apiUrl = process.env.REACT_APP_API_URL || "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";
const apiKey = process.env.REACT_APP_API_KEY || "9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW";

// Fallbacks for specific URLs if needed
const productionUrl = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";
const localUrl      = "http://localhost:3000";
const candidateApiUrl = "https://api-candidate-ajkpsc.punjab.gov.pk/api/candidate";

const Config = {
  apiUrl,
  apiKey,
  productionUrl,
  localUrl,
  candidateApiUrl,
};

export default Config;