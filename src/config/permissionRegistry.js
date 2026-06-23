// Dynamic Role & Permission registry.
// ------------------------------------
// The sidebar (MENU_ITEMS) is the single source of truth for "what pages exist".
// This module derives the permission module/sub-module tree from it so that:
//   • every sidebar page is guaranteed to appear in the Role & Permission matrix,
//   • a newly added sidebar page automatically becomes grantable (no code change),
//   • existing permission KEYS stay stable (legacy map below) so saved role data
//     and hasPermission() calls keep working.
//
// It is intentionally additive: it never deletes curated/back-end modules — those
// are merged on top (see permissionModules.js), satisfying "removed pages are kept,
// not destroyed".

import { MENU_ITEMS } from './sidebarMenu';

// Full, extendable action set. Every page exposes all of these; add a new action
// here (or via the backend modules response) and it appears everywhere automatically.
export const FULL_ACTIONS = [
  'view', 'add', 'edit', 'delete', 'approve', 'reject',
  'assign', 'export', 'import', 'print', 'download',
];

// snake_case a path segment / id ("department-users" → "department_users").
const snake = (s = '') => String(s).trim().toLowerCase().replace(/[-\s]+/g, '_');

// "Title Case" from a key ("roll_number" → "Roll Number").
const pretty = (s = '') => String(s).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Stable [module, sub] keys for the CURRENT sidebar pages whose key must match
// the existing hasPermission() calls / saved role data. Anything not listed here
// is auto-derived (and so future pages just work).
const LEGACY_KEY_BY_PATH = {
  '/dashboard/applications':          ['candidates', 'job_applications'],
  '/dashboard/roll-numbers':          ['roll_number', 'roll_number_generation'],
  '/dashboard/award-lists':           ['candidates', 'award_lists'],
  '/dashboard/employees/list':        ['employee_management', 'employees'],
  '/dashboard/requisitions':          ['requisitions', 'admin_requisition'],
  '/dashboard/psc-table':             ['requisitions', 'department_requisition'],
  '/dashboard/approved-requisitions': ['requisitions', 'job_pool'],
  '/dashboard/advertisement-records': ['advertisement', 'advertisement'],
  '/dashboard/my-requisitions':       ['myrequisitions', 'requisition_approval'],
  '/dashboard/approval-flow':         ['requisitions', 'admin_requisition'],
  '/dashboard/results':               ['result', 'final_result'],
  '/dashboard/workflow-tracking':     ['requisitions', 'admin_requisition'],
  '/dashboard/settings/roles':        ['roles_permissions', 'roles'],
};

// Friendly group labels for the module tab headers.
const MODULE_LABELS = {
  dashboard: 'Dashboard',
  candidates: 'Candidates',
  employees: 'Employee Management',
  employee_management: 'Employee Management',
  requisitions: 'Requisitions',
  advertisement: 'Advertisement',
  myrequisitions: 'My Requisitions',
  result: 'Result',
  roll_number: 'Roll Number',
  settings: 'Settings',
  roles_permissions: 'Roles & Permissions',
};

// Resolve a sidebar leaf to its [module, sub] permission key.
const resolveKey = (rawPath, parent) => {
  const path = String(rawPath || '').replace(/\/$/, '');
  if (!path) return null;

  if (LEGACY_KEY_BY_PATH[path]) return LEGACY_KEY_BY_PATH[path];

  // Settings sub-pages → settings.<segment> (matches canAccessPath's derivation).
  const settings = path.match(/^\/dashboard\/settings\/([^/]+)/);
  if (settings) return ['settings', snake(settings[1])];

  // Generic: grouped items use the parent menu id as the module; standalone pages
  // use their own last segment as both module and sub.
  const seg = path.split('/').filter(Boolean).pop() || '';
  const moduleKey = parent ? snake(parent.id || parent.label) : snake(seg);
  return [moduleKey, snake(seg)];
};

// Flat list of every sidebar leaf with its resolved permission key + labels.
export const getSidebarEntries = () => {
  const entries = [];
  const add = (path, label, parent) => {
    const key = resolveKey(path, parent);
    if (!key) return;
    const [module, sub] = key;
    entries.push({
      path: String(path).replace(/\/$/, ''),
      module,
      moduleLabel: MODULE_LABELS[module] || pretty(module),
      sub,
      subLabel: label || pretty(sub),
    });
  };

  MENU_ITEMS.forEach((item) => {
    if (Array.isArray(item.submenu)) {
      item.submenu.forEach((s) => add(s.path, s.label, item));
    } else if (item.path) {
      add(item.path, item.label, null);
    }
  });

  return entries;
};

// Build a module tree (matrix shape) covering every sidebar page, full actions.
export const buildSidebarModules = () => {
  const tree = {};
  getSidebarEntries().forEach(({ module, moduleLabel, sub, subLabel }) => {
    if (!tree[module]) tree[module] = { label: moduleLabel, modules: {} };
    if (!tree[module].modules[sub]) {
      tree[module].modules[sub] = { label: subLabel, actions: [...FULL_ACTIONS] };
    }
  });
  return tree;
};

// Idempotent union of any number of module trees. Never drops a module/sub
// (preserves curated + backend + sidebar); unions their action lists; first
// non-empty label wins. Safe to run repeatedly with the same inputs.
export const mergeModuleTrees = (...trees) => {
  const out = {};
  trees.filter(Boolean).forEach((tree) => {
    Object.entries(tree).forEach(([mKey, mVal]) => {
      if (!mVal || typeof mVal !== 'object') return;
      if (!out[mKey]) out[mKey] = { label: mVal.label || pretty(mKey), modules: {} };
      else if (mVal.label && !out[mKey].label) out[mKey].label = mVal.label;

      Object.entries(mVal.modules || {}).forEach(([sKey, sVal]) => {
        const actions = Array.isArray(sVal?.actions) ? sVal.actions : [];
        if (!out[mKey].modules[sKey]) {
          out[mKey].modules[sKey] = { label: sVal?.label || pretty(sKey), actions: [...actions] };
        } else {
          const merged = new Set([...(out[mKey].modules[sKey].actions || []), ...actions]);
          out[mKey].modules[sKey].actions = [...merged];
          if (sVal?.label && !out[mKey].modules[sKey].label) out[mKey].modules[sKey].label = sVal.label;
        }
      });
    });
  });
  return out;
};

// Ensure every sub-module exposes the full action set (chosen behavior:
// "all actions on every page"), while KEEPING any special actions a page already
// has (publish, verify_result, reopen, …). Returns a new tree; input untouched.
export const applyFullActions = (tree = {}) => {
  const out = {};
  Object.entries(tree).forEach(([mKey, mVal]) => {
    out[mKey] = { label: mVal.label, modules: {} };
    Object.entries(mVal.modules || {}).forEach(([sKey, sVal]) => {
      const merged = new Set([...FULL_ACTIONS, ...((sVal && sVal.actions) || [])]);
      out[mKey].modules[sKey] = { label: sVal.label, actions: [...merged] };
    });
  });
  return out;
};

// Route → [module, sub] map for the access guards, derived from the sidebar so
// new pages are automatically guarded with their own permission key.
export const getRoutePermissionMap = () => {
  const map = {};
  getSidebarEntries().forEach(({ path, module, sub }) => { map[path] = [module, sub]; });
  return map;
};
