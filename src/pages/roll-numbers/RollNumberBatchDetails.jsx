import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberProgressCard from 'components/roll-numbers/RollNumberProgressCard';
import RollNumberGenerationMode from 'components/roll-numbers/RollNumberGenerationMode';
import CenterAllocationMode from 'components/roll-numbers/CenterAllocationMode';
import PendingRangeCard from 'components/roll-numbers/PendingRangeCard';
import RollNumberApi from 'api/rollNumberApi';

const EXAM_TYPES = [
  { value: 'one-paper-mcqs', label: 'One Paper MCQs' },
  { value: 'two-paper-mcqs', label: 'Two Paper MCQs' },
  { value: 'written-exams',  label: 'Written Exams' },
  { value: 'cce-exams',      label: 'CCE Screening' },
];

// Statuses the frontend should keep polling on — matches §62 of the
// technical design (2.5-5s, stop on completed/failed/ready). Everything
// else is a terminal-for-now state that only changes on an explicit admin
// action (generate / allocate / generate slips), so polling would be wasted.
const POLLING_STATUSES = new Set([
  'roll_numbers_generating',
  'center_allocation_in_progress',
  'slips_generating',
]);

const POLL_INTERVAL_MS = 3000;

// New-batch starter: exam type + a simple shortlisted-application picker.
// Deliberately minimal — the existing RollNumberExamFlow.jsx already has a
// much richer post/advertisement selection UI; this reuses the same
// GET /roll-numbers/shortlisted endpoint rather than duplicating that UI,
// so an admin can start a resumable batch without needing every filter the
// full wizard offers.
const NewBatchForm = ({ onCreated }) => {
  const [examType, setExamType] = useState('one-paper-mcqs');
  const [search, setSearch] = useState('');
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const runSearch = async () => {
    setLoading(true);
    try {
      const res = await RollNumberApi.getShortlisted({ search, per_page: 50 });
      setApplications(res?.data?.data || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runSearch(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggle = (appNumber) => {
    setSelected((prev) => prev.includes(appNumber) ? prev.filter((a) => a !== appNumber) : [...prev, appNumber]);
  };

  const create = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one application.');
      return;
    }
    setCreating(true);
    try {
      const res = await RollNumberApi.createBatch({ exam_type: examType, application_numbers: selected });
      toast.success('Batch created');
      onCreated(res?.data?.hash_id);
    } catch (e) {
      toast.error(e.message || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Start New Batch</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm text-slate-500 mb-1">Exam Type</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
            {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search candidate name / CNIC / application number…"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2"
          />
          <Button variant="outline" onClick={runSearch}>Search</Button>
        </div>

        <div className="text-sm text-slate-500">{selected.length} selected</div>

        {loading ? (
          <InlineLoader text="Loading applications..." variant="ring" size="md" />
        ) : (
          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {applications.map((app) => (
              <label key={app.application_number} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(app.application_number)} onChange={() => toggle(app.application_number)} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{app.candidate_name}</div>
                  <div className="text-xs text-slate-500">{app.application_number} · {app.candidate_cnic}</div>
                </div>
              </label>
            ))}
            {applications.length === 0 && <div className="px-4 py-8 text-center text-slate-400">No applications found.</div>}
          </div>
        )}

        <Button variant="primary" disabled={creating || selected.length === 0} onClick={create}>
          {creating ? 'Creating…' : `Create Batch (${selected.length})`}
        </Button>
      </CardContent>
    </Card>
  );
};

const RollNumberBatchDetails = () => {
  const { batchRef } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [ranges, setRanges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef(null);

  const load = useCallback(async () => {
    if (!batchRef) return;
    try {
      const [batchRes, rangesRes] = await Promise.all([
        RollNumberApi.getBatch(batchRef),
        RollNumberApi.getBatchRanges(batchRef).catch(() => null),
      ]);
      setSummary(batchRes?.data || null);
      if (rangesRes) setRanges(rangesRes.data);
    } catch (e) {
      toast.error(e.message || 'Failed to load batch');
    } finally {
      setLoading(false);
    }
  }, [batchRef]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Poll while a background job is actually running — re-fetches on mount,
  // on window focus, and after every admin action too (§62/§63), never
  // relying on localStorage/React state as the actual source of truth.
  useEffect(() => {
    if (summary && POLLING_STATUSES.has(summary.status)) {
      pollTimer.current = setTimeout(load, POLL_INTERVAL_MS);
    }
    return () => clearTimeout(pollTimer.current);
  }, [summary, load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (!batchRef) {
    return <NewBatchForm onCreated={(hashId) => navigate(`/dashboard/roll-numbers/batches/${hashId}`)} />;
  }

  if (loading && !summary) {
    return <InlineLoader text="Loading batch..." variant="ring" size="lg" />;
  }

  if (!summary) {
    return <div className="text-center text-slate-400 py-12">Batch not found.</div>;
  }

  const rollNumbersDone = summary.roll_numbers_generated >= summary.total && summary.total > 0;

  const runAction = async (fn, successMessage) => {
    setBusy(true);
    try {
      await fn();
      if (successMessage) toast.success(successMessage);
      await load();
    } catch (e) {
      toast.error(e.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await RollNumberApi.exportBatch(batchRef);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roll-numbers-batch-${batchRef}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Batch — {summary.exam_type}{summary.stage ? ` (${summary.stage})` : ''}
        </h1>
        <Button variant="outline" onClick={() => navigate('/dashboard/roll-numbers/batches')}>Back to Batches</Button>
      </div>

      <RollNumberProgressCard
        summary={summary}
        generatingSlips={busy}
        onContinueAllocation={() => document.getElementById('center-allocation-section')?.scrollIntoView({ behavior: 'smooth' })}
        onExport={handleExport}
        onResume={() => runAction(() => RollNumberApi.resumeBatch(batchRef), 'Batch resumed')}
        onGenerateSlips={() => runAction(() => RollNumberApi.generateFinalSlips(batchRef), 'Slip generation started')}
      />

      {!rollNumbersDone && summary.status !== 'failed' && (
        <RollNumberGenerationMode
          batch={summary}
          generating={busy}
          onGenerate={(mode, startingNumber) => runAction(
            () => RollNumberApi.generateRollNumbers(batchRef, { mode, starting_number: startingNumber }),
            'Roll number generation started'
          )}
        />
      )}

      {rollNumbersDone && summary.pending > 0 && (
        <div id="center-allocation-section">
          <CenterAllocationMode
            batch={summary}
            allocating={busy}
            onAllocateAutomatic={(body) => runAction(() => RollNumberApi.allocateAutomatic(batchRef, body), 'Automatic allocation started')}
            onAllocateCustom={(body) => runAction(() => RollNumberApi.allocateCustom(batchRef, body), 'Centers allocated')}
          />
        </div>
      )}

      <PendingRangeCard ranges={ranges} />
    </div>
  );
};

export default RollNumberBatchDetails;
