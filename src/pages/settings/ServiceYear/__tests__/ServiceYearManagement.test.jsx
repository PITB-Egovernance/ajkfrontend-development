import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceYearManagement from '../ServiceYearManagement';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('utils/permissions', () => ({ hasPermission: () => true }));
jest.mock('services/authService', () => ({ getToken: () => 'test-token' }));
jest.mock('config/baseUrl', () => ({ apiUrl: 'http://api.test/api/v1', apiKey: 'test-key' }));
jest.mock('components/tables/AdvancedFilter', () => () => null);
jest.mock('components/ui/confirmStatus', () => ({ __esModule: true, default: jest.fn(() => Promise.resolve(true)) }));
jest.mock('components/ui/Loader', () => ({ InlineLoader: () => <div>loading</div> }));
jest.mock('react-hot-toast', () => {
  const toast = jest.fn();
  toast.success = jest.fn();
  toast.error = jest.fn();
  return { __esModule: true, default: toast };
});
// The real DataGrid is heavy in jsdom; a plain table is enough to see what each row shows.
jest.mock('components/ui/TooltipDataGrid', () => ({ rows, columns }) => (
  <table>
    <tbody>
      {rows.map((r) => (
        <tr key={r.id} data-testid="row">
          {columns.map((c) => (
            <td key={c.field}>{c.renderCell ? c.renderCell({ value: r[c.field], row: r }) : r[c.field]}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
));

const toast = require('react-hot-toast').default;
const confirmStatus = require('components/ui/confirmStatus').default;

const RECORD = {
  hash_id: 'abc123',
  title: 'Commission established',
  start_date: '1985-07-01',
  remarks: '',
  status: 'active',
  service_years: 41,
  service_duration: { years: 41, months: 2, days: 20, text: '41 years, 2 months and 20 days' },
  as_of: '2026-09-21',
};

const CALC_10Y = {
  start_date: '2016-08-07', as_of: '2026-09-21', years: 10, months: 1, days: 14,
  total_days: 3697, service_years: 10, service_years_decimal: 10.12, text: '10 years, 1 month and 14 days',
};

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

const mockApi = ({ calc = () => json(200, { success: true, data: CALC_10Y }), save = () => json(201, { success: true }) } = {}) => {
  global.fetch = jest.fn((url, opts = {}) => {
    if (url.includes('/service-years/calculate')) return calc(url);
    if (url.includes('/service-years/store') || url.includes('/service-years/update')) return save(url, opts);
    return json(200, { success: true, data: { data: [RECORD], total: 1, status_counts: { active: 1, inactive: 0 } } });
  });
};

const openAddForm = async () => {
  render(<ServiceYearManagement />);
  await screen.findByText('Commission established');
  fireEvent.click(screen.getByRole('button', { name: /add service year/i }));
  return screen.findByLabelText(/^Date/);
};

const pickDate = (input, value) => fireEvent.change(input, { target: { value } });

beforeEach(() => {
  jest.clearAllMocks();
  // CRA resets mock implementations between tests, so the default answer ("yes, confirm") is set here.
  confirmStatus.mockResolvedValue(true);
});

describe('Service Year page', () => {
  it('lists each record with the actual date and the service years calculated by the backend', async () => {
    mockApi();
    render(<ServiceYearManagement />);

    const row = await screen.findByTestId('row');
    expect(within(row).getByText('Commission established')).toBeInTheDocument();
    expect(within(row).getByText('01 Jul 1985')).toBeInTheDocument();
    expect(within(row).getByText('41 years')).toBeInTheDocument();
    expect(within(row).getByText('41 years, 2 months and 20 days')).toBeInTheDocument();
  });

  it('shows the calculated service years as soon as a date is selected', async () => {
    mockApi();
    const dateInput = await openAddForm();

    expect(screen.getByText(/select a date to see the service years/i)).toBeInTheDocument();

    pickDate(dateInput, '2016-08-07');

    await screen.findByText('10');
    expect(screen.getByText('10 years, 1 month and 14 days')).toBeInTheDocument();
    expect(screen.getByText(/3,697 days in total/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/settings/service-years/calculate?date=2016-08-07',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) })
    );
  });

  it('does not ask the backend for a half-typed date', async () => {
    mockApi();
    const dateInput = await openAddForm();

    pickDate(dateInput, '20160');
    await new Promise((r) => setTimeout(r, 400));

    expect(global.fetch.mock.calls.filter(([u]) => u.includes('/calculate'))).toHaveLength(0);
  });

  it('shows the backend message when the date cannot be calculated', async () => {
    mockApi({ calc: () => json(422, { success: false, message: 'Validation failed', errors: { date: ['The date cannot be in the future.'] } }) });
    const dateInput = await openAddForm();

    pickDate(dateInput, '2016-08-07');

    expect(await screen.findByText('The date cannot be in the future.')).toBeInTheDocument();
  });

  it('saves the actual date — never the calculated years', async () => {
    mockApi();
    const dateInput = await openAddForm();

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Founding year' } });
    pickDate(dateInput, '2016-08-07');
    await screen.findByText('10 years, 1 month and 14 days');
    fireEvent.click(screen.getByRole('button', { name: /create service year/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Service year created successfully'));

    const [, opts] = global.fetch.mock.calls.find(([u]) => u.endsWith('/service-years/store'));
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({
      title: 'Founding year',
      start_date: '2016-08-07',
    });
  });

  it('the form has only two fields — Title and Date — with no Status or Remarks', async () => {
    mockApi();
    await openAddForm();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/^Title/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Date/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/status/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/remarks/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(1); // Title; the date input has no textbox role
  });

  it('opens as a popup, not a full page', async () => {
    mockApi();
    await openAddForm();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('editing sends the title and date only, so the status set in the list is kept', async () => {
    mockApi();
    render(<ServiceYearManagement />);
    await screen.findByText('Commission established');

    fireEvent.click(screen.getByRole('button', { name: '' }));
    fireEvent.click(await screen.findByText('Edit'));
    const dateInput = await screen.findByLabelText(/^Date/);
    expect(dateInput).toHaveValue('1985-07-01');

    pickDate(dateInput, '1990-01-01');
    fireEvent.click(screen.getByRole('button', { name: /update service year/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Service year updated successfully'));
    const [url, opts] = global.fetch.mock.calls.find(([u]) => u.includes('/service-years/update/abc123'));
    expect(url).toBe('http://api.test/api/v1/settings/service-years/update/abc123');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ title: 'Commission established', start_date: '1990-01-01' });
  });

  it('will not save without a date', async () => {
    mockApi();
    await openAddForm();

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'No date yet' } });
    fireEvent.click(screen.getByRole('button', { name: /create service year/i }));

    expect(toast.error).toHaveBeenCalledWith('Please select the date');
    expect(global.fetch.mock.calls.some(([u]) => u.endsWith('/service-years/store'))).toBe(false);
  });

  it('will not save without a title', async () => {
    mockApi();
    const dateInput = await openAddForm();

    pickDate(dateInput, '2016-08-07');
    fireEvent.click(screen.getByRole('button', { name: /create service year/i }));

    expect(toast.error).toHaveBeenCalledWith('Title is required');
  });

  it('does not accept a date in the future in the picker', async () => {
    mockApi();
    const dateInput = await openAddForm();

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(dateInput.getAttribute('max')).toBe(today);
    expect(dateInput.getAttribute('min')).toBe('1900-01-01');
  });
});

describe('service year message is not repeated', () => {
  const WHOLE_YEARS = {
    start_date: '1969-09-21', as_of: '2026-09-21', years: 57, months: 0, days: 0,
    total_days: 20819, service_years: 57, service_years_decimal: 57, text: '57 years',
  };

  it('a whole-year result shows "57 years of service" once, with the full split at the bottom', async () => {
    mockApi({ calc: () => json(200, { success: true, data: WHOLE_YEARS }) });
    const dateInput = await openAddForm();
    pickDate(dateInput, '1969-09-21');

    await screen.findByText('57');
    expect(screen.getByText((_, el) => el.tagName === 'SPAN' && el.textContent === 'years of service')).toBeInTheDocument();
    expect(screen.getByText('57 years, 0 months and 0 days')).toBeInTheDocument();
    expect(screen.getByText(/From 21 Sep\w* 1969 · 20,819 days in total/)).toBeInTheDocument();

    // "57 years" as a whole message must not appear (that was the repeat), nor the decimal figure
    expect(screen.queryByText('57 years')).not.toBeInTheDocument();
    expect(screen.queryByText(/· 57 years/)).not.toBeInTheDocument();
  });

  it('uses singular words: 1 year, 1 month and 1 day', async () => {
    mockApi({ calc: () => json(200, { success: true, data: { ...WHOLE_YEARS, years: 1, months: 1, days: 1, service_years: 1, total_days: 396 } }) });
    const dateInput = await openAddForm();
    pickDate(dateInput, '2025-08-20');

    expect(await screen.findByText('1 year, 1 month and 1 day')).toBeInTheDocument();
    expect(screen.getByText(/year of service/i)).toBeInTheDocument();
  });

  it('the list shows the years once in bold and the full split underneath', async () => {
    mockApi();
    render(<ServiceYearManagement />);
    const row = await screen.findByTestId('row');

    expect(within(row).getByText('41 years')).toBeInTheDocument();
    expect(within(row).getByText('41 years, 2 months and 20 days')).toBeInTheDocument();
  });

  it('the list shows zero months and days too for a whole-year record', async () => {
    global.fetch = jest.fn(() => json(200, { success: true, data: {
      data: [{ ...RECORD, start_date: '1969-09-21', service_years: 57, service_duration: { years: 57, months: 0, days: 0, text: '57 years' } }],
      total: 1, status_counts: { active: 1, inactive: 0 },
    } }));
    render(<ServiceYearManagement />);
    const row = await screen.findByTestId('row');

    expect(within(row).getByText('57 years')).toBeInTheDocument();
    expect(within(row).getByText('57 years, 0 months and 0 days')).toBeInTheDocument();
  });
});

describe('Status — active by default, switched with the toggle in the list', () => {
  it('shows an Active toggle for an active record, and an Inactive one for an inactive record', async () => {
    mockApi();
    render(<ServiceYearManagement />);
    const toggle = await screen.findByRole('checkbox', { name: /toggle service year status/i });
    expect(toggle).toBeChecked();
  });

  it('switching the toggle off asks for confirmation, then saves status "inactive" only', async () => {
    mockApi();
    render(<ServiceYearManagement />);
    const toggle = await screen.findByRole('checkbox', { name: /toggle service year status/i });

    fireEvent.click(toggle);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Marked as inactive'));
    expect(confirmStatus).toHaveBeenCalledWith({ newStatus: 'inactive' });
    const [url, opts] = global.fetch.mock.calls.find(([u]) => u.includes('/service-years/update/abc123'));
    expect(url).toBe('http://api.test/api/v1/settings/service-years/update/abc123');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ status: 'inactive' });
  });

  it('switching an inactive record back on saves status "active"', async () => {
    global.fetch = jest.fn((url) =>
      url.includes('/service-years/update')
        ? json(200, { success: true })
        : json(200, { success: true, data: { data: [{ ...RECORD, status: 'inactive' }], total: 1, status_counts: { active: 0, inactive: 1 } } })
    );
    render(<ServiceYearManagement />);
    const toggle = await screen.findByRole('checkbox', { name: /toggle service year status/i });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Marked as active'));
    const [, opts] = global.fetch.mock.calls.find(([u]) => u.includes('/service-years/update/abc123'));
    expect(JSON.parse(opts.body)).toEqual({ status: 'active' });
  });

  it('leaves the status alone when the confirmation is cancelled', async () => {
    confirmStatus.mockResolvedValueOnce(false);
    mockApi();
    render(<ServiceYearManagement />);

    fireEvent.click(await screen.findByRole('checkbox', { name: /toggle service year status/i }));
    await new Promise((r) => setTimeout(r, 100));

    expect(global.fetch.mock.calls.some(([u]) => u.includes('/service-years/update'))).toBe(false);
  });

  it('a new record is created without a status, so the backend default (active) applies', async () => {
    mockApi();
    const dateInput = await openAddForm();
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'New one' } });
    pickDate(dateInput, '2016-08-07');
    fireEvent.click(screen.getByRole('button', { name: /create service year/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Service year created successfully'));
    const [, opts] = global.fetch.mock.calls.find(([u]) => u.endsWith('/service-years/store'));
    expect(JSON.parse(opts.body)).not.toHaveProperty('status');
  });
});
