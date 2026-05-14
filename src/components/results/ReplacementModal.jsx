import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from 'components/ui/Dialog';
import Button from 'components/ui/Button';
import { UserMinus, ArrowRight, UserPlus, AlertTriangle } from 'lucide-react';

/**
 * ReplacementModal Component
 * Handles the logic of replacing a recommended candidate with the next-in-line
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.candidate - The candidate being replaced
 * @param {Object} props.nextInLine - The next eligible candidate on the merit list
 * @param {Function} props.onConfirm - Callback when replacement is confirmed
 * @param {boolean} props.loading
 */

const ReplacementModal = ({ isOpen, onClose, candidate, nextInLine, onConfirm, loading }) => {
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');

  const REASON_CODES = [
    { value: 'OFFER_DECLINED', label: 'Offer Declined by Candidate' },
    { value: 'DOC_FAILED', label: 'Document Verification Failed' },
    { value: 'ABSENT_JOINING', label: 'Absent from Joining/Reporting' },
    { value: 'MEDICAL_FAILED', label: 'Medical Fitness Failed' },
    { value: 'WITHDRAWAL_CANDIDATE', label: 'Candidate Withdrawn Application' },
    { value: 'OTHER', label: 'Other (Specify in notes)' },
  ];

  const handleConfirm = () => {
    if (!reasonCode) return;
    onConfirm({ 
      candidate_id: candidate?.id,
      replacement_id: nextInLine?.id,
      reason_code: reasonCode, 
      notes 
    });
  };

  const handleClose = () => {
    setReasonCode('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl overflow-hidden">
        <DialogHeader className="bg-red-50 -mx-6 -mt-6 p-8 border-b border-red-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <UserMinus size={28} strokeWidth={2.5} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-red-900 leading-tight">
                Merit Replacement
              </DialogTitle>
              <DialogDescription className="text-red-700 font-medium text-xs mt-1">
                Removing candidate from recommendation list.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="flex items-center justify-between p-5 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-inner">
            <div className="text-center flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Remove</p>
              <p className="font-bold text-slate-800 mt-1.5 truncate text-sm">
                {candidate?.name || candidate?.full_name || 'N/A'}
              </p>
            </div>
            <div className="px-4 text-slate-300">
              <ArrowRight size={24} strokeWidth={3} className="animate-pulse" />
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Promote</p>
              <p className="font-bold text-emerald-700 mt-1.5 truncate text-sm">
                {nextInLine?.name || nextInLine?.full_name || 'Next Candidate'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              Reason Code <span className="text-red-500">*</span>
            </label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white font-semibold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none appearance-none"
              disabled={loading}
            >
              <option value="">Select a reason for removal...</option>
              {REASON_CODES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Officer Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide official remarks for this rotation..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white font-semibold text-slate-700 min-h-[100px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none"
              disabled={loading}
            />
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
            <p className="text-[10px] text-amber-800 font-bold leading-relaxed uppercase">
              Warning: This action is irreversible once saved. The promoted candidate will immediately take the merit position.
            </p>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 flex flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={loading}
            className="flex-1 border-slate-200 text-slate-600 font-bold"
          >
            Abort
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!reasonCode || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200"
          >
            {loading ? 'Rotating...' : 'Rotate Merit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReplacementModal;
