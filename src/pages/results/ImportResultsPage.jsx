import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { ArrowLeft, Download, FileSpreadsheet, Send, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ResultsApi from 'api/resultsApi';
import CSVUploadZone from 'components/results/CSVUploadZone';
import CSVPreviewTable from 'components/results/CSVPreviewTable';
import toast from 'react-hot-toast';

/**
 * ImportResultsPage
 * Implements a 2-phase CSV import workflow (Dry Run -> Commit)
 */

const ImportResultsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Preparing template...', { id: 'template-download' });
      const blob = await ResultsApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AJKPSC_Results_Template_${new Date().getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Template downloaded', { id: 'template-download' });
    } catch (err) {
      toast.error('Failed to download template', { id: 'template-download' });
    }
  };

  const handlePreview = async (file) => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('job_post_id', jobId);
    
    try {
      // dryRun = true
      const response = await ResultsApi.importCSV(formData, true);
      const payload = response.data || response;
      const data = payload.preview || payload.data || [];
      
      setPreviewData(data);
      setSelectedFile(file);
      
      if (data.length > 0) {
        toast.success('Validation complete. Review the preview below.');
      } else {
        toast.error('No valid data found in CSV');
      }
    } catch (err) {
      toast.error(err.message || 'CSV validation failed');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async (file) => {
    if (!file) return;
    
    const hasErrors = previewData?.some(row => row.status === 'error');
    if (hasErrors) {
      toast.error('Cannot commit CSV with validation errors. Please fix red rows.');
      return;
    }

    const confirmImport = window.confirm(
      'Ready to commit? This will persist results to the database and trigger automatic merit ranking. Continue?'
    );
    if (!confirmImport) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('job_post_id', jobId);
    
    try {
      // dryRun = false
      await ResultsApi.importCSV(formData, false);
      toast.success('All results imported successfully!');
      
      // Cleanup
      setPreviewData(null);
      setSelectedFile(null);
      
      // Success feedback delay then navigate
      setTimeout(() => navigate('/dashboard/results'), 1500);
    } catch (err) {
      toast.error(err.message || 'Final import failed');
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = previewData?.some(row => row.status === 'error');

  if (!jobId) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <FileSpreadsheet size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select a Job Post</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Please choose a job from the Results Dashboard to begin the bulk CSV import process.
          </p>
          <Button 
            onClick={() => navigate('/dashboard/results')}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 font-black text-xs uppercase tracking-[0.2em]"
          >
            Go to Results Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Top Navigation & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-600 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bulk Import Results</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">High-Precision Data Pipeline</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleDownloadTemplate}
            className="h-auto py-3 px-6 border-emerald-500 text-emerald-700 bg-emerald-50/30 hover:bg-emerald-500 hover:text-white font-black text-xs uppercase tracking-widest shadow-sm transition-all"
          >
            <Download size={18} className="mr-2" /> Download Template
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          
          {/* Main Processing Area */}
          <div className="lg:col-span-3 space-y-10">
            
            {/* Phase 1: Upload */}
            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
              <CardContent className="p-0">
                <CSVUploadZone 
                  onFileSelect={(file) => {
                    setSelectedFile(file);
                    setPreviewData(null); // Reset preview on new file
                  }}
                  onPreview={handlePreview}
                  onCommit={handleCommit}
                  loading={loading}
                />
              </CardContent>
            </Card>

            {/* Phase 2: Preview Results */}
            {previewData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-6 duration-700">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                    Validation Dashboard
                  </h3>
                  
                  {hasErrors ? (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <AlertTriangle size={14} className="animate-pulse" /> Fix Errors in CSV
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={14} /> Schema Validated
                    </div>
                  )}
                </div>
                
                <CSVPreviewTable data={previewData} />
              </div>
            )}
          </div>

          {/* Sidebar: Instructions & Context */}
          <div className="space-y-8">
            <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-800/80 p-6 border-b border-white/5">
                <CardTitle className="text-base font-black flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <Send size={18} strokeWidth={2.5} />
                  </div>
                  System Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-10 relative">
                {/* Visual Step Indicator */}
                <div className="absolute left-10 top-10 bottom-10 w-0.5 bg-slate-800"></div>
                
                {[
                  { 
                    step: 1, 
                    title: 'Dry Run', 
                    desc: 'Upload CSV for non-persistent validation check.',
                    active: !previewData 
                  },
                  { 
                    step: 2, 
                    title: 'Review Data', 
                    desc: 'Analyze rows for integrity or logic errors.',
                    active: !!previewData && hasErrors 
                  },
                  { 
                    step: 3, 
                    title: 'Final Commit', 
                    desc: 'Batch process valid data to production tables.',
                    active: !!previewData && !hasErrors 
                  }
                ].map((s) => (
                  <div key={s.step} className={`flex gap-6 relative z-10 transition-opacity ${s.active ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      s.active ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {s.step}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest">{s.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed mt-1">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <HelpCircle size={14} className="text-emerald-500" /> Need Help?
              </h5>
              <p className="text-xs text-slate-600 font-bold leading-relaxed italic">
                "Detailed mode requires specific subject columns. Summary mode only needs a 'marks' column."
              </p>
              <Button 
                variant="ghost" 
                className="w-full text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 p-0 h-auto justify-start"
              >
                View Format Guide →
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ImportResultsPage;
