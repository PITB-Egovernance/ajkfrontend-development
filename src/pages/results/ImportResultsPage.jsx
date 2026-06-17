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
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className={`${previewData ? 'max-w-[1600px]' : 'max-w-3xl'} mx-auto space-y-6 transition-all duration-300`}>

        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (previewData) {
                  setPreviewData(null);
                } else {
                  navigate(-1);
                }
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-900 border border-slate-200 bg-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {previewData ? 'Dry-Run Verification' : 'Bulk Import Results'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {previewData ? 'Review validation reports and preview data integrity check' : 'Upload results in CSV format to populate student scores'}
              </p>
            </div>
          </div>

          {!previewData && (
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="h-9 px-4 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-lg shadow-none flex items-center gap-2"
            >
              <Download size={16} /> Download Template
            </Button>
          )}
        </div>

        {/* Phase 3: Visual Dry-Run Preview Table View */}
        {previewData ? (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 animate-in fade-in zoom-in-95 duration-300">

            {/* Left Column: Visual Table Grid */}
            <div className="xl:col-span-4 space-y-6">
              <Card className="border border-slate-200 shadow-sm rounded-lg overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Transactional Dry-Run Sandbox</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Spreadsheet Candidate Marks Audit</p>
                    </div>
                    {previewData.success ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold">
                        <CheckCircle2 size={14} className="text-emerald-500" /> ALL CLEAR
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-semibold animate-pulse">
                        <XCircle size={14} className="text-rose-500" /> Validation Required
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                          <th className="py-3 px-6">Candidate Details</th>
                          <th className="py-3 px-6">Subject Breakdown</th>
                          <th className="py-3 px-6 text-center">Percentage</th>
                          <th className="py-3 px-6 text-center">Exam Status</th>
                          <th className="py-3 px-6">Row Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {previewData.rows.map((row, idx) => {
                          const hasErrors = row.status === 'error' || (row.errors && row.errors.length > 0);
                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/50 transition-colors ${hasErrors ? 'bg-rose-50/30' : ''
                                }`}
                            >
                              {/* Candidate Key & Name */}
                              <td className="py-4 px-6">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 border border-indigo-100/50 text-indigo-700 rounded text-[10px] font-semibold font-mono">
                                    Roll No: {row.roll_no}
                                  </span>
                                  <p className="font-semibold text-slate-800 text-sm tracking-tight">{row.candidate_name}</p>
                                </div>
                              </td>

                              {/* Subject Breakdown */}
                              <td className="py-4 px-6">
                                <div className="flex flex-wrap gap-1.5">
                                  {row.subjects.map((sub, sIdx) => {
                                    let tagClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                    let obtainedText = `${sub.obtained_marks} / ${sub.max_marks}`;

                                    if (sub.status === 'missing') {
                                      tagClass = 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse';
                                      obtainedText = 'Missing';
                                    } else if (sub.status === 'invalid') {
                                      tagClass = 'bg-amber-50 text-amber-700 border-amber-100';
                                      obtainedText = `Invalid (${sub.obtained_marks})`;
                                    } else if (sub.status === 'out_of_bounds') {
                                      tagClass = 'bg-rose-100/60 text-rose-800 border-rose-200';
                                      obtainedText = `${sub.obtained_marks} (Exceeds Max ${sub.max_marks})`;
                                    }

                                    return (
                                      <span
                                        key={sIdx}
                                        className={`px-2 py-0.5 border rounded-md font-semibold text-[10px] flex items-center gap-1 transition-all bg-white shadow-sm ${tagClass}`}
                                      >
                                        <span className="opacity-70 text-[9px] uppercase tracking-wider">{sub.subject_name}:</span>
                                        <span className="font-bold">{obtainedText}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Obtained Score & Percentage */}
                              <td className="py-4 px-6 text-center font-bold text-slate-800 text-sm tabular-nums">
                                {row.percentage !== null ? `${Number(row.percentage).toFixed(2)}%` : '—'}
                              </td>

                              {/* Exam Status */}
                              <td className="py-4 px-6 text-center">
                                {row.status === 'pass' && (
                                  <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    PASSED
                                  </span>
                                )}
                                {row.status === 'fail' && (
                                  <span className="inline-flex items-center px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    FAILED
                                  </span>
                                )}
                                {row.status === 'absent' && (
                                  <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    ABSENT
                                  </span>
                                )}
                                {row.status === 'error' && (
                                  <span className="inline-flex items-center px-2 py-0.5 bg-rose-950 border border-rose-800 text-rose-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    ERROR
                                  </span>
                                )}
                              </td>

                              {/* Audit Validation Status & Error List */}
                              <td className="py-4 px-6">
                                {hasErrors ? (
                                  <div className="space-y-1 max-w-xs">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                                      <AlertCircle size={10} /> Failed Checks
                                    </span>
                                    {row.errors.map((err, eIdx) => (
                                      <p key={eIdx} className="text-[10px] font-medium text-rose-600 leading-tight">
                                        • {err}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                    <CheckCircle2 size={10} className="text-emerald-500" /> Row Clean
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
            <div className="xl:col-span-1 space-y-6">

              {/* Summary Stats Card */}
              <Card className="border border-slate-200 bg-white text-slate-900 rounded-lg overflow-hidden shadow-sm">
                <CardHeader className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 tracking-wider uppercase text-slate-800">
                    <Send size={14} className="text-indigo-500" /> Dry-Run Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5 hover:bg-slate-100/50 transition-all">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Rows</p>
                      <p className="text-xl font-bold text-slate-900">{previewData.summary.total ?? previewData.rows.length}</p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5 hover:bg-slate-100/50 transition-all">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Valid Rows</p>
                      <p className="text-xl font-bold text-emerald-600">{previewData.summary.imported ?? 0}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5 hover:bg-slate-100/50 transition-all">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Failed Rows</p>
                    <p className={`text-xl font-bold ${previewData.summary.failed > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {previewData.summary.failed ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Execution Actions Card */}
              <Card className="border border-slate-200 bg-white rounded-lg overflow-hidden p-4 space-y-4 shadow-sm">
                {previewData.success ? (
                  <div className="space-y-3">
                    <Button
                      onClick={handleFinalSubmit}
                      disabled={loading}
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-none"
                    >
                      {loading ? 'Ingesting...' : 'Finalize & Ingest Results'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-xs font-semibold leading-relaxed space-y-1.5 shadow-inner">
                      <p className="font-bold uppercase text-[10px] text-rose-700 tracking-wider">⚠️ Action Required</p>
                      <p>The visual sandbox detected broken cells or empty marks. You must fix the errors in your CSV file or adjust mappings before finalizing.</p>
                    </div>

                    <Button
                      onClick={() => setIsMapperOpen(true)}
                      className="w-full h-9 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-none"
                    >
                      Adjust Column Mappings
                    </Button>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full h-9 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-none"
                >
                  <RefreshCw size={14} /> Start Over
                </Button>
              </Card>

            </div>
          </div>
        ) : (
          /* Phase 1 & 2: Upload CSV View */
          <div className="space-y-6">

            {/* Centered CSV Select Zone */}
            <Card className="border border-slate-200 shadow-sm rounded-lg overflow-hidden bg-white">
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
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">Ingestion Validation Failed</p>
                    <p className="text-xs text-rose-700">{lastError.message || 'Check your CSV format and column mappings.'}</p>
                  </div>
                </div>

                {lastError.details && Array.isArray(lastError.details) && (
                  <div className="bg-white border border-rose-100 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Row-Level Failure Report</p>
                    <ul className="space-y-1.5">
                      {lastError.details.map((errStr, idx) => (
                        <li key={idx} className="flex gap-2 text-xs text-rose-600 font-mono">
                          <span className="text-rose-300">•</span> {errStr}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => handlePreview(selectedFile)}
                    disabled={loading}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 h-9 rounded-lg shadow-none"
                  >
                    {loading ? 'Retrying...' : 'Retry Scan & Map'}
                  </Button>
                </div>
              </div>
            )}
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
