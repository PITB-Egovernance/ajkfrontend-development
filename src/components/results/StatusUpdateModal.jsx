import React, { useState } from 'react';
import { ShieldCheck, X, AlertTriangle } from 'lucide-react';
import Button from 'components/ui/Button';
import SearchableSelect from 'components/ui/SearchableSelect';

const StatusUpdateModal = ({ isOpen, award, onClose, onConfirm }) => {
  const [reasonCode, setReasonCode] = useState('OFFER_DECLINED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(award.id, { reason_code: reasonCode, notes });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonCodes = [
    { value: 'OFFER_DECLINED', label: 'Offer Declined' },
    { value: 'DOC_FAILED', label: 'Document Verification Failed' },
    { value: 'NO_SHOW', label: 'No Show / Absent' },
    { value: 'DISQUALIFIED', label: 'Disqualified' },
    { value: 'OTHER', label: 'Other' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Change Candidate Status</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">UC-R06 • Mandatory Audit Log</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
              <X size={20} />
            </button>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</span>
              <span className="text-base font-black text-slate-900">{award.application?.candidate_name}</span>
              <span className="text-xs font-bold text-slate-500 mt-1">Roll No: {award.application?.application_number}</span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Reason Code</label>
              <SearchableSelect
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                options={reasonCodes}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">Audit Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the reason for status change..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all min-h-[120px]"
              />
            </div>
          </div>

          {award.status === 'selected' && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <AlertTriangle className="text-amber-600 shrink-0" size={18} />
              <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                Note: Updating a "Selected" candidate will vacate their seat. You will be prompted to promote the next candidate.
              </p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            loading={isSubmitting}
            className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 border-none"
          >
            Confirm & Log
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatusUpdateModal;
