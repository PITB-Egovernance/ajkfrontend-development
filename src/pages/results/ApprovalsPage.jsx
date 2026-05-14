import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  ArrowLeft,
  ShieldCheck,
  FileText,
  User as UserIcon
} from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import toast from 'react-hot-toast';

const ApprovalsPage = () => {
  const navigate = useNavigate();
  const [pendingEdits, setPendingEdits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null); // ID of edit being processed

  useEffect(() => {
    fetchPendingEdits();
  }, []);

  const fetchPendingEdits = async () => {
    try {
      setLoading(true);
      const res = await ResultsApi.getPendingMarkEdits();
      setPendingEdits(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch pending approvals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (edit, approved) => {
    try {
      setProcessing(edit.id);
      const jobId = edit.exam_result?.job_post_id;
      if (!jobId) throw new Error('Job post ID missing');

      await ResultsApi.resolveMarkEdit(jobId, edit.id, {
        approved,
        approval_reason: approved ? 'Approved by admin' : 'Rejected by admin'
      });

      toast.success(approved ? 'Correction approved successfully' : 'Correction rejected');
      fetchPendingEdits();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Verifications...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all group">
              <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Verification Queue</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Review & Approve Mark Corrections</p>
            </div>
          </div>
          
          <div className="px-6 py-3 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-3">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-black text-slate-700">{pendingEdits.length} PENDING ITEMS</span>
          </div>
        </div>

        {pendingEdits.length === 0 ? (
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden py-20">
            <CardContent className="flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                <ShieldCheck size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">Queue is Clear</h3>
                <p className="text-slate-500 max-w-md mx-auto">No pending mark corrections require your attention at this moment. You're all caught up!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {pendingEdits.map((edit) => (
              <Card key={edit.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden hover:shadow-2xl transition-all duration-500 border-l-4 border-l-amber-500">
                <CardContent className="p-8">
                  <div className="flex flex-col lg:flex-row gap-10">
                    
                    {/* Candidate Info */}
                    <div className="lg:w-1/4 space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="p-4 bg-slate-100 rounded-2xl text-slate-600">
                          <UserIcon size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Candidate</p>
                          <h4 className="text-lg font-black text-slate-900 leading-tight">
                            {edit.exam_result?.application?.candidate_name || 'N/A'}
                          </h4>
                          <p className="text-xs font-bold text-indigo-600">Roll: {edit.exam_result?.roll_no}</p>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50 rounded-3xl space-y-3 border border-slate-100">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correction Context</h5>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <FileText size={16} className="text-slate-400" />
                          {edit.exam_result?.job_post?.designation || 'Position'}
                        </div>
                        <div className="flex items-start gap-2 text-xs font-medium text-slate-500 leading-relaxed italic">
                          <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          "{edit.reason}"
                        </div>
                        <div className="pt-2 border-t border-slate-200 mt-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Requested By</p>
                          <p className="text-xs font-bold text-slate-600 uppercase mt-1">{edit.creator?.username || 'DEO'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Mark Comparison Grid */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Old Marks */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                          Existing Scores (LIVE)
                        </p>
                        <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-500">Total Marks</span>
                            <span className="text-xl font-black text-slate-400 tabular-nums">{edit.original_marks?.obtained ?? 'N/A'}</span>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(edit.original_marks?.subjects || {}).map(([sub, val]) => (
                              <div key={sub} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                <span className="text-xs font-medium text-slate-500 capitalize">{sub.replace('_', ' ')}</span>
                                <span className="text-sm font-black text-slate-400">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* New Proposed Marks */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                          Proposed Changes
                        </p>
                        <div className="bg-indigo-50/30 border border-indigo-100 rounded-3xl p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-indigo-900">Total Marks</span>
                            <span className="text-xl font-black text-indigo-600 tabular-nums">{edit.new_marks?.obtained ?? 'N/A'}</span>
                          </div>
                          <div className="space-y-2">
                            {edit.new_marks?.subjects?.map((sub, i) => (
                              <div key={i} className="flex items-center justify-between py-2 border-b border-indigo-100/50 last:border-0">
                                <span className="text-xs font-medium text-indigo-900 capitalize">{sub.subject_name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-indigo-700">{sub.obtained_marks}</span>
                                  <div className="px-1.5 py-0.5 bg-indigo-100 rounded text-[9px] font-bold text-indigo-600">NEW</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="lg:w-48 flex flex-col justify-center gap-4">
                      <Button 
                        onClick={() => handleResolve(edit, true)}
                        disabled={processing === edit.id}
                        className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                      >
                        {processing === edit.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle2 size={16} />}
                        Approve
                      </Button>
                      <Button 
                        onClick={() => handleResolve(edit, false)}
                        variant="outline"
                        disabled={processing === edit.id}
                        className="w-full h-14 rounded-2xl border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={16} />
                        Reject
                      </Button>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default ApprovalsPage;
