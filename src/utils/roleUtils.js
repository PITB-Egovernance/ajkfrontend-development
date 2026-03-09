const ROLE_ALIASES = {
  admin: 'admin',
  administrator: 'admin',
  superadmin: 'admin',
  director: 'director',
  director_recruitment: 'director',
  secretary: 'secretary',
  chairman: 'chairman',
};

export const normalizeRole = (rawRole) => {
  if (!rawRole || typeof rawRole !== 'string') return null;
  const key = rawRole.trim().toLowerCase().replace(/\s+/g, '_');
  return ROLE_ALIASES[key] || key;
};

export const getUserRole = (user) => {
  if (!user || typeof user !== 'object') return null;

  return (
    normalizeRole(user.role) ||
    normalizeRole(user.role_name) ||
    normalizeRole(user.user_role) ||
    normalizeRole(user.designation) ||
    null
  );
};

export const hasAnyRole = (userRole, allowedRoles = []) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!userRole) return false;

  const normalizedAllowed = allowedRoles.map((role) => normalizeRole(role));
  return normalizedAllowed.includes(normalizeRole(userRole));
};

export const getDefaultDashboardPath = (userRole) => {
  const role = normalizeRole(userRole);

  if (!role) return '/dashboard';
  if (role === 'director') return '/dashboard/approvals/director';
  if (role === 'secretary') return '/dashboard/approvals/secretary';
  if (role === 'chairman') return '/dashboard/approvals/chairman';
  if (role === 'admin') return '/dashboard/workflow-tracking';
  return '/dashboard';
};
