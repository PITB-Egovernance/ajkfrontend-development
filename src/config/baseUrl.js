// Admin portal configuration. Values come from the .env files (see AJK_ENV_SETUP_GUIDE.md):
// `.env` holds the live values, `.env.development` (local, untracked) can point `npm start` at a
// local backend. They are baked in at build time, so rebuild after changing them.
const apiUrl = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
const apiKey = process.env.REACT_APP_API_KEY || '';

if (!apiUrl || !apiKey) {
  // eslint-disable-next-line no-console
  console.error('REACT_APP_API_URL / REACT_APP_API_KEY are not set — check the .env file and rebuild.');
}

// Uploaded files are served from the backend root, not from /api/v1.
const fileBaseUrl = apiUrl.replace(/\/api(\/v\d+)?$/, '');

const Config = {
  apiUrl,
  apiKey,
  fileBaseUrl,
};

export default Config;
