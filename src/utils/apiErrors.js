import toast from 'react-hot-toast';
import { showNotice } from 'components/ui/noticeDialog';

/**
 * Central place that turns any failed API call into a human-readable message.
 *
 * The backend answers every failure with
 *   { success: false, message: '...', errors: { code?: 'ERROR_CODE', <field>: [...], ...details } }
 * (see App\Traits\JsonResponseTrait). Technical exception text never reaches the
 * client — it stays in the Laravel module logs — so whatever `message` says is safe
 * to show. Network failures and 5xx responses with no usable message get a plain
 * fallback instead of "Server Error" / "Failed to fetch".
 */

const GENERIC_MESSAGES = new Set([
  'server error',
  'failed to fetch',
  'fetch error',
  'network error',
  'request failed',
  'internal server error',
  'operation failed',
  'an error occurred',
]);

export const NETWORK_MESSAGE =
  'Could not reach the server. Please check your internet connection and try again.';
export const SERVER_MESSAGE =
  'Something went wrong on our side. Please try again in a moment. If it keeps happening, contact support.';

const isGeneric = (msg) => {
  if (!msg) return true;
  const m = String(msg).trim().toLowerCase().replace(/\.$/, '');
  return GENERIC_MESSAGES.has(m) || /^(request|export|download) failed( \(\d+\))?$/.test(m);
};

const firstFieldError = (errors) => {
  if (!errors || typeof errors !== 'object') return null;
  for (const [key, value] of Object.entries(errors)) {
    if (key === 'code' || key === 'debug') continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string' && first) return first;
  }
  return null;
};

/** Best human-readable message for an Error thrown by an api helper (or a parsed error body). */
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;
  if (typeof err === 'string') return isGeneric(err) ? fallback : err;

  // fetch() itself rejected: offline, DNS, CORS, aborted ...
  if (err instanceof TypeError || err.name === 'TypeError') return NETWORK_MESSAGE;

  const status = err.status ?? err.response?.status;
  const body = err.response?.data ?? err;
  const message = body?.message ?? err.message;
  const errors = body?.errors ?? err.errors;

  // Validation: prefer the specific field message over "Validation failed".
  if (status === 422 || (errors && typeof errors === 'object' && !errors.code)) {
    const field = firstFieldError(errors);
    if (field) return field;
  }

  if (!isGeneric(message) && !/^validation (failed|errors occurred)$/i.test(String(message).trim())) {
    return message;
  }

  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'The requested record could not be found.';
  if (status === 419 || status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return SERVER_MESSAGE;

  return fallback;
};

/**
 * For api/*.js response handlers: the message to put on the Error they throw, so every
 * caller that does `toast.error(err.message)` already shows a human sentence.
 */
export const apiErrorMessage = (result, status, fallback = 'The request could not be completed.') =>
  getErrorMessage({ status, message: result?.message ?? result?.error, errors: result?.errors }, fallback);

/** Machine-readable code from a business-rule rejection, if the backend sent one. */
export const getErrorCode = (err) => err?.errors?.code ?? err?.response?.data?.errors?.code ?? null;

/** Structured extra data (capacity, counts ...) that came with the rejection. */
export const getErrorDetails = (err) => {
  const errors = err?.errors ?? err?.response?.data?.errors;
  if (!errors || typeof errors !== 'object') return {};
  const { code, debug, ...rest } = errors; // eslint-disable-line no-unused-vars
  return rest;
};

/** Show an error as a toast — for the routine case where a modal would be overkill. */
export const toastApiError = (err, fallback) => toast.error(getErrorMessage(err, fallback));

/**
 * Show an error in the alert modal. Business-rule rejections (those carrying an
 * `errors.code`) always deserve the modal; pass `title` to name the action.
 */
export const showApiError = (err, { title = 'Action not allowed', fallback, tone = 'warning', details } = {}) =>
  showNotice({
    tone: getErrorCode(err) ? tone : 'error',
    title,
    message: getErrorMessage(err, fallback),
    details,
  });

/* ---------------------------------------------------------------------------
 * Business-rule rejections (errors.code) -> alert modal
 * ------------------------------------------------------------------------- */

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Per error code: modal title + the structured facts worth listing under the message.
const CODE_PRESENTATION = {
  EXAM_NOT_YET_HELD: (d) => ({
    title: 'Examination not held yet',
    details: [
      { label: 'Post', value: d.post_name },
      { label: 'Examination date', value: formatDate(d.exam_date) },
      { label: 'Days remaining', value: d.days_remaining },
    ],
  }),
  CENTER_CAPACITY_EXCEEDED: (d) => ({
    title: 'Center capacity exceeded',
    details: [
      { label: 'Center', value: d.center_name },
      { label: 'Total capacity', value: d.capacity },
      { label: 'Already allocated', value: d.allocated },
      { label: 'Remaining capacity', value: d.remaining },
      { label: 'Requested allocation', value: d.requested },
    ],
  }),
  CENTER_FULL: (d) => ({
    title: 'Center is full',
    details: [
      { label: 'Center', value: d.center_name },
      { label: 'Total capacity', value: d.capacity },
      { label: 'Already allocated', value: d.allocated },
    ],
  }),
  RANGE_EXCEEDS_CANDIDATES: (d) => ({
    title: 'Range exceeds available candidates',
    details: [
      { label: 'Requested range', value: d.requested_range },
      { label: 'Requested', value: d.requested },
      { label: 'Available in this batch', value: d.available },
    ],
  }),
  RANGE_ALREADY_ALLOCATED: (d) => ({
    title: 'Roll numbers already allocated',
    details: [
      { label: 'Requested range', value: d.requested_range },
      { label: 'Already allocated', value: d.already_allocated },
      { label: 'Still unallocated', value: d.unallocated },
    ],
  }),
  INVALID_ROLL_NUMBER_RANGE: (d) => ({
    title: 'Invalid roll number range',
    details: [
      { label: 'Start', value: d.start_roll_number },
      { label: 'End', value: d.end_roll_number },
      { label: 'Batch range', value: d.batch_range },
    ],
  }),
  ADVERTISEMENT_PERMANENTLY_CLOSED: () => ({ title: 'Advertisement is read-only' }),
  ADVERTISEMENT_AUTO_CLOSED: () => ({ title: 'Advertisement is closed' }),
  ADVERTISEMENT_HAS_APPLICATIONS: (d) => ({
    title: 'Advertisement cannot be deleted',
    details: [{ label: 'Candidates who applied', value: d.applications_count }],
  }),
};

/**
 * One call for every catch block: a business-rule rejection opens the alert modal
 * with its structured facts; anything else becomes a plain human-readable toast.
 *
 *   } catch (err) { handleApiError(err, { fallback: 'Could not publish the result.' }); }
 *
 * Resolves once the modal is dismissed (immediately for a toast).
 */
export const handleApiError = async (err, { fallback, title, tone = 'warning' } = {}) => {
  const code = getErrorCode(err);
  if (!code) {
    toast.error(getErrorMessage(err, fallback));
    return;
  }

  const presented = (CODE_PRESENTATION[code] || (() => ({})))(getErrorDetails(err));
  const isServerError = code === 'SERVER_ERROR';
  await showNotice({
    tone: isServerError ? 'error' : tone,
    title: title || (isServerError ? 'Something went wrong' : presented.title) || 'Action not allowed',
    message: getErrorMessage(err, fallback),
    details: presented.details,
  });
};
