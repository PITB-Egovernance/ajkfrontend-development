import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import alertDialog from 'components/ui/alertDialog';
import {
  postOf, findActiveHolder, postActivationMessage, postBlockedMessage, isPostConflictMessage,
} from 'utils/singlePosts';

describe('one active Secretary and one active Chairman', () => {
  const users = [
    { hash_id: 'a', username: 'Secretary', role: 'secretary', designation: { name: 'Secretary' }, status: 'inactive' },
    { hash_id: 'b', username: 'Ismail Ahmad', role: 'employee', designation: { name: 'Secretary' }, status: 'active' },
    { hash_id: 'c', username: 'Chair', role: 'employee', designation: { name: 'Chairman' }, status: 'active' },
    { hash_id: 'd', username: 'awais', role: 'employee', designation: { name: 'Director' }, status: 'active' },
    { hash_id: 'e', username: 'Admin', role: 'admin', designation: null, status: 'active' },
  ];

  it('recognises the post by designation or by the system account', () => {
    expect(users.map(postOf)).toEqual(['secretary', 'secretary', 'chairman', null, null]);
  });

  it('finds the active holder of each post, ignoring the record being edited', () => {
    expect(findActiveHolder(users, 'secretary', 'a')?.username).toBe('Ismail Ahmad');
    expect(findActiveHolder(users, 'secretary', 'b')).toBeNull();
    expect(findActiveHolder(users, 'chairman')?.username).toBe('Chair');
  });

  it.each(['chairman', 'secretary'])('protects an employee assigned the %s role with a different designation', (role) => {
    const holder = { hash_id: 'assigned', role: 'employee', role_name: role, designation: { name: 'Director' }, status: 'active' };
    expect(postOf(holder)).toBe(role);
    expect(findActiveHolder([holder], role)).toBe(holder);
    expect(findActiveHolder([holder], role, 'assigned')).toBeNull();
    expect(findActiveHolder([{ ...holder, status: 'inactive' }], role)).toBeNull();
    expect(postOf({ ...holder, status: 'inactive' })).toBe(role);
  });

  it('tells the admin who must be made inactive first', () => {
    expect(postActivationMessage('chairman', 'Chair', 'New')).toMatch(/Chair is currently the active Chairman.*Make Chair Inactive first, then make New active/);
    expect(isPostConflictMessage(postBlockedMessage('secretary', users[1]))).toBe(true);
  });

  it('shows the alert and resolves when OK is clicked', async () => {
    const done = alertDialog({ title: 'Another Chairman is active', message: 'Make X Inactive first' });
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Make X Inactive first');
    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    await done;
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
