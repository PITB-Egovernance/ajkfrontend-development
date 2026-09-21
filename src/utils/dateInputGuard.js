import toast from 'react-hot-toast';

/**
 * Project-wide guard for native <input type="date"> fields (also the ones MUI's
 * TextField renders). Installed once from index.js, so every date field — present
 * and future — gets the same rules without per-page wiring:
 *
 *  - Year is held to 4 digits, whether typed or picked from the calendar. (Day and
 *    month are already fixed at 2 digits by the control itself.) The `max` attribute is
 *    defaulted to 9999-12-31, which makes browsers stop accepting a 5th/6th year digit,
 *    and any value that still gets through is trimmed back to 4 digits.
 *  - A field that declares a `min` (future-only dates such as closing / exam / interview
 *    dates) cannot be left holding an earlier date, and one that declares a `max` (filters,
 *    which take past dates only, with max = today) cannot be left holding a later one: the
 *    calendar greys those days out and a typed one is put back when the user leaves the
 *    field or submits the form. A value the field already held when it was focused (an
 *    existing record) is kept as it was.
 *
 * Checks run on blur/submit, not on every keystroke: while a year is being typed the
 * control passes through values like 0002-…, 0020-…, which are "past" but not final.
 */

export const DATE_INPUT_MAX = '9999-12-31';
export const PAST_DATE_MESSAGE = 'Past dates are not allowed. Please choose today or a later date.';
export const FUTURE_DATE_MESSAGE = 'Future dates are not allowed. Please choose today or an earlier date.';

const isDateInput = (el) => typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement && el.type === 'date';

// Trims an over-long year ("12345-05-01", "+012345-05-01") back to 4 digits.
export const clampDateValue = (value) => {
  const m = /^\+?(\d{5,})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  return m ? `${m[1].slice(0, 4)}-${m[2]}-${m[3]}` : value;
};

// True when `value` (YYYY-MM-DD) is earlier than `min`. Both must be complete dates.
export const isBeforeMin = (value, min) => (
  /^\d{4,}-\d{2}-\d{2}$/.test(String(value || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(min || '')) && value < min
);

// True when `value` (YYYY-MM-DD) is later than `max`. Both must be complete dates.
export const isAfterMax = (value, max) => (
  /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(max || '')) && value > max
);

// Sets the value through the prototype setter so React's value tracker still sees a change,
// then lets React's onChange run with the new value.
const writeValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
};

const notifyReact = (input) => input.dispatchEvent(new Event('input', { bubbles: true }));

// Puts back the value the field held when it was focused (or empties it) if it is now outside
// its min/max. Returns true when it had to correct the field.
export const enforceRange = (input) => {
  if (!isDateInput(input)) return false;

  const tooEarly = isBeforeMin(input.value, input.min);
  const tooLate = isAfterMax(input.value, input.max);
  if (!tooEarly && !tooLate) return false;

  const initial = input.dataset.dateInitial || '';
  if (input.value === initial) return false; // an existing out-of-range value being left alone

  writeValue(input, initial);
  notifyReact(input);
  toast.error(tooEarly ? PAST_DATE_MESSAGE : FUTURE_DATE_MESSAGE, { id: 'date-out-of-range' });
  return true;
};

let installed = false;

export const installDateInputGuard = (doc = document) => {
  if (installed) return;
  installed = true;

  doc.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!isDateInput(el)) return;
    if (!el.getAttribute('max')) el.setAttribute('max', DATE_INPUT_MAX);
    el.dataset.dateInitial = el.value;
  }, true);

  // Capture phase on the document runs before React reads the event, so onChange sees the clamped value.
  doc.addEventListener('input', (e) => {
    const el = e.target;
    if (!isDateInput(el)) return;
    const clamped = clampDateValue(el.value);
    if (clamped !== el.value) writeValue(el, clamped);
  }, true);

  doc.addEventListener('focusout', (e) => enforceRange(e.target), true);

  doc.addEventListener('submit', (e) => {
    let corrected = false;
    e.target.querySelectorAll?.('input[type="date"]').forEach((el) => { corrected = enforceRange(el) || corrected; });
    // State updates from the corrections land after this submit's handlers were bound, so
    // stop this attempt; the user can submit again with the corrected values.
    if (corrected) e.preventDefault();
  }, true);
};
