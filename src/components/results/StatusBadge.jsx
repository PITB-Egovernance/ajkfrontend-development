import React from 'react';

/**
 * StatusBadge Component
 * Renders a stylized pill for result-specific statuses
 * 
 * @param {Object} props
 * @param {string} props.status - The status text to display
 */

const STATUS_COLORS = {
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-700',
  absent: 'bg-slate-100 text-slate-600',
  withheld: 'bg-amber-100 text-amber-700',
  selected: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  provisional: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-800 border border-green-200',
  withdrawn: 'bg-red-100 text-red-800 border border-red-200',
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  
  const normalizedStatus = status.toLowerCase();
  const colorClass = STATUS_COLORS[normalizedStatus] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase inline-block ${colorClass}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
