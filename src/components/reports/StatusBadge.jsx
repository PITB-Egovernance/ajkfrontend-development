import React from 'react';

// Reusable status pill for report tables that need more than a binary
// pass/fail state (import discrepancy status, merit status, etc.). Pass a
// custom `styleMap` to override/extend the default color mapping.
const DEFAULT_STATUS_STYLES = {
  match: 'bg-emerald-100 text-emerald-700',
  recommended: 'bg-emerald-100 text-emerald-700',
  verified: 'bg-emerald-100 text-emerald-700',
  shortlisted: 'bg-emerald-100 text-emerald-700',
  selected: 'bg-emerald-100 text-emerald-700',
  modified: 'bg-amber-100 text-amber-700',
  waitlisted: 'bg-amber-100 text-amber-700',
  'pending verification': 'bg-amber-100 text-amber-700',
  'documents submitted': 'bg-blue-100 text-blue-700',
  missing: 'bg-rose-100 text-rose-700',
  'not recommended': 'bg-rose-100 text-rose-700',
  rejected: 'bg-rose-100 text-rose-700',
  'finally rejected': 'bg-rose-100 text-rose-700',
  'not selected': 'bg-rose-100 text-rose-700',
  duplicate: 'bg-violet-100 text-violet-700',
};

const StatusBadge = ({ status, styleMap = DEFAULT_STATUS_STYLES }) => {
  const key = String(status).trim().toLowerCase();
  const className = styleMap[key] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
