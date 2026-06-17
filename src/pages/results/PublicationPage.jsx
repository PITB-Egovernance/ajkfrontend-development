import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { TextField, MenuItem, Switch, FormControlLabel, IconButton } from '@mui/material';
import { ArrowLeft, Send, Download, AlertTriangle, CheckCircle2, History, Trash2, ShieldCheck, FileText, Info } from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import PublicationChecklist from 'components/results/PublicationChecklist';
import toast from 'react-hot-toast';

const confirmWithdraw = () => {
  return new Promise((resolve) => {
    let reasonText = '';
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[320px] p-1 text-left">
        <div>
          <p className="font-bold text-slate-800 text-sm">Emergency Withdrawal</p>
          <p className="text-xs text-slate-500 mt-1">
            Provide a mandatory legal reason for taking these results offline:
          </p>
        </div>
        <textarea
          rows={3}
          placeholder="Enter withdrawal reason..."
          onChange={(e) => { reasonText = e.target.value; }}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(null);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-105 hover:bg-slate-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const trimmed = reasonText.trim();
              if (!trimmed) {
                toast.error("Withdrawal reason is mandatory.", { id: 'withdraw-validation' });
                return;
              }
              toast.dismiss(t.id);
              resolve(trimmed);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
          >
            Withdraw
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
    });
  });
};

const PublicationPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [checklist, setChecklist] = useState([]);
  const [history, setHistory] = useState([]);
  const [isPublished, setIsPublished] = useState(false);

  const [formData, setFormData] = useState({
    pub_type: 'final',
    gazette_ref: '',
    notify_candidates: true,
    remarks: ''
  });

  const fetchPublicationData = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Real API call for checklist
      const checklistRes = await ResultsApi.getPublicationChecklist(jobId);
      setChecklist(checklistRes.data || []);

      // Audit History (Simplified for now)
      setHistory([
        { id: 1, action: 'Award List Finalized', user: 'Secretary PSC', date: new Date().toLocaleDateString() },
      ]);

      // Check current status
      const res = await ResultsApi.getPublishStatus(jobId);
      setIsPublished(res.data?.status === 'published');
      
      if (res.data) {
        setFormData(prev => ({
          ...prev,
          pub_type: res.data.pub_type || 'final',
          gazette_ref: res.data.gazette_ref || '',
        }));
      }

    } catch (err) {
      toast.error('Failed to load publication readiness checks');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchPublicationData();
  }, [fetchPublicationData]);

  const handlePublish = async () => {
    const allPassed = checklist.every(c => c.passed);
    if (!allPassed) {
      toast.error('GATING ERROR: Publication is blocked until all checklist items are resolved.');
      return;
    }

    const confirm = window.confirm('CRITICAL ACTION: You are about to publish the official gazette. This will notify all candidates and lock the results. Proceed?');
    if (!confirm) return;

    setPublishing(true);
    try {
      await ResultsApi.publish({ job_post_id: jobId, ...formData });
      toast.success('Gazette published successfully!');
      setIsPublished(true);
      fetchPublicationData(); // Refresh to see audit update
    } catch (err) {
      if (err.status === 422) {
        toast.error(`Publication Denied: ${err.message || 'Validation failed'}`);
      } else {
        toast.error(err.message || 'Final publication failed');
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadGazette = async () => {
    try {
      toast.loading('Generating Official Gazette...', { id: 'gazette-gen' });
      const blob = await ResultsApi.downloadGazette(jobId);
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AJKPSC_Gazette_Job_${jobId}_${new Date().getFullYear()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Gazette PDF generated', { id: 'gazette-gen' });
    } catch (err) {
      toast.error('Failed to generate gazette PDF', { id: 'gazette-gen' });
    }
  };

  const handleWithdraw = async () => {
    const reason = await confirmWithdraw();
    if (!reason) return;

    try {
      await ResultsApi.withdraw(jobId, reason);
      toast.success('Results withdrawn and moved to private state.');
      setIsPublished(false);
      fetchPublicationData();
    } catch (err) {
      toast.error(err.message || 'Withdrawal request failed');
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Navigation & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:text-rose-600 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Publication Dashboard</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <ShieldCheck size={16} className="text-rose-600" /> Executive Gazette Authority
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleDownloadGazette}
              className="h-auto py-3.5 px-6 border-slate-200 text-slate-700 bg-white shadow-sm font-black text-xs uppercase tracking-widest hover:bg-slate-50"
            >
              <Download size={18} className="mr-2" /> Gazette PDF
            </Button>
            
            {isPublished && (
              <Button 
                variant="destructive" 
                onClick={handleWithdraw}
                className="h-auto py-3.5 px-6 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 font-black text-xs uppercase tracking-widest"
              >
                <Trash2 size={18} className="mr-2" /> Emergency Withdraw
              </Button>
            )}
          </div>
        </div>

        {/* Safety Check (Gating Component) */}
        <PublicationChecklist checks={checklist} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Publication Form Section */}
          <div className="lg:col-span-2 space-y-10">
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TextField
                    select
                    label="Publication Type"
                    fullWidth
                    value={formData.pub_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, pub_type: e.target.value }))}
                    disabled={isPublished}
                  >
                    <MenuItem value="provisional">Provisional (Subject to Objections)</MenuItem>
                    <MenuItem value="final">Final (Official Release)</MenuItem>
                    <MenuItem value="supplementary">Supplementary (Addendum)</MenuItem>
                  </TextField>
                  <TextField
                    label="Gazette Reference"
                    fullWidth
                    placeholder="Ex: PSC/RE/2024/782"
                    value={formData.gazette_ref}
                    onChange={(e) => setFormData(prev => ({ ...prev, gazette_ref: e.target.value }))}
                    disabled={isPublished}
                    InputProps={{ sx: { fontWeight: 'bold' } }}
                  />
                </div>

                <TextField
                  label="Authorized Remarks (Optional)"
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Official comments for the publication record..."
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  disabled={isPublished}
                  InputProps={{ sx: { borderRadius: '24px' } }}
                />

                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={formData.notify_candidates} 
                        onChange={(e) => setFormData(prev => ({ ...prev, notify_candidates: e.target.checked }))} 
                        color="success"
                        disabled={isPublished}
                      />
                    }
                    label={
                      <div className="ml-3">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Mass Notification</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Send SMS & Email alerts to all applicants</p>
                      </div>
                    }
                  />
                  <CheckCircle2 className={formData.notify_candidates ? 'text-emerald-500' : 'text-slate-300'} />
                </div>

                <Button 
                  variant="primary" 
                  fullWidth 
                  onClick={handlePublish}
                  disabled={publishing || isPublished || !checklist.every(c => c.passed)}
                  className={`h-auto py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all ${
                    isPublished 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 hover:scale-[1.01]'
                  }`}
                >
                  {publishing ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Broadcasting Gazette...
                    </div>
                  ) : isPublished ? (
                    <div className="flex items-center gap-2 justify-center">
                      <ShieldCheck size={20} /> Gazette Already Released
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-center">
                      <Send size={20} /> Sign & Publish Official Gazette
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Detailed Audit Table */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] px-6 flex items-center gap-3">
                <History size={18} className="text-blue-500" />
                Workflow Lifecycle
              </h3>
              <Card className="border-none shadow-xl rounded-[3rem] bg-white overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Action</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized By</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-black text-slate-800">{item.action}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-sm font-bold text-slate-500">{item.user}</td>
                        <td className="px-10 py-6 text-[11px] font-black text-slate-400 text-right tabular-nums">{item.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>

          {/* Sidebar Guidelines */}
          <div className="space-y-8">
            <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-800/50 p-6 border-b border-white/5">
                <CardTitle className="text-base font-black flex items-center gap-3">
                  <FileText className="text-rose-500" size={20} strokeWidth={2.5} />
                  Legal Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8 relative">
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  "Upon clicking publish, the system generates a non-editable, cryptographically signed PDF gazette. 
                  This record is synchronized with the public portal immediately."
                </p>
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Integrity Check</span>
                  </div>
                  <p className="text-[10px] font-bold text-emerald-100 leading-tight">
                    All candidate marks and merit ranks are immutable once published.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] flex items-start gap-4 shadow-inner">
              <Info className="text-amber-600 shrink-0" size={24} />
              <div className="space-y-1">
                <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Officer Note</h5>
                <p className="text-xs text-amber-700 font-bold leading-relaxed">
                  Ensure the Gazette Reference matches the physical file record for archiving purposes.
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PublicationPage;
