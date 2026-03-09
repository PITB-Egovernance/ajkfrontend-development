import React from 'react';

const COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  completed: 'bg-slate-100 text-slate-700',
  director: 'bg-indigo-100 text-indigo-800',
  secretary: 'bg-cyan-100 text-cyan-800',
  chairman: 'bg-violet-100 text-violet-800',
};

const prettify = (value) => {
  if (!value) return 'N/A';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const StatusBadge = ({ value }) => {
  const key = String(value || '').toLowerCase();
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${COLORS[key] || 'bg-slate-100 text-slate-700'}`}>
      {prettify(value)}
    </span>
  );
};

export default StatusBadge;
