import React, { useState } from 'react';
import { X, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import toast from 'react-hot-toast';

// Shared bulk-publish confirmation modal — used anywhere a post-listing page
// offers "Publish Selected" / "Publish All" (Post-Result landing, Results
// Dashboard, and the per-exam-type Results pages). All-or-nothing on the
// backend: if any post in `jobIds` fails, none of them publish.
export default function BulkPublishModal({ isOpen, onClose, jobIds = [], onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ pub_type: 'final', gazette_ref: '', notify_candidates: true });

  if (!isOpen) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await ResultsApi.bulkPublish({ job_post_ids: jobIds, ...form });
      toast.success(res?.message || `${res?.data?.published ?? jobIds.length} post(s) published`);
      onSuccess?.();
    } catch (err) {
      // Bulk publish is all-or-nothing — surface the backend's own message
      // verbatim, since it names exactly which post stopped the batch and
      // confirms the rollback, rather than a generic failure toast.
      toast.error(err.message || 'Bulk publish failed', { duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <Send size={16} className="text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Publish Results</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {jobIds.length} post(s) will be published in one batch — if any post fails, none of them publish.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 -mt-1 -mr-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-2 space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.notify_candidates}
              onChange={(e) => setForm((p) => ({ ...p, notify_candidates: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-900 focus:ring-emerald-600"
            />
            Notify candidates (SMS/Email/Portal)
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 mt-3">
          <button onClick={onClose} disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Publish {jobIds.length} Post(s)
          </button>
        </div>
      </div>
    </div>
  );
}
