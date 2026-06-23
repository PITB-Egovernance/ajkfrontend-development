import AuthService from 'services/authService';
import { getRoutePermissionMap } from 'config/permissionRegistry';

// Reads the authenticated user (with role + permissions) from storage.
const getAuthUser = () => {
  try {
    return AuthService.getUser ? AuthService.getUser() : JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

// Role names that always get full access.
const SUPER_ADMIN_NAMES = [
  'admin', 'administrator', 'super admin', 'super_admin', 'root', 'root / super admin',
];

// Locates the permissions object regardless of how the backend nests it.
const getUserPermissions = (user) =>
  user?.permissions ||
  user?.role_permission?.permissions ||
  user?.role?.permissions ||
  {};

/**
 * True if the user is an admin / super admin (full access, no restrictions).
 */
export const isAdminUser = (user) => {
  const u = user ?? getAuthUser();
  if (!u) return false;
  if (u.is_super_admin || u.role?.is_super_admin || u.role_permission?.is_super_admin) return true;
  const roleName = String(
    u.role_permission?.role_name || u.role_name || (typeof u.role === 'string' ? u.role : '') || ''
  ).trim().toLowerCase();
  return SUPER_ADMIN_NAMES.includes(roleName);
};

/**
 * Check if the authenticated user has a specific permission.
 * @param {string} permissionKey - "module.sub_module.action" (e.g. "settings.city.add")
 * @returns {boolean}
 */
export const hasPermission = (permissionKey) => {
  const user = getAuthUser();
  if (isAdminUser(user)) return true;

  const permissions = getUserPermissions(user);
  const parts = String(permissionKey).split('.');
  if (parts.length !== 3) return false;

  const [module, subModule, action] = parts;
  return permissions?.[module]?.[subModule]?.[action] === true;
};

/**
 * Check if any sub-module within a main module has view permission.
 * Used for sidebar visibility / module-level access.
 * @param {string} moduleKey
 * @returns {boolean}
 */
export const hasModuleAccess = (moduleKey) => {
  const user = getAuthUser();
  if (isAdminUser(user)) return true;

  const modulePermissions = getUserPermissions(user)[moduleKey] || {};
  return Object.values(modulePermissions).some(
    (subModule) => subModule && Object.values(subModule).some((v) => v === true)
  );
};

/**
 * True if the user has access to ANY of the given module keys.
 */
export const hasAnyModuleAccess = (moduleKeys = []) => {
  const user = getAuthUser();
  if (isAdminUser(user)) return true;
  return moduleKeys.some((m) => hasModuleAccess(m));
};

/**
 * True if any action is granted on a specific sub-module (e.g. "settings", "districts").
 * Used to show/hide individual sub-tabs.
 */
export const hasSubModuleAccess = (moduleKey, subKey) => {
  const user = getAuthUser();
  if (isAdminUser(user)) return true;
  const actions = getUserPermissions(user)?.[moduleKey]?.[subKey] || {};
  return Object.values(actions).some((v) => v === true);
};

// Returns the list of granted actions for a sub-module (e.g. ['add','view']).
export const getAllowedActions = (moduleKey, subKey) => {
  const user = getAuthUser();
  const actions = getUserPermissions(user)?.[moduleKey]?.[subKey] || {};
  if (isAdminUser(user)) return Object.keys(actions);
  return Object.entries(actions).filter(([, v]) => v === true).map(([k]) => k);
};

// Exact sub-tab leaf paths → [module, subModule]. Mirrors the Settings technique:
// the main sidebar tab/sub-tab is gated at sub-module level, while deeper
// create/edit/detail routes fall back to the module-level prefix rules below.
// Derived from the sidebar (so a newly added page is auto-guarded by its own
// permission key), with the manual entries layered on top as authoritative
// overrides. Current pages keep their existing keys because the registry uses
// the same legacy map.
const ROUTE_SUBMODULE_EXACT = {
  ...getRoutePermissionMap(),
  '/dashboard/applications':          ['candidates', 'job_applications'],
  '/dashboard/roll-numbers':          ['roll_number', 'roll_number_generation'],
  '/dashboard/award-lists':           ['candidates', 'award_lists'],
  '/dashboard/employees/list':        ['employee_management', 'employees'],
  '/dashboard/requisitions':          ['requisitions', 'admin_requisition'],
  '/dashboard/psc-table':             ['requisitions', 'department_requisition'],
  '/dashboard/approved-requisitions': ['requisitions', 'job_pool'],
  '/dashboard/advertisement-records': ['advertisement', 'advertisement'],
};

// Module(s) required for each route prefix (non-settings). Longest prefix wins.
const ROUTE_MODULE_PREFIXES = [
  ['/dashboard/psc-table',               ['requisitions']],
  ['/dashboard/approved-requisitions',   ['requisitions']],
  ['/dashboard/requisitions',            ['requisitions', 'advertisement']],
  ['/dashboard/advertisement',           ['advertisement']],
  ['/dashboard/approval-flow',           ['requisitions']],
  ['/dashboard/results',                 ['result']],
  ['/dashboard/workflow-tracking',       ['requisitions', 'result']],
  ['/dashboard/employees',               ['employee_management']],
  ['/dashboard/applications',            ['candidates', 'roll_number']],
  ['/dashboard/roll-numbers',            ['roll_number']],
  ['/dashboard/award-lists',             ['candidates']],
];

/**
 * Central route-level access check. Admin → always. Unmapped paths → allowed.
 */
export const canAccessPath = (pathname = '') => {
  const user = getAuthUser();
  if (!user) return true;            // not loaded yet — don't block
  if (isAdminUser(user)) return true;

  // Dashboard root is the neutral landing page — always accessible.
  if (pathname === '/dashboard' || pathname === '/dashboard/') return true;

  // Settings sub-pages: /dashboard/settings/<segment>
  const settingsMatch = pathname.match(/^\/dashboard\/settings\/([^/]+)/);
  if (settingsMatch) {
    const seg = settingsMatch[1];
    if (seg === 'roles') return hasSubModuleAccess('roles_permissions', 'roles');
    return hasSubModuleAccess('settings', seg.replace(/-/g, '_'));
  }
  // Settings landing page
  if (pathname === '/dashboard/settings' || pathname === '/dashboard/settings/') {
    return hasAnyModuleAccess(['settings', 'roles_permissions']);
  }

  // Exact sub-tab leaf → sub-module level check (same technique as settings sub-pages).
  const exact = ROUTE_SUBMODULE_EXACT[pathname.replace(/\/$/, '')];
  if (exact) return hasSubModuleAccess(exact[0], exact[1]);

  // Other modules by path prefix (longest match first).
  const rule = [...ROUTE_MODULE_PREFIXES]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix));
  if (rule) return hasAnyModuleAccess(rule[1]);

  return true; // dashboard root and unmapped routes are allowed
};
