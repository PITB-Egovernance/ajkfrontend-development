import React, { useState } from 'react';
import { X, AlertTriangle, EyeOff, RefreshCw } from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import toast from 'react-hot-toast';

// Shared bulk-unpublish (withdraw) confirmation modal — mandatory reason,
// all-or-nothing on the backend. Counterpart to BulkPublishModal.
export default function BulkWithdrawModal({ isOpen, onClose, jobIds = [], onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const submit = async () => {
    if (!reason.trim()) {
      toast.error('A reason is required to unpublish results.');
      return;
    }
    setBusy(true);
    try {
      const res = await ResultsApi.bulkWithdraw({ job_post_ids: jobIds, reason: reason.trim() });
      toast.success(res?.message || `${res?.data?.unpublished ?? jobIds.length} post(s) unpublished`);
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Bulk unpublish failed', { duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Unpublish Results</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {jobIds.length} post(s) will be taken offline in one batch — if any post fails, none of them are unpublished.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 -mt-1 -mr-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-2">
          <textarea
            rows={4}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a mandatory reason for withdrawal..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white resize-none"
          />
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 mt-3">
          <button onClick={onClose} disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-amber-600 hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <EyeOff size={14} />}
            Unpublish {jobIds.length} Post(s)
          </button>
        </div>
      </div>
    </div>
  );
}
