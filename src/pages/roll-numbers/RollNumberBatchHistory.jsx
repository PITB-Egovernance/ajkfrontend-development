import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberStatusBadge from 'components/roll-numbers/RollNumberStatusBadge';
import RollNumberApi from 'api/rollNumberApi';
import { formatDate } from 'utils/dateUtils';

// Entry point for the resumable generation flow (§30 Batch History UX of
// the technical design). "Resumable" batches (anything not
// completed/failed) are surfaced first so an admin returning after closing
// the browser sees exactly where to pick back up, without hunting through
// full history.
const RollNumberBatchHistory = () => {
  const navigate = useNavigate();
  const [resumable, setResumable] = useState([]);
  const [history, setHistory] = useState({ data: [], current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [resumableRes, historyRes] = await Promise.all([
        RollNumberApi.getResumableBatches(),
        RollNumberApi.getBatchHistory({ per_page: 20 }),
      ]);
      setResumable(resumableRes?.data || []);
      setHistory(historyRes?.data || { data: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <InlineLoader text="Loading batches..." variant="ring" size="lg" />;
  }

  const Row = ({ batch }) => (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 text-sm font-mono">{batch.exam_type}{batch.stage ? ` (${batch.stage})` : ''}</td>
      <td className="px-4 py-3 text-sm">{batch.roll_number_mode || '—'}</td>
      <td className="px-4 py-3"><RollNumberStatusBadge status={batch.status} /></td>
      <td className="px-4 py-3 text-sm text-right">{batch.total}</td>
      <td className="px-4 py-3 text-sm text-right">{batch.pending}</td>
      <td className="px-4 py-3 text-sm">{batch.created_at ? formatDate(batch.created_at) : '—'}</td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/roll-numbers/batches/${batch.hash_id}`)}>
          {batch.status === 'completed' ? 'View' : 'Continue'}
        </Button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Roll Number Batches</h1>
        <Button variant="primary" onClick={() => navigate('/dashboard/roll-numbers/batches/new')}>
          Start New Batch
        </Button>
      </div>

      {resumable.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Resumable Batches</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-2">Exam Type</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Pending</th>
                  <th className="px-4 py-2">Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>{resumable.map((b) => <Row key={b.hash_id} batch={b} />)}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Batch History</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="px-4 py-2">Exam Type</th>
                <th className="px-4 py-2">Mode</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Pending</th>
                <th className="px-4 py-2">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(history.data || []).map((b) => <Row key={b.hash_id} batch={b} />)}
              {(history.data || []).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No batches yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RollNumberBatchHistory;
