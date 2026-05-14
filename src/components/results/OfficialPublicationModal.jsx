import React, { useState } from 'react';
import { 
  Send, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldCheck,
  BellRing
} from 'lucide-react';
import Button from 'components/ui/Button';
import { Card } from 'components/ui/Card';
import ResultsApi from 'api/resultsApi';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const OfficialPublicationModal = ({ isOpen, onClose, job, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState(true);
  const [gazetteRef, setGazetteRef] = useState('');

  if (!isOpen || !job) return null;

  const handlePublish = async () => {
    if (!gazetteRef) {
      toast.error('Please enter a Gazette Reference number');
      return;
    }

    setLoading(true);
    try {
      await ResultsApi.publishResults({
        job_post_id: job.id,
        pub_type: 'written_test',
        gazette_ref: gazetteRef,
        notify_candidates: notify
      });
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Publication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* Header */}
          <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-xl">
                <Send size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight leading-none">Official Publication</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Final Release Authorization</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-8">
            {/* Job Summary */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Job</p>
              <h4 className="text-base font-black text-slate-900 leading-tight">{job.designation}</h4>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-tight">Scale: BPS-{job.scale} • Post ID: #{job.id}</p>
            </div>

            {/* Publication Settings */}
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Gazette Reference Number</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="e.g. AJKPSC/RESULTS/2024/042"
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all outline-none"
                    value={gazetteRef}
                    onChange={(e) => setGazetteRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <BellRing className="text-emerald-600" size={20} />
                  <div>
                    <p className="text-xs font-black text-emerald-900 uppercase tracking-tight">Notify Candidates</p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Via SMS and Email alerts</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotify(!notify)}
                  className={`w-12 h-6 rounded-full transition-all relative ${notify ? 'bg-emerald-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notify ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <ShieldCheck size={14} className="text-emerald-500" /> Integrity Verification
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Results have been cross-verified by Authority
                </li>
                <li className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <CheckCircle2 size={12} className="text-emerald-500" /> All marks entries are auditable and locked
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handlePublish}
                disabled={loading}
                className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100"
              >
                {loading ? 'Publishing...' : 'Authorize Publication'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OfficialPublicationModal;
