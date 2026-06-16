import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/Card';
import Button from 'components/ui/Button';
import {
  ArrowLeft,
  Download,
  Send,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ResultsApi from 'api/resultsApi';
import CSVUploadZone from 'components/results/CSVUploadZone';
import toast from 'react-hot-toast';
import ColumnMapperModal from 'components/results/ColumnMapperModal';

/**
 * ImportResultsPage
 * Implements a premium, modern Dynamic CSV Importer with transactional Dry-Run Preview Table
 */
const ImportResultsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [lastError, setLastError] = useState(null);

  // Dynamic Importer Phase 2 State
  const [isMapperOpen, setIsMapperOpen] = useState(false);
  const [scannedHeaders, setScannedHeaders] = useState([]);
  const [scannedSubjects, setScannedSubjects] = useState([]);
  const [tempFileId, setTempFileId] = useState(null);

  // Visual Dry-Run Preview States
  const [previewData, setPreviewData] = useState(null); // holds { rows: [], summary: {}, success: bool }
  const [savedConfig, setSavedConfig] = useState(null); // holds column mapping configuration for the final write

  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Generating dynamic template...', { id: 'template-download' });
      const { blob, filename } = await ResultsApi.downloadTemplate(jobId);
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Template generated successfully', { id: 'template-download' });
    } catch (err) {
      toast.error('Failed to generate template', { id: 'template-download' });
    }
  };

  const handlePreview = async (file) => {
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
    setPreviewData(null);
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('job_post_id', jobId);

    try {
      toast.loading('Scanning CSV headers...', { id: 'csv-scan' });

      // Step 1: Scan headers & upload to temporary sandbox
      const response = await ResultsApi.scanCSVHeaders(formData);
      const payload = response.data || response;

      // Step 2: Save state for mapper dialog
      setScannedHeaders(payload.headers || []);
      setScannedSubjects(payload.subjects || []);
      setTempFileId(payload.temp_file_id);
      setSelectedFile(file);

      toast.success('CSV headers scanned successfully.', { id: 'csv-scan' });

      // Step 3: Open Column Mapping Modal
      setIsMapperOpen(true);
    } catch (err) {
      setLastError(err);
      toast.error(err.message || 'Failed to scan CSV headers', { id: 'csv-scan' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Phase 3: Trigger the transactional validation Dry-Run
   */
  const handleMappingConfirm = async (config) => {
    setIsMapperOpen(false);
    setLoading(true);
    setLastError(null);

    const payload = {
      temp_file_id: config.temp_file_id,
      job_post_id: jobId,
      passing_marks: 40, // standard default boundary
      mappings: config.mappings,
      dry_run: true // <-- Executes parsing sandboxed in a rollback transaction!
    };

    try {
      toast.loading('Running dry-run validation checks on CSV rows...', { id: 'csv-dryrun' });

      const res = await ResultsApi.processDynamicImport(payload);
      const responseData = res.data || res;

      setPreviewData({
        rows: responseData.rows || [],
        summary: responseData.summary || {},
        success: responseData.success
      });
      setSavedConfig(config);

      if (responseData.success) {
        toast.success('Dry-run successful! All records are 100% valid.', { id: 'csv-dryrun' });
      } else {
        toast.error('Dry-run found validation errors. Please review the report.', { id: 'csv-dryrun' });
      }
    } catch (err) {
      console.error('Dry-run failure:', err);
      setLastError(err);
      toast.error(err.message || 'Dry-run validation analysis failed.', { id: 'csv-dryrun' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Final Ingestion: Write verified slates atomic into production database
   */
  const handleFinalSubmit = async () => {
    if (!savedConfig) return;

    setLoading(true);
    setLastError(null);

    const payload = {
      temp_file_id: savedConfig.temp_file_id,
      job_post_id: jobId,
      passing_marks: 40,
      mappings: savedConfig.mappings,
      dry_run: false // <-- Actual database write!
    };

    try {
      toast.loading('Writing candidate scores securely to database...', { id: 'csv-finalize' });

      const res = await ResultsApi.processDynamicImport(payload);
      const summary = res.summary || res.data || {};

      toast.success(`Successfully imported ${summary.imported} candidate results!`, { id: 'csv-finalize' });

      setTimeout(() => {
        navigate('/dashboard/results');
      }, 1500);
    } catch (err) {
      console.error('CSV Final Ingestion Error:', err);
      setLastError(err);
      toast.error(err.message || 'Final Ingestion Failed', { id: 'csv-finalize' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreviewData(null);
    setSavedConfig(null);
    setSelectedFile(null);
    setLastError(null);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto space-y-10">

        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button
              onClick={() => {
                if (previewData) {
                  setPreviewData(null);
                } else {
                  navigate(-1);
                }
              }}
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:text-emerald-600 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {previewData ? 'Dry-Run Verification' : 'Bulk Import Results'}
              </h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                {previewData ? 'Transactional Validation report' : 'High-Precision Data Pipeline'}
              </p>
            </div>
          </div>

          {!previewData && (
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="h-auto py-3 px-6 border-emerald-500 text-emerald-700 bg-emerald-50/30 hover:bg-emerald-500 hover:text-white font-black text-xs uppercase tracking-widest shadow-sm transition-all"
            >
              <Download size={18} className="mr-2" /> Download Template
            </Button>
          )}
        </div>

        {/* Phase 3: Visual Dry-Run Preview Table View */}
        {previewData ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 animate-in fade-in zoom-in-95 duration-300">

            {/* Left Column: Visual Table Grid */}
            <div className="lg:col-span-3 space-y-8">
              <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white border border-slate-100">
                <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 border-b border-indigo-950/40">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-white">Transactional Dry-Run Sandbox</h3>
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">Spreadsheet Candidate Marks Audit</p>
                    </div>
                    {previewData.success ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest shadow-inner">
                        <CheckCircle2 size={16} /> ALL CLEAR
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-xs font-black uppercase tracking-widest animate-pulse shadow-inner">
                        <XCircle size={16} /> Validation Required
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                          <th className="py-5 px-6">Candidate Details</th>
                          <th className="py-5 px-6">Subject Breakdown</th>
                          <th className="py-5 px-6 text-center">Percentage</th>
                          <th className="py-5 px-6 text-center">Exam Status</th>
                          <th className="py-5 px-6">Row Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {previewData.rows.map((row, idx) => {
                          const hasErrors = row.status === 'error' || (row.errors && row.errors.length > 0);
                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/30 transition-colors ${hasErrors ? 'bg-rose-50/10' : ''
                                }`}
                            >
                              {/* Candidate Key & Name */}
                              <td className="py-5 px-6">
                                <div className="flex flex-col items-start gap-1.5">
                                  <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 border border-indigo-100/50 text-indigo-700 rounded-lg font-mono text-[10px] font-extrabold">
                                    Roll No: {row.roll_no}
                                  </span>
                                  <p className="font-extrabold text-slate-800 text-sm tracking-tight">{row.candidate_name}</p>
                                </div>
                              </td>

                              {/* Subject Breakdown */}
                              <td className="py-5 px-6">
                                <div className="flex flex-wrap gap-2">
                                  {row.subjects.map((sub, sIdx) => {
                                    let tagClass = 'bg-emerald-50/70 text-emerald-700 border-emerald-100/80';
                                    let obtainedText = `${sub.obtained_marks} / ${sub.max_marks}`;

                                    if (sub.status === 'missing') {
                                      tagClass = 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse';
                                      obtainedText = 'Missing';
                                    } else if (sub.status === 'invalid') {
                                      tagClass = 'bg-amber-50 text-amber-700 border-amber-100';
                                      obtainedText = `Invalid (${sub.obtained_marks})`;
                                    } else if (sub.status === 'out_of_bounds') {
                                      tagClass = 'bg-rose-100/50 text-rose-800 border-rose-200';
                                      obtainedText = `${sub.obtained_marks} (Exceeds Max ${sub.max_marks})`;
                                    }

                                    return (
                                      <span
                                        key={sIdx}
                                        className={`px-3 py-1 border rounded-full font-bold text-[10px] flex items-center gap-1.5 transition-all hover:scale-105 hover:bg-white shadow-sm ${tagClass}`}
                                      >
                                        <span className="opacity-70 font-semibold uppercase text-[9px] tracking-wider">{sub.subject_name}:</span>
                                        <span className="font-black">{obtainedText}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Obtained Score & Percentage */}
                              <td className="py-5 px-6 text-center font-black text-slate-800 text-sm tabular-nums">
                                {row.percentage !== null ? `${Number(row.percentage).toFixed(2)}%` : '—'}
                              </td>

                              {/* Exam Status */}
                              <td className="py-5 px-6 text-center">
                                {row.status === 'pass' && (
                                  <span className="inline-flex items-center px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider font-extrabold">
                                    PASSED
                                  </span>
                                )}
                                {row.status === 'fail' && (
                                  <span className="inline-flex items-center px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-[10px] font-black uppercase tracking-wider font-extrabold">
                                    FAILED
                                  </span>
                                )}
                                {row.status === 'absent' && (
                                  <span className="inline-flex items-center px-3 py-1 bg-slate-100 border border-slate-300 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider font-extrabold">
                                    ABSENT
                                  </span>
                                )}
                                {row.status === 'error' && (
                                  <span className="inline-flex items-center px-3 py-1 bg-rose-950 border border-rose-800 text-rose-300 rounded-full text-[10px] font-black uppercase tracking-wider font-extrabold">
                                    ERROR
                                  </span>
                                )}
                              </td>

                              {/* Audit Validation Status & Error List */}
                              <td className="py-5 px-6">
                                {hasErrors ? (
                                  <div className="space-y-1.5 max-w-xs">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                                      <AlertCircle size={12} /> Failed Checks
                                    </span>
                                    {row.errors.map((err, eIdx) => (
                                      <p key={eIdx} className="text-[10px] font-bold text-rose-600 leading-tight">
                                        • {err}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm font-extrabold">
                                    <CheckCircle2 size={12} className="text-emerald-500" /> Row Clean
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Dry-Run Action Panel */}
            <div className="space-y-8">

              {/* Summary Stats Card */}
              <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl overflow-hidden border border-white/5">
                <CardHeader className="bg-slate-900/60 p-6 border-b border-white/5">
                  <CardTitle className="text-sm font-black flex items-center gap-2.5 tracking-tight uppercase text-white">
                    <Send size={16} className="text-indigo-400" /> Dry-Run Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl space-y-1 hover:bg-white/[0.05] transition-all">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</p>
                      <p className="text-2xl font-black text-white">{previewData.summary.total ?? previewData.rows.length}</p>
                    </div>
                    <div className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl space-y-1 hover:bg-white/[0.05] transition-all">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valid Rows</p>
                      <p className="text-2xl font-black text-emerald-400">{previewData.summary.imported ?? 0}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl space-y-1 hover:bg-white/[0.05] transition-all">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Failed Rows</p>
                    <p className={`text-2xl font-black ${previewData.summary.failed > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                      {previewData.summary.failed ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Execution Actions Card */}
              <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden p-6 space-y-6 border border-slate-100">
                {previewData.success ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-bold leading-relaxed shadow-inner">
                      🚀 <strong>Pristine Slates!</strong> All candidate rows passed parsing checks, and match active candidate registrations perfectly. You are ready to save!
                    </div>

                    <Button
                      onClick={handleFinalSubmit}
                      disabled={loading}
                      className="w-full h-auto py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 rounded-2xl transition-all"
                    >
                      {loading ? 'Ingesting...' : 'Finalize & Ingest Results'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl text-rose-800 text-xs font-bold leading-relaxed space-y-2 shadow-inner">
                      <p className="font-extrabold uppercase text-[10px] text-rose-700 tracking-wider">⚠️ Action Required</p>
                      <p>The visual sandbox detected broken cells or empty marks. You must fix the empty/invalid fields in your CSV spreadsheet or adjust column maps before saving!</p>
                    </div>

                    <Button
                      onClick={() => setIsMapperOpen(true)}
                      className="w-full h-auto py-4 px-6 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-md rounded-2xl transition-all"
                    >
                      Adjust Column Mappings
                    </Button>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full h-auto py-3 px-6 text-slate-500 border-slate-200 bg-transparent hover:bg-slate-50 hover:text-slate-800 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  <RefreshCw size={14} className="mr-2" /> Start Over / Upload New
                </Button>
              </Card>

            </div>
          </div>
        ) : (
          /* Phase 1 & 2: Upload CSV View */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

            {/* Main CSV Select Zone */}
            <div className="lg:col-span-3 space-y-10">
              <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardContent className="p-0">
                  <CSVUploadZone
                    onFileSelect={(file) => {
                      setSelectedFile(file);
                      setLastError(null);
                    }}
                    onPreview={handlePreview}
                    loading={loading}
                  />
                </CardContent>
              </Card>

              {/* Ingestion Failure Alerts */}
              {lastError && selectedFile && (
                <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-slate-800 uppercase tracking-tight">Ingestion Validation Failed</p>
                      <p className="text-xs font-bold text-red-700">{lastError.message || 'Check your CSV format and column mappings.'}</p>
                    </div>
                  </div>

                  {lastError.details && Array.isArray(lastError.details) && (
                    <div className="mt-2 bg-white/80 border border-red-100 rounded-2xl p-4 max-h-60 overflow-y-auto">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Row-Level Failure Report</p>
                      <ul className="space-y-2">
                        {lastError.details.map((errStr, idx) => (
                          <li key={idx} className="flex gap-2 text-xs font-bold text-red-600 font-mono">
                            <span className="text-red-300">●</span> {errStr}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={() => handlePreview(selectedFile)}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg shadow-red-200"
                    >
                      {loading ? 'Retrying...' : 'Retry Scan & Map'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions Sidebar */}
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
                  {/* Step connectors */}
                  <div className="absolute left-10 top-10 bottom-10 w-0.5 bg-slate-800"></div>

                  {[
                    {
                      step: 1,
                      title: 'Select CSV File',
                      desc: 'Choose or drop candidate results CSV sheet.',
                      active: !selectedFile
                    },
                    {
                      step: 2,
                      title: 'Map CSV Columns',
                      desc: 'Align student IDs & dynamic subject marks columns.',
                      active: !!selectedFile && !lastError
                    },
                    {
                      step: 3,
                      title: 'Visual Dry-Run Report',
                      desc: 'Audit mapped marks rows inside a transactional sandbox.',
                      active: !!selectedFile && !!lastError
                    }
                  ].map((s) => (
                    <div key={s.step} className={`flex gap-6 relative z-10 transition-opacity ${s.active ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${s.active ? 'bg-emerald-50 text-slate-900 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-500'
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
        )}
      </div>

      <ColumnMapperModal
        isOpen={isMapperOpen}
        onClose={() => setIsMapperOpen(false)}
        csvHeaders={scannedHeaders}
        subjects={scannedSubjects}
        tempFileId={tempFileId}
        onConfirm={handleMappingConfirm}
      />
    </div>
  );
};

export default ImportResultsPage;
