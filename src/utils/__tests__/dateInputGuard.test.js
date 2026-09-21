import toast from 'react-hot-toast';
import {
  clampDateValue,
  isBeforeMin,
  isAfterMax,
  enforceRange,
  installDateInputGuard,
  DATE_INPUT_MAX,
  PAST_DATE_MESSAGE,
  FUTURE_DATE_MESSAGE,
} from 'utils/dateInputGuard';
import { todayIsoDate } from 'utils/dateUtils';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn() } }));

const shiftDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

describe('clampDateValue — year is held to 4 digits', () => {
  it('trims a 5 or 6 digit year', () => {
    expect(clampDateValue('12345-05-01')).toBe('1234-05-01');
    expect(clampDateValue('+012345-05-01')).toBe('0123-05-01');
  });

  it('leaves a normal date, a partial value and empty alone', () => {
    expect(clampDateValue('2026-05-01')).toBe('2026-05-01');
    expect(clampDateValue('')).toBe('');
    expect(clampDateValue(undefined)).toBeUndefined();
  });
});

describe('isBeforeMin', () => {
  it('compares complete dates only', () => {
    expect(isBeforeMin('2020-01-01', '2026-01-01')).toBe(true);
    expect(isBeforeMin('2026-01-01', '2026-01-01')).toBe(false);
    expect(isBeforeMin('2030-01-01', '2026-01-01')).toBe(false);
    expect(isBeforeMin('', '2026-01-01')).toBe(false);
    expect(isBeforeMin('2020-01-01', '')).toBe(false);
  });
});

describe('isAfterMax', () => {
  it('compares complete dates only', () => {
    expect(isAfterMax('2030-01-01', '2026-01-01')).toBe(true);
    expect(isAfterMax('2026-01-01', '2026-01-01')).toBe(false);
    expect(isAfterMax('2020-01-01', '2026-01-01')).toBe(false);
    expect(isAfterMax('', '2026-01-01')).toBe(false);
    expect(isAfterMax('2030-01-01', '')).toBe(false);
  });
});

describe('date input guard on the document', () => {
  let input;
  let inputEvents;

  beforeAll(() => installDateInputGuard());

  beforeEach(() => {
    toast.error.mockClear();
    input = document.createElement('input');
    input.type = 'date';
    document.body.appendChild(input);
    inputEvents = 0;
    input.addEventListener('input', () => { inputEvents += 1; });
  });

  afterEach(() => input.remove());

  const focus = () => input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  const blur = () => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

  it('defaults max to 9999-12-31 on focus so browsers stop at a 4-digit year', () => {
    focus();
    expect(input.max).toBe(DATE_INPUT_MAX);
  });

  it('keeps a max the field already declares', () => {
    input.max = '2030-01-01';
    focus();
    expect(input.max).toBe('2030-01-01');
  });

  it('puts a typed past date back to empty when the field is left', () => {
    input.min = todayIsoDate();
    focus();
    input.value = shiftDays(-3);
    blur();

    expect(input.value).toBe('');
    expect(inputEvents).toBe(1); // React is told, so its state matches
    expect(toast.error).toHaveBeenCalledWith(PAST_DATE_MESSAGE, expect.any(Object));
  });

  it('puts back the date the field held when it was focused', () => {
    input.min = todayIsoDate();
    input.value = shiftDays(5);
    focus();
    input.value = shiftDays(-3);
    blur();

    expect(input.value).toBe(shiftDays(5));
  });

  it('leaves an existing past value alone when the user did not change it', () => {
    input.min = todayIsoDate();
    input.value = shiftDays(-10);
    focus();
    blur();

    expect(input.value).toBe(shiftDays(-10));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('accepts today and future dates', () => {
    input.min = todayIsoDate();
    focus();
    input.value = todayIsoDate();
    blur();
    expect(input.value).toBe(todayIsoDate());

    input.value = shiftDays(30);
    blur();
    expect(input.value).toBe(shiftDays(30));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does nothing to a field without a min (e.g. a date of birth)', () => {
    focus();
    input.value = '1990-04-12';
    blur();
    expect(input.value).toBe('1990-04-12');
  });

  it('filters (max = today): puts a typed future date back when the field is left', () => {
    input.max = todayIsoDate();
    focus();
    input.value = shiftDays(4);
    blur();

    expect(input.value).toBe('');
    expect(inputEvents).toBe(1);
    expect(toast.error).toHaveBeenCalledWith(FUTURE_DATE_MESSAGE, expect.any(Object));
  });

  it('filters (max = today): accepts today and past dates', () => {
    input.max = todayIsoDate();
    focus();
    input.value = todayIsoDate();
    blur();
    expect(input.value).toBe(todayIsoDate());

    input.value = shiftDays(-40);
    blur();
    expect(input.value).toBe(shiftDays(-40));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('leaves an existing future value alone when the user did not change it', () => {
    input.max = todayIsoDate();
    input.value = shiftDays(7);
    focus();
    blur();

    expect(input.value).toBe(shiftDays(7));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('enforceRange ignores non-date inputs', () => {
    const text = document.createElement('input');
    text.min = todayIsoDate();
    text.value = '2000-01-01';
    expect(enforceRange(text)).toBe(false);
    expect(text.value).toBe('2000-01-01');
  });

  it('blocks a form submit that contained a corrected past date', () => {
    const form = document.createElement('form');
    form.appendChild(input);
    document.body.appendChild(form);
    input.min = todayIsoDate();
    focus();
    input.value = shiftDays(-1);

    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe('');
    form.remove();
  });
});
