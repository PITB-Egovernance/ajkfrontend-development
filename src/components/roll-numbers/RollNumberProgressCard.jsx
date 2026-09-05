import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import RollNumberStatusBadge from './RollNumberStatusBadge';

// Server-computed progress only (Invariant 5 / §22 of the technical
// design) — the "Generate Roll Number Slip" button is gated on
// `summary.ready_for_slip_generation`, never on a client-side
// `pending === 0` check the frontend could get stale or manipulate.
const Stat = ({ label, value, className = '' }) => (
  <div>
    <div className="text-2xl font-bold text-slate-900">{value ?? 0}</div>
    <div className={`text-sm text-slate-500 ${className}`}>{label}</div>
  </div>
);

const RollNumberProgressCard = ({
  summary,
  onContinueAllocation,
  onExport,
  onGenerateSlips,
  onResume,
  generatingSlips = false,
}) => {
  if (!summary) return null;

  const isFailed = summary.status === 'failed';
  const canGenerate = !!summary.ready_for_slip_generation;
  const rollNumbersDone = summary.roll_numbers_generated >= summary.total && summary.total > 0;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Batch Progress</CardTitle>
        <RollNumberStatusBadge status={summary.status} />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <Stat label="Total Applications" value={summary.total} />
          <Stat label="Roll Numbers Generated" value={summary.roll_numbers_generated} />
          <Stat label="Centers Allocated" value={summary.centers_allocated} className="text-emerald-600" />
          <Stat label="Pending" value={summary.pending} className={summary.pending > 0 ? 'text-amber-600 font-semibold' : ''} />
        </div>

        {isFailed && summary.error_message && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {summary.error_message}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {isFailed && (
            <Button variant="destructive" onClick={onResume}>Retry / Resume</Button>
          )}
          {!isFailed && rollNumbersDone && summary.pending > 0 && (
            <Button variant="primary" onClick={onContinueAllocation}>Continue Allocation</Button>
          )}
          {summary.roll_numbers_generated > 0 && (
            <Button variant="outline" onClick={onExport}>Download Excel</Button>
          )}
          {canGenerate && (
            <Button variant="primary" disabled={generatingSlips} onClick={onGenerateSlips}>
              {generatingSlips ? 'Generating…' : 'Generate Roll Number Slip'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RollNumberProgressCard;
