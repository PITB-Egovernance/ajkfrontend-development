import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { installRecordInUseNotice } from 'utils/recordInUseNotice';

// Minimal fetch Response (jsdom has none): status, json() and clone().
const jsonResponse = (status, body) => {
  const res = { status, json: async () => body };
  res.clone = () => ({ ...res });
  return res;
};

describe('record in use notice', () => {
  const realError = toast.error;
  let errorSpy;
  const mockFetch = jest.fn();

  beforeAll(() => {
    window.fetch = mockFetch;
    errorSpy = jest.fn();
    toast.error = errorSpy; // installRecordInUseNotice wraps whatever toast.error is
    installRecordInUseNotice();
  });

  afterAll(() => { toast.error = realError; });

  it('explains a refused delete in an alert and skips the duplicate toast', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(409, {
      success: false,
      message: 'This Grade (BS-12) is used by 8 requisitions, so it cannot be deleted.',
      errors: { code: 'RECORD_IN_USE', used_in: [{ label: 'requisition', count: 8 }] },
    }));

    const res = await window.fetch('/api/v1/settings/grades/x/delete', { method: 'DELETE' });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ errors: { code: 'RECORD_IN_USE' } }); // body still readable

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('used by 8 requisitions');
    toast.error('Failed to delete grade');
    expect(errorSpy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('leaves other errors alone', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(409, { success: false, message: 'Other conflict', errors: { code: 'OTHER' } }));

    await window.fetch('/api/x');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
