import React, { useState, useEffect } from 'react';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { X, Calculator, CheckCircle, AlertTriangle } from 'lucide-react';
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
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 transform scale-100 transition-all duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-650 rounded-lg">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Provisional Merit List Formula & Preview</h3>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Step 6 — Shortlist & Publish</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {loading && !previewData ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider animate-pulse">Calculating Shortlist...</p>
            </div>
          ) : previewData ? (
            <>
              {/* Formula and Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border border-indigo-150 shadow-sm rounded-lg bg-indigo-50/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Formula</p>
                    <p className="text-xl font-bold text-indigo-900">2 × n + 1</p>
                    <p className="text-[10px] font-semibold text-indigo-600/70 mt-1 uppercase">Default Regulation</p>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm rounded-lg bg-white">
                  <CardContent className="p-4 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Advertised Posts (n)</p>
                    <p className="text-xl font-bold text-slate-800">{previewData.num_posts}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Vacant Positions</p>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-150 shadow-sm rounded-lg bg-emerald-50/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Shortlisted (N)</p>
                    <p className="text-xl font-bold text-emerald-950">{previewData.calculated_shortlist_count}</p>
                    <p className="text-[10px] font-semibold text-emerald-600/70 mt-1 uppercase">Candidates Selected</p>
                  </CardContent>
                </Card>
              </div>

              {/* Warning Alert */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800">
                <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1">Important System Promotion</h5>
                  <p className="text-xs font-medium leading-relaxed">
                    Confirming and publishing will generate the **Provisional Merit List**, publish all written scores to candidates, and **automatically create an Interview Award List** promoting the candidates shown below for viva mark entry.
                  </p>
                </div>
              </div>

              {/* Preview List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Preview: Top {previewData.candidates?.length} Candidates to Shortlist
                </h4>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-center text-slate-500">Rank</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Roll No</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Candidate Name</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">CNIC</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Written Marks</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Percentage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.candidates?.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {c.rank}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-bold text-slate-700">{c.roll_no}</td>
                            <td className="px-5 py-3.5 text-xs font-semibold text-slate-900">{c.candidate_name}</td>
                            <td className="px-5 py-3.5 text-xs text-slate-400">{c.cnic}</td>
                            <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-right">{c.obtained_marks}/{c.total_max_marks}</td>
                            <td className="px-5 py-3.5 text-xs font-bold text-indigo-600 text-right">{c.percentage}%</td>
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
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={loading} 
            className="text-xs font-semibold rounded-lg h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-none"
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={loading || !previewData || previewData.candidates?.length === 0}
            className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm h-9 rounded-lg transition-all flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
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
