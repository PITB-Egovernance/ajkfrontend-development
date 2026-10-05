import { render, screen, act, fireEvent } from '@testing-library/react';
import EmployeeRegistrationForm from './EmployeeRegistrationForm';
import EmployeeService from 'services/EmployeeService';

jest.mock('services/EmployeeService');
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useParams: () => ({}) }), { virtual: true });
jest.mock('components/permissions/PermissionMatrix', () => () => null);
jest.mock('components/ui/SearchableSelect', () => ({ label, value, onChange, options, error }) => (
  <div data-testid={`field-${label}`}>
    <select aria-label={label} value={value} onChange={onChange}>
      <option value="">Select</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {error && <p role="alert">{error}</p>}
  </div>
));
jest.mock('components/ui/Loader', () => ({ InlineLoader: ({ text }) => <div role="status">{text}</div> }));

const options = { districts: [], designations: [], wings: [], roles: [], holders: [] };
const show = (props = {}) => render(<EmployeeRegistrationForm {...props} />);
beforeEach(() => jest.clearAllMocks());

test('create shows a loader until its combined options are ready', async () => {
  let finish;
  EmployeeService.getFormOptions.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  show();
  expect(screen.getByRole('status')).toHaveTextContent('Loading employee form options');
  expect(screen.queryByLabelText(/Username/)).not.toBeInTheDocument();
  await act(async () => finish(options));
  expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
  expect(EmployeeService.getUserDetails).not.toHaveBeenCalled();
});

test('edit waits for details and then shows the prefilled employee', async () => {
  let finish;
  EmployeeService.getFormOptions.mockResolvedValue(options);
  EmployeeService.getUserDetails.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  show({ mode: 'edit', employeeHashId: 'DNQaWdMoX1py' });
  expect(screen.getByRole('status')).toHaveTextContent('Loading employee details');
  await act(async () => finish({ username: 'Existing employee' }));
  expect(screen.getByLabelText(/Username/)).toHaveValue('Existing employee');
  expect(EmployeeService.getUserDetails).toHaveBeenCalledWith('DNQaWdMoX1py');
});

test('failed initialization can be retried', async () => {
  EmployeeService.getFormOptions.mockRejectedValueOnce(new Error('Options unavailable')).mockResolvedValue(options);
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Options unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }));
  expect(await screen.findByLabelText(/Username/)).toBeInTheDocument();
});

test.each(['create', 'edit'])('%s puts an assigned-role conflict under Role and disables saving until resolved', async (mode) => {
  EmployeeService.getFormOptions.mockResolvedValue({
    ...options,
    designations: [{ hash_id: 'director', name: 'Director' }],
    roles: [{ hash_id: 'chairman', role_name: 'Chairman' }, { hash_id: 'it', role_name: 'IT' }],
    holders: [{ hash_id: 'current', username: 'awais', role: 'chairman', status: 'active' }],
  });
  EmployeeService.getUserDetails.mockResolvedValue({ username: 'Other employee', role: 'employee', designation: { hash_id: 'director', name: 'Director' }, role_hash_id: 'it', role_name: 'IT' });
  show(mode === 'edit' ? { mode, employeeHashId: 'other' } : {});
  await screen.findByLabelText(/Username/);
  fireEvent.click(screen.getByRole('button', { name: 'Roles' }));
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'chairman' } });
  expect(screen.getByTestId('field-Role')).toHaveTextContent('There is already an active Chairman (awais)');
  expect(screen.getByTestId('field-Designation')).not.toHaveTextContent('There is already an active');
  const save = screen.getByRole('button', { name: mode === 'edit' ? /Update/ : /Register/ });
  expect(save).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'it' } });
  expect(save).toBeEnabled();
  expect(screen.queryByText(/There is already an active Chairman/)).not.toBeInTheDocument();
});
