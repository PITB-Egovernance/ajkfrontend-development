import EmployeeService from './EmployeeService';

jest.mock('../config/baseUrl', () => ({ apiUrl: 'http://localhost/api/v1' }));
jest.mock('../utils/apiUtils', () => ({ authHeaders: () => ({}) }));

afterEach(() => { jest.restoreAllMocks(); });

test('edit fetches one employee directly instead of downloading the employee list', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { hash_id: 'abc', username: 'Employee' } }) });
  expect(await EmployeeService.getUserDetails('abc')).toEqual({ hash_id: 'abc', username: 'Employee' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('http://localhost/api/v1/users/abc');
});

test('form options are retrieved together', async () => {
  const options = { districts: [], designations: [], wings: [], roles: [], holders: [] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: options }) });
  expect(await EmployeeService.getFormOptions()).toEqual(options);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('http://localhost/api/v1/employee/form-options');
});

test('a failed form-options request is reported instead of opening an empty form', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Unavailable' }) });
  await expect(EmployeeService.getFormOptions()).rejects.toThrow('Unavailable');
});
