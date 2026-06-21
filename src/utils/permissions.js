import AuthService from 'services/authService';

// Reads the authenticated user (with role + permissions) from storage.
const getAuthUser = () => {
  try {
    return AuthService.getUser ? AuthService.getUser() : JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

/**
 * Check if the authenticated user has a specific permission.
 * @param {string} permissionKey - "module.sub_module.action" (e.g. "settings.city.add")
 * @returns {boolean}
 */
export const hasPermission = (permissionKey) => {
  const user = getAuthUser();
  if (user?.role?.is_super_admin || user?.is_super_admin) return true;

  const permissions = user?.permissions || user?.role?.permissions || {};
  const parts = String(permissionKey).split('.');
  if (parts.length !== 3) return false;

  const [module, subModule, action] = parts;
  return permissions?.[module]?.[subModule]?.[action] === true;
};

/**
 * Check if any sub-module within a main module has view permission.
 * Used for sidebar visibility.
 * @param {string} moduleKey
 * @returns {boolean}
 */
export const hasModuleAccess = (moduleKey) => {
  const user = getAuthUser();
  if (user?.role?.is_super_admin || user?.is_super_admin) return true;

  const modulePermissions = (user?.permissions || user?.role?.permissions || {})[moduleKey] || {};
  return Object.values(modulePermissions).some((subModule) => subModule?.view === true);
};
