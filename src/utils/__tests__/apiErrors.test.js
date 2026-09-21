import {
  getErrorMessage,
  getErrorCode,
  getErrorDetails,
  apiErrorMessage,
  NETWORK_MESSAGE,
  SERVER_MESSAGE,
} from 'utils/apiErrors';

const apiError = (status, message, errors = {}) => Object.assign(new Error(message), { status, errors });

describe('getErrorMessage', () => {
  it('shows the backend message when it is meaningful', () => {
    expect(getErrorMessage(apiError(422, 'The start roll number must come before the end roll number.'), 'x'))
      .toBe('The start roll number must come before the end roll number.');
  });

  it('prefers the first field error over "Validation failed"', () => {
    const err = apiError(422, 'Validation failed', { closing_date: ['Closing date must be after the advertisement date'] });
    expect(getErrorMessage(err, 'x')).toBe('Closing date must be after the advertisement date');
  });

  it('replaces developer-speak with plain language', () => {
    expect(getErrorMessage(apiError(500, 'Request failed (500)'), 'x')).toBe(SERVER_MESSAGE);
    expect(getErrorMessage(apiError(500, 'Server error'), 'x')).toBe(SERVER_MESSAGE);
    expect(getErrorMessage(apiError(404, 'Request failed'), 'x')).toBe('The requested record could not be found.');
    expect(getErrorMessage(apiError(403, 'Request failed'), 'x')).toBe('You do not have permission to do this.');
    expect(getErrorMessage(apiError(401, ''), 'x')).toBe('Your session has expired. Please log in again.');
  });

  it('explains a request that never reached the server', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'), 'x')).toBe(NETWORK_MESSAGE);
  });

  it('keeps a 5xx message that quotes a support reference', () => {
    const msg = 'Failed to publish results. Please try again. If the problem continues, contact support and quote reference AB12CD34.';
    expect(getErrorMessage(apiError(500, msg, { code: 'SERVER_ERROR', reference: 'AB12CD34' }), 'x')).toBe(msg);
  });

  it('falls back when nothing better is known', () => {
    expect(getErrorMessage(undefined, 'Could not save.')).toBe('Could not save.');
    expect(getErrorMessage(apiError(400, ''), 'Could not save.')).toBe('Could not save.');
  });
});

describe('business-rule errors', () => {
  const err = apiError(422, 'Center is full.', { code: 'CENTER_FULL', capacity: 100, allocated: 100 });

  it('exposes the error code', () => {
    expect(getErrorCode(err)).toBe('CENTER_FULL');
    expect(getErrorCode(apiError(422, 'x', { field: ['bad'] }))).toBeNull();
  });

  it('exposes the structured details without the code', () => {
    expect(getErrorDetails(err)).toEqual({ capacity: 100, allocated: 100 });
  });
});

describe('apiErrorMessage (used by the api/*.js response handlers)', () => {
  it('builds a human message from a response body', () => {
    expect(apiErrorMessage({ message: 'Exam not held yet.' }, 422, 'fallback')).toBe('Exam not held yet.');
    expect(apiErrorMessage({}, 500, 'fallback')).toBe(SERVER_MESSAGE);
    expect(apiErrorMessage({ error: 'nope' }, 400, 'fallback')).toBe('nope');
  });
});
