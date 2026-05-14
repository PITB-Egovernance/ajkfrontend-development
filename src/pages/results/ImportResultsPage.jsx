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
  const [fileHash, setFileHash] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Generating dynamic template...', { id: 'template-download' });
      const blob = await ResultsApi.downloadTemplate(jobId);
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AJKPSC_Template_${jobId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Template generated successfully', { id: 'template-download' });
    } catch (err) {
      toast.error('Failed to generate template', { id: 'template-download' });
    }
  };

  const handlePreview = async (file, page = 1) => {
    if (!jobId) {
      toast.error('Job ID is missing. Please return to the dashboard.');
      return;
    }

    if (!file) {
      toast.error('Please select a file first');
      return;
    }
    
    setLoading(true);
    setLastError(null);
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('job_post_id', jobId);
    
    try {
      // dryRun = true
      const response = await ResultsApi.importCSV(formData, true, page);
      const payload = response.data || response;
      const data = payload.preview || payload.data || [];
      const summary = payload.summary || {};
      
      setPreviewData(data);
      setPaginationInfo(summary);
      setCurrentPage(page);
      setFileHash(payload.file_hash || response.file_hash);
      setSelectedFile(file);
      
      if (data.length > 0) {
        const validCount = data.filter(r => r.status === 'valid').length;
        const errorCount = data.filter(r => r.status === 'error').length;
        toast.success(`Validation complete. ${validCount} valid, ${errorCount} errors. Previewing first 50 rows.`);
      } else {
        toast.error('No valid data found in CSV');
      }
    } catch (err) {
      setLastError(err);
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
      const proceed = window.confirm(
        'This CSV contains errors. Would you like to SKIP invalid rows and only import the valid ones?'
      );
      if (!proceed) return;
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
      formData.append('file_hash', fileHash);
      formData.append('skip_invalid_rows', 'true');
      const res = await ResultsApi.confirmImport(jobId, formData);
      const summary = res.summary || res.data?.summary || {};
      toast.success(`${summary.imported || 'All'} results imported successfully! ${summary.skipped || 0} skipped.`);
      
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

  const hasErrors = paginationInfo?.error_rows > 0;

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

            {/* Error Recovery: Retry Logic */}
            {lastError && selectedFile && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 uppercase tracking-tight">Preview Failed</p>
                    <p className="text-xs font-bold text-amber-700">{lastError.message || 'Check your internet connection or CSV format.'}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => handlePreview(selectedFile)}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg shadow-amber-200"
                >
                  {loading ? 'Retrying...' : 'Retry Preview'}
                </Button>
              </div>
            )}

            {/* Phase 2: Preview Results */}
            {previewData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-6 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Rows Found</p>
                    <p className="text-3xl font-black text-slate-900">{paginationInfo?.total_rows || 0}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Total Valid Records</p>
                    <p className="text-3xl font-black text-emerald-700">{paginationInfo?.valid_rows || 0}</p>
                  </div>
                  <div className={`p-6 rounded-3xl border shadow-sm ${paginationInfo?.error_rows > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${paginationInfo?.error_rows > 0 ? 'text-red-600' : 'text-slate-400'}`}>Total Errors Found</p>
                    <p className={`text-3xl font-black ${paginationInfo?.error_rows > 0 ? 'text-red-700' : 'text-slate-400'}`}>{paginationInfo?.error_rows || 0}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                    Validation Dashboard
                  </h3>
                  
                  {hasErrors ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <AlertTriangle size={14} className="animate-pulse" /> {previewData.filter(r => r.status === 'error').length} Errors Detected
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleCommit(selectedFile)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-4 h-8 rounded-full shadow-lg"
                      >
                        Skip & Proceed
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={14} /> Schema Validated
                    </div>
                  )}
                </div>
                
                <CSVPreviewTable data={previewData} />

                {/* Pagination Controls */}
                {paginationInfo && paginationInfo.total_pages > 1 && (
                  <div className="flex items-center justify-between bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Page <span className="text-slate-900">{currentPage}</span> of {paginationInfo.total_pages}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={currentPage === 1 || loading}
                        onClick={() => handlePreview(selectedFile, currentPage - 1)}
                        className="rounded-xl border-slate-200 text-slate-600 px-6 font-black text-[10px] uppercase tracking-widest"
                      >
                        Previous
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={currentPage === paginationInfo.total_pages || loading}
                        onClick={() => handlePreview(selectedFile, currentPage + 1)}
                        className="rounded-xl border-slate-200 text-slate-600 px-6 font-black text-[10px] uppercase tracking-widest"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
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
