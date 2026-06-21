// Roles & Permissions — module / sub-module / action structure.
// This MIRRORS the backend `GET /settings/permissions/modules` response and the
// `permissions` payload accepted by `POST/PUT /settings/roles`.
// It is used as a fallback when the live modules endpoint is unavailable; at
// runtime the form fetches the canonical structure from the backend.

export const PERMISSION_MODULES = {
  settings: {
    label: 'Settings',
    modules: {
      city:     { label: 'City',     actions: ['add', 'edit', 'delete', 'view'] },
      district: { label: 'District', actions: ['add', 'edit', 'delete', 'view'] },
    },
  },
  requisitions: {
    label: 'Requisitions',
    modules: {
      department_requisition: { label: 'Department Requisition', actions: ['add', 'edit', 'delete', 'view'] },
      admin_requisition:      { label: 'Admin Requisition',      actions: ['add', 'edit', 'delete', 'view'] },
      job_pool:               { label: 'Job Pool',               actions: ['add', 'edit', 'delete', 'view'] },
    },
  },
  advertisement: {
    label: 'Advertisement',
    modules: {
      advertisement: { label: 'Advertisement', actions: ['add', 'edit', 'delete', 'view', 'job_pool', 'reopen', 'temporary_closed', 'permanent_closed'] },
      result:        { label: 'Result',        actions: ['add', 'edit', 'delete', 'view'] },
      archive:       { label: 'Archive',       actions: ['add', 'edit', 'delete', 'view'] },
    },
  },
  result: {
    label: 'Result',
    modules: {
      mcq_result:          { label: 'MCQ Result',          actions: ['add', 'edit', 'delete', 'view', 'verify_result'] },
      written_result:      { label: 'Written Result',      actions: ['add', 'edit', 'delete', 'view', 'verify_result'] },
      final_result:        { label: 'Final Result',        actions: ['add', 'edit', 'delete', 'view', 'verify_result'] },
      result_verification: { label: 'Result Verification', actions: ['add', 'edit', 'delete', 'view', 'verify_result'] },
      result_publishing:   { label: 'Result Publishing',   actions: ['add', 'edit', 'delete', 'view', 'verify_result'] },
    },
  },
  review_appeal: {
    label: 'Review / Appeal',
    modules: {
      appeal_requests:     { label: 'Appeal Requests',     actions: ['add', 'edit', 'delete', 'view', 'approve', 'reject'] },
      review_applications: { label: 'Review Applications', actions: ['add', 'edit', 'delete', 'view', 'approve', 'reject'] },
      appeal_decision:     { label: 'Appeal Decision',     actions: ['add', 'edit', 'delete', 'view', 'approve', 'reject'] },
    },
  },
  document_management: {
    label: 'Document Management System',
    modules: {
      documents:             { label: 'Documents',             actions: ['add', 'edit', 'delete', 'view', 'verify'] },
      document_categories:   { label: 'Document Categories',   actions: ['add', 'edit', 'delete', 'view', 'verify'] },
      document_verification: { label: 'Document Verification', actions: ['add', 'edit', 'delete', 'view', 'verify'] },
    },
  },
  interview: {
    label: 'Interview',
    modules: {
      interview_schedule: { label: 'Interview Schedule', actions: ['add', 'edit', 'delete', 'view', 'verify_approve'] },
      interview_panel:    { label: 'Interview Panel',    actions: ['add', 'edit', 'delete', 'view', 'verify_approve'] },
      interview_marks:    { label: 'Interview Marks',    actions: ['add', 'edit', 'delete', 'view', 'verify_approve'] },
      interview_result:   { label: 'Interview Result',   actions: ['add', 'edit', 'delete', 'view', 'verify_approve'] },
    },
  },
  news: {
    label: 'News',
    modules: {
      news:          { label: 'News',          actions: ['add', 'edit', 'delete', 'view', 'publish'] },
      announcements: { label: 'Announcements', actions: ['add', 'edit', 'delete', 'view', 'publish'] },
      notifications: { label: 'Notifications', actions: ['add', 'edit', 'delete', 'view', 'publish'] },
    },
  },
  roll_number: {
    label: 'Roll Number',
    modules: {
      roll_number_generation: { label: 'Roll Number Generation', actions: ['add', 'edit', 'delete', 'view', 'generate', 'publish'] },
      roll_number_slip:       { label: 'Roll Number Slip',       actions: ['add', 'edit', 'delete', 'view', 'generate', 'publish'] },
      exam_center:            { label: 'Exam Center',            actions: ['add', 'edit', 'delete', 'view', 'generate', 'publish'] },
      exam_hall:              { label: 'Exam Hall',              actions: ['add', 'edit', 'delete', 'view', 'generate', 'publish'] },
    },
  },
  employee_management: {
    label: 'Employee Management',
    modules: {
      employees:      { label: 'Employees',      actions: ['add', 'edit', 'delete', 'view', 'assign_role'] },
      designations:   { label: 'Designations',   actions: ['add', 'edit', 'delete', 'view', 'assign_role'] },
      employee_roles: { label: 'Employee Roles', actions: ['add', 'edit', 'delete', 'view', 'assign_role'] },
    },
  },
  roles_permissions: {
    label: 'Roles & Permissions',
    modules: {
      roles:       { label: 'Roles',       actions: ['add', 'edit', 'delete', 'view', 'assign_permission'] },
      permissions: { label: 'Permissions', actions: ['add', 'edit', 'delete', 'view', 'assign_permission'] },
    },
  },
};

