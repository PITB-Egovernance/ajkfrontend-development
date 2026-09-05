import React from 'react';

// Maps a resumable-batch `status` value to a small color-coded pill —
// see RollNumberGenerationBatch::recalculateProgress() on the backend for
// the exact set of status strings this batch model can be in.
const STATUS_STYLES = {
  created:                       { label: 'Created',              className: 'bg-slate-100 text-slate-700' },
  roll_numbers_generating:       { label: 'Generating Roll Numbers', className: 'bg-amber-100 text-amber-800' },
  center_allocation_pending:     { label: 'Pending Allocation',    className: 'bg-amber-100 text-amber-800' },
  center_allocation_in_progress: { label: 'Allocating Centers',    className: 'bg-amber-100 text-amber-800' },
  center_allocation_partial:     { label: 'Pending',               className: 'bg-amber-100 text-amber-800' },
  ready_for_slip_generation:     { label: 'Complete',              className: 'bg-emerald-100 text-emerald-800' },
  slips_generating:              { label: 'Generating Slips',      className: 'bg-amber-100 text-amber-800' },
  completed:                     { label: 'Completed',             className: 'bg-emerald-100 text-emerald-800' },
  failed:                        { label: 'Failed',                className: 'bg-red-100 text-red-800' },
};

const RollNumberStatusBadge = ({ status, className = '' }) => {
  const style = STATUS_STYLES[status] || { label: status || 'Unknown', className: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style.className} ${className}`}>
      {style.label}
    </span>
  );
};

export default RollNumberStatusBadge;
