import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';

// Ranges must be derived from persisted records, never assumed from
// start+count=end (partial allocation, custom ranges, failed items,
// clubbing, and manual reassignment can all break that math) — see
// RollNumberRangeService on the backend, which this just renders.
const RangeList = ({ title, ranges, colorClass }) => (
  <div>
    <div className={`text-sm font-semibold mb-2 ${colorClass}`}>{title} ({ranges?.length || 0})</div>
    {(!ranges || ranges.length === 0) ? (
      <div className="text-sm text-slate-400 italic">None</div>
    ) : (
      <ul className="space-y-1">
        {ranges.map((r, i) => (
          <li key={i} className="text-sm font-mono text-slate-700 bg-slate-50 rounded px-2 py-1">
            {r.start === r.end ? r.start : `${r.start} → ${r.end}`}
          </li>
        ))}
      </ul>
    )}
  </div>
);

const PendingRangeCard = ({ ranges }) => {
  if (!ranges) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roll Number Ranges</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RangeList title="Generated" ranges={ranges.generated} colorClass="text-slate-700" />
        <RangeList title="Allocated" ranges={ranges.allocated} colorClass="text-emerald-700" />
        <RangeList title="Pending" ranges={ranges.pending} colorClass="text-amber-700" />
      </CardContent>
    </Card>
  );
};

export default PendingRangeCard;
