import React, { useState, useEffect } from 'react';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { X, Calculator, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import toast from 'react-hot-toast';

export default function ShortlistPublishModal({ isOpen, onClose, jobId, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (isOpen && jobId) {
      fetchPreview();
    }
  }, [isOpen, jobId]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await ResultsApi.getShortlistPreview(jobId);
      setPreviewData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch shortlist preview');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    try {
      await ResultsApi.publishShortlist(jobId);
      toast.success('Provisional Merit List published and candidates moved to interview award list!');
      onConfirm();
    } catch (err) {
      toast.error(err.message || 'Failed to publish shortlist');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 transform scale-100 transition-all duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <Calculator size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Provisional Merit List Formula & Preview</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Step 6 — Shortlist & Publish</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {loading && !previewData ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Calculating Shortlist...</p>
            </div>
          ) : previewData ? (
            <>
              {/* Formula and Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-md rounded-[1.5rem] bg-indigo-50/80 border border-indigo-100">
                  <CardContent className="p-6 text-center">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Formula</p>
                    <p className="text-2xl font-black text-indigo-900">2 × n + 1</p>
                    <p className="text-[10px] font-bold text-indigo-600/70 mt-1 uppercase">Default Regulation</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md rounded-[1.5rem] bg-white border border-slate-100">
                  <CardContent className="p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Advertised Posts (n)</p>
                    <p className="text-2xl font-black text-slate-800">{previewData.num_posts}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Vacant Positions</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md rounded-[1.5rem] bg-emerald-50/80 border border-emerald-100">
                  <CardContent className="p-6 text-center">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Shortlisted (N)</p>
                    <p className="text-2xl font-black text-emerald-950">{previewData.calculated_shortlist_count}</p>
                    <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase">Candidates Selected</p>
                  </CardContent>
                </Card>
              </div>

              {/* Warning Alert */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800">
                <AlertTriangle size={20} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider mb-1">Important System Promotion</h5>
                  <p className="text-xs font-semibold leading-relaxed">
                    Confirming and publishing will generate the **Provisional Merit List**, publish all written scores to candidates, and **automatically create an Interview Award List** promoting the candidates shown below for viva mark entry.
                  </p>
                </div>
              </div>

              {/* Preview List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                  Preview: Top {previewData.candidates?.length} Candidates to Shortlist
                </h4>
                
                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Rank</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Roll No</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Candidate Name</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">CNIC</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Written Marks</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.candidates?.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {c.rank}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-700">{c.roll_no}</td>
                            <td className="px-6 py-4 text-xs font-black text-slate-900">{c.candidate_name}</td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-500">{c.cnic}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-800 text-right">{c.obtained_marks}/{c.total_max_marks}</td>
                            <td className="px-6 py-4 text-xs font-black text-indigo-600 text-right">{c.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-8 py-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-xs font-black uppercase tracking-widest">
            Cancel
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={loading || !previewData || previewData.candidates?.length === 0}
            className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                Confirm & Publish
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
