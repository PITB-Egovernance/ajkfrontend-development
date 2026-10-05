// Posts only one person may hold at a time: the Secretary and the Chairman (the backend
// enforces the same rule). Before the post goes to someone else, the current holder is marked
// Inactive (retired) in the Employees list.

export const SINGLE_POSTS = { secretary: 'Secretary', chairman: 'Chairman' };

const nameOf = (value) => {
  const v = Array.isArray(value) ? value[0] : value;
  return String((v && typeof v === 'object' ? v.name : v) || '').trim().toLowerCase();
};

/** The single post a designation stands for ('secretary' | 'chairman'), or null. */
export const postOfDesignation = (designation) => {
  const name = nameOf(designation);
  return SINGLE_POSTS[name] ? name : null;
};

/**
 * The single post an employee-list record holds, by designation or — for the original system
 * accounts — by account role. `role` is the account type (employee / secretary / chairman / admin).
 */
export const postOf = (user) => {
  if (!user) return null;
  const role = String(user.role || '').trim().toLowerCase();
  const assignedRole = nameOf(user.role_name ?? user.role_permission?.role_name);
  return SINGLE_POSTS[role] ? role : SINGLE_POSTS[assignedRole] ? assignedRole : postOfDesignation(user.designation);
};

/** The active holder of `post` in an employee list, ignoring the record being edited. */
export const findActiveHolder = (users = [], post, exceptHashId = null) =>
  users.find(
    (u) =>
      postOf(u) === post &&
      String(u.status || '').toLowerCase() === 'active' &&
      String(u.hash_id ?? u.id) !== String(exceptHashId)
  ) || null;

/** Shown when the post is assigned while someone else still holds it. */
export const postBlockedMessage = (post, holder) => {
  const label = SINGLE_POSTS[post] || post;
  return `There is already an active ${label} (${holder?.username || holder?.name || 'unnamed account'}). ` +
    `Mark them Inactive (retired) in the Employees list before assigning the ${label} post to someone else.`;
};

/** Shown when a second holder is switched to active. */
export const postActivationMessage = (post, holderName, name) => {
  const label = SINGLE_POSTS[post] || post;
  return `${holderName || 'Another employee'} is currently the active ${label}. Only one ${label} can be active at a time. ` +
    `Make ${holderName || 'them'} Inactive first, then make ${name || 'this employee'} active.`;
};

/** True for the backend's "already an active Secretary/Chairman" validation message. */
export const isPostConflictMessage = (message) => /already an active (Secretary|Chairman)/i.test(String(message || ''));