// Human-readable labels for action slugs (column headers / chips).
export const ACTION_LABELS = {
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  view: 'View',
  active: 'Active',
  job_pool: 'Job Pool',
  reopen: 'Reopen',
  temporary_closed: 'Temporary Closed',
  permanent_closed: 'Permanently Closed',
  extend_date: 'Extend Date',
  verify_result: 'Verify',
  approve: 'Approve',
  reject: 'Reject',
  verify: 'Verify',
  verify_approve: 'Verify / Approve',
  publish: 'Publish',
  generate: 'Generate',
  assign_role: 'Assign Role',
  assign_permission: 'Assign Permission',
};

// snake_case / kebab-case → "Title Case" (for labels the backend doesn't send).
export const prettyLabel = (key = '') =>
  String(key).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Normalises whatever `GET /settings/permissions/modules` returns into the
// internal shape: { moduleKey: { label, modules: { subKey: { label, actions: [] } } } }.
// Tolerates several likely backend shapes; returns null if it can't make sense of it.
export const normalizeModules = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};

  Object.entries(raw).forEach(([moduleKey, moduleVal]) => {
    if (!moduleVal || typeof moduleVal !== 'object') return;

    // A module is either { label, modules: {...} } or a bare map of sub-modules.
    const hasWrapper = moduleVal.modules && typeof moduleVal.modules === 'object';
    const label = moduleVal.label || prettyLabel(moduleKey);
    const subs = hasWrapper ? moduleVal.modules : moduleVal;

    const normSubs = {};
    Object.entries(subs).forEach(([subKey, subVal]) => {
      if (subKey === 'label' || subKey === 'modules') return;
      let actions = null;
      let subLabel = prettyLabel(subKey);

      if (Array.isArray(subVal)) {
        actions = subVal;
      } else if (subVal && typeof subVal === 'object') {
        subLabel = subVal.label || subLabel;
        if (Array.isArray(subVal.actions)) {
          actions = subVal.actions;
        } else {
          // Map of action -> boolean/label; keys are the actions.
          actions = Object.keys(subVal).filter((k) => k !== 'label');
        }
      }

      if (Array.isArray(actions) && actions.length) {
        normSubs[subKey] = { label: subLabel, actions };
      }
    });

    if (Object.keys(normSubs).length) {
      out[moduleKey] = { label, modules: normSubs };
    }
  });

  return Object.keys(out).length ? out : null;
};

// Builds an empty permissions object (all actions = false) for a given module map.
export const buildEmptyPermissionsFrom = (modules = PERMISSION_MODULES) => {
  const perms = {};
  Object.entries(modules).forEach(([moduleKey, module]) => {
    perms[moduleKey] = {};
    Object.entries(module.modules).forEach(([subKey, sub]) => {
      perms[moduleKey][subKey] = {};
      sub.actions.forEach((action) => { perms[moduleKey][subKey][action] = false; });
    });
  });
  return perms;
};

// Builds an empty permissions object from the default (fallback) structure.
export const buildEmptyPermissions = () => buildEmptyPermissionsFrom(PERMISSION_MODULES);

// Counts the number of `true` permissions in a permissions object.
export const countPermissions = (permissions = {}) => {
  let count = 0;
  Object.values(permissions || {}).forEach((subModules) => {
    Object.values(subModules || {}).forEach((actions) => {
      Object.values(actions || {}).forEach((val) => { if (val === true) count++; });
    });
  });
  return count;
};
