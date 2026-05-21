import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  History, 
  User, 
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import Button from 'components/ui/Button';
import ResultsApi from 'api/resultsApi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MarkApprovalConsole
 * Implements UC-R01c: Results Admin review dashboard for mark edits
 */
const MarkApprovalConsole = () => {
  const [pendingEdits, setPendingEdits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchPending = async () => {
    try {
      const response = await ResultsApi.getPendingMarkEdits();
      setPendingEdits(response.data);
    } catch (err) {
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleResolve = async (editId, jobId, approved) => {
    const reason = window.prompt(approved ? 'Approval Notes (Optional):' : 'Reason for Rejection (Mandatory):');
    
    if (!approved && (!reason || reason.length < 5)) {
      toast.error('A valid rejection reason is required');
      return;
    }

    setProcessingId(editId);
    try {
      await ResultsApi.resolveMarkEdit(jobId, editId, {
        approved,
        approval_reason: reason
      });
      toast.success(approved ? 'Edit Approved' : 'Edit Rejected');
      fetchPending();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return null;
  if (pendingEdits.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" size={18} />
          Pending Mark Approvals
          <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full ml-2">
            {pendingEdits.length}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {pendingEdits.map((edit) => (
            <motion.div 
              key={edit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm hover:border-indigo-100 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Candidate Info */}
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-none">
                      {edit.exam_result?.application?.candidate_name || 'Candidate'}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Roll: {edit.exam_result?.roll_no} • Post: #{edit.exam_result?.job_post_id}
                    </p>
                  </div>
                </div>

                {/* Mark Comparison */}
                <div className="flex items-center gap-8 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Original</span>
                    <span className="text-sm font-black text-slate-400 line-through">{edit.original_marks?.obtained}</span>
                  </div>
                  <ArrowRight size={16} className="text-slate-300" />
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-1">Requested</span>
                    <span className="text-sm font-black text-indigo-700">{edit.new_marks?.obtained}</span>
                  </div>
                </div>

                {/* Reason */}
                <div className="flex-grow max-w-md">
                  <div className="flex items-start gap-2 bg-amber-50/50 p-3 rounded-xl">
                    <MessageSquare size={14} className="text-amber-500 mt-1" />
                    <p className="text-[11px] font-medium text-amber-900 leading-relaxed italic">
                      "{edit.reason}"
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[9px] font-bold text-slate-400 uppercase">
                    <History size={10} />
                    Requested by {edit.creator?.username} • {new Date(edit.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    onClick={() => handleResolve(edit.id, edit.exam_result.job_post_id, false)}
                    disabled={processingId === edit.id}
                    variant="outline"
                    className="h-10 w-10 p-0 rounded-xl border-red-100 text-red-500 hover:bg-red-50"
                  >
                    <XCircle size={20} />
                  </Button>
                  <Button 
                    onClick={() => handleResolve(edit.id, edit.exam_result.job_post_id, true)}
                    disabled={processingId === edit.id}
                    className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-100 flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Approve
                  </Button>
                </div>

              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MarkApprovalConsole;
