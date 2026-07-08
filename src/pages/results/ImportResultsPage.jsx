import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Download, FileSpreadsheet,
  CheckCircle2, XCircle, X, AlertCircle, Users, Send, RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from 'components/ui/Card';
import CSVUploadZone from 'components/results/CSVUploadZone';
import ColumnMapperModal from 'components/results/ColumnMapperModal';
import ResultsApi from 'api/resultsApi';
import RollNumberApi from 'api/rollNumberApi';
import toast from 'react-hot-toast';

/* ── Template column definitions per paper type ───────────────── */
const ONE_PAPER_COLUMNS = [
  { name: 'Sr#',                        type: 'Number', required: false },
  { name: 'Roll No',                    type: 'Text',   required: true  },
  { name: 'District Code',              type: 'Text',   required: true  },
  { name: 'Gender',                     type: 'Text',   required: true  },
  { name: 'Obtained Marks (Out of 100)', type: 'Number', required: true  },
  { name: 'Obtained Marks (Out of 70%)', type: 'Number', required: true  },
  { name: 'Result',                     type: 'Text',   required: true  },
];

const TWO_PAPER_COLUMNS = [
  { name: 'Sr#',                      type: 'Number', required: false },
  { name: 'Roll No',                  type: 'Text',   required: true  },
  { name: 'District Code',            type: 'Text',   required: true  },
  { name: 'Obtained Marks (paper 1)', type: 'Number', required: true  },
  { name: 'Obtained Marks (paper 2)', type: 'Number', required: true  },
  { name: 'Total Obtain Marks',       type: 'Number', required: true  },
  { name: 'Result',                   type: 'Text',   required: true  },
];

const getTemplateColumns = (examType) => {
  if (examType === 'two-paper-mcqs') return TWO_PAPER_COLUMNS;
  if (examType === 'one-paper-mcqs') return ONE_PAPER_COLUMNS;
  return ONE_PAPER_COLUMNS;
};



/* ── Simple modal shell ───────────────────────────────────────── */
const Modal = ({ open, onClose, maxWidth = 'max-w-lg', children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden`}>
        {children}
      </div>
    </div>
  );
};

/* ── Template preview modal ───────────────────────────────────── */
const TemplateModal = ({ open, onClose, columns, onDownload, downloading, postName }) => (
  <Modal open={open} onClose={onClose} maxWidth="max-w-2xl">
    {/* Header */}
    <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 px-8 py-6 flex items-center justify-between">
      <div className="flex items-center gap-4 text-white">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet size={22} />
        </div>
        <div>
          <p className="font-bold text-base leading-tight">Template Columns</p>
          {postName
            ? <p className="text-emerald-200 text-sm leading-tight mt-0.5">{postName}</p>
            : <p className="text-emerald-200 text-sm leading-tight mt-0.5">Preview all columns before downloading</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-800 font-bold text-sm rounded-xl hover:bg-emerald-50 transition-colors disabled:opacity-60 shadow-sm"
        >
          <Download size={15} /> {downloading ? 'Downloading…' : 'Download Template'}
        </button>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>

    {/* Legend */}
    <div className="px-8 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full bg-slate-300 inline-block flex-shrink-0" />
        <span className="text-xs text-slate-500 font-medium">Fixed column</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block flex-shrink-0" />
        <span className="text-xs text-slate-500 font-medium">Subject marks column</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-rose-500 font-bold text-sm">*</span>
        <span className="text-xs text-slate-500 font-medium">Required field</span>
      </div>
    </div>

    {/* Table */}
    <div className="max-h-[58vh] overflow-y-auto">
      <table className="w-full">
        <thead className="bg-white border-b border-slate-200 sticky top-0 shadow-sm">
          <tr>
            <th className="px-8 py-4 text-xs font-semibold text-slate-400 text-left w-16">#</th>
            <th className="px-8 py-4 text-xs font-semibold text-slate-400 text-left">Column Name</th>
            <th className="px-8 py-4 text-xs font-semibold text-slate-400 text-right">Data Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {columns.map((col, idx) => {
            const isSubject = col.isSubject;
            return (
              <tr key={idx} className={`transition-colors ${isSubject ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'bg-white hover:bg-slate-50/60'}`}>
                <td className="px-8 py-4">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${isSubject ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {idx + 1}
                  </span>
                </td>
                <td className={`px-8 py-4 font-semibold text-sm ${isSubject ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {col.name}
                  {col.required && <span className="ml-1.5 text-rose-500 text-xs font-bold">*</span>}
                </td>
                <td className="px-8 py-4 text-right">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide ${isSubject ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {col.type}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Footer */}
    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
      <p className="text-xs text-slate-400 font-medium">{columns.length} column{columns.length !== 1 ? 's' : ''} total</p>
      <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 font-semibold transition-colors">Close</button>
    </div>
  </Modal>
);

/* ── Import completed dialog ──────────────────────────────────── */
const CompletionModal = ({ open, total, imported, onClose }) => (
  <Modal open={open} onClose={onClose} maxWidth="max-w-md">
    {/* Emerald hero */}
    <div className="bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 px-10 py-12 flex flex-col items-center gap-5 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-72 h-72 rounded-full border border-white/10" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full border border-white/10" />
      </div>
      <div className="relative w-28 h-28 rounded-full bg-white/15 border-4 border-white/40 flex items-center justify-center shadow-2xl">
        <CheckCircle2 size={56} className="text-white drop-shadow-md" strokeWidth={1.6} />
      </div>
      <div className="text-center relative z-10">
        <p className="text-white font-black text-2xl tracking-tight">Import Successful</p>
        <p className="text-emerald-100/90 text-sm mt-1.5 font-medium">All records were imported successfully.</p>
      </div>
    </div>

    {/* Stats — two cards side by side */}
    <div className="px-8 pt-7 pb-6 grid grid-cols-2 gap-4">
      <div className="flex flex-col items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-6">
        <span className="text-4xl font-black text-slate-700">{total}</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Rows</span>
      </div>
      <div className="flex flex-col items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-6">
        <span className="text-4xl font-black text-emerald-600">{imported}</span>
        <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">Uploaded</span>
      </div>
    </div>

    {/* Action */}
    <div className="px-8 pb-8">
      <button
        onClick={onClose}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base rounded-2xl transition-all shadow-lg shadow-emerald-200"
      >
        Done
      </button>
    </div>
  </Modal>
);

/* ── Import rejected dialog ───────────────────────────────────── */
const RejectionModal = ({ open, total, rejected, onClose }) => (
  <Modal open={open} onClose={onClose} maxWidth="max-w-md">
    {/* Rose hero */}
    <div className="bg-gradient-to-br from-rose-400 via-rose-600 to-rose-800 px-10 py-12 flex flex-col items-center gap-5 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-72 h-72 rounded-full border border-white/10" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full border border-white/10" />
      </div>
      <div className="relative w-28 h-28 rounded-full bg-white/15 border-4 border-white/40 flex items-center justify-center shadow-2xl">
        <XCircle size={56} className="text-white drop-shadow-md" strokeWidth={1.6} />
      </div>
      <div className="text-center relative z-10">
        <p className="text-white font-black text-2xl tracking-tight">Import Rejected</p>
        <p className="text-rose-100/90 text-sm mt-1.5 font-medium">The import was cancelled — all rows must be valid.</p>
      </div>
    </div>

    {/* Stats */}
    <div className="px-8 pt-7 pb-6 grid grid-cols-2 gap-4">
      <div className="flex flex-col items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-6">
        <span className="text-4xl font-black text-slate-700">{total}</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Rows</span>
      </div>
      <div className="flex flex-col items-center gap-2 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-6">
        <span className="text-4xl font-black text-rose-600">{rejected}</span>
        <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Rejected</span>
      </div>
    </div>

    {/* Notice */}
    <div className="px-8 pb-4">
      <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
        <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-rose-700 leading-relaxed font-medium">
          Fix the <strong>{rejected}</strong> invalid row(s) in your file and re-upload. All rows must pass validation before any data is saved.
        </p>
      </div>
    </div>

    {/* Action */}
    <div className="px-8 pb-8">
      <button
        onClick={onClose}
        className="w-full py-4 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold text-base rounded-2xl transition-all"
      >
        Try Again
      </button>
    </div>
  </Modal>
);

/* ── No file dialog ───────────────────────────────────────────── */
const NoFileModal = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} maxWidth="max-w-md">
    <div className="bg-gradient-to-br from-rose-500 to-rose-700 px-8 py-8 flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
        <XCircle size={44} className="text-white" />
      </div>
      <div className="text-center">
        <p className="text-white font-black text-2xl leading-tight">No File Selected</p>
        <p className="text-white/80 text-sm mt-1.5">Please choose an Excel file first.</p>
      </div>
    </div>
    <div className="px-8 py-7">
      <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
        Drag and drop an <strong className="text-slate-700">.xlsx</strong> file into the upload zone,<br />or click it to browse your files.
      </p>
      <button onClick={onClose}
        className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-base rounded-2xl transition-colors">
        OK, Got It
      </button>
    </div>
  </Modal>
);


/* ── MCQ auto-mappings (no column mapper needed) ─────────────── */
const MCQ_MAPPINGS = {
  identifier_type:   'roll_number',
  identifier_column: 'Roll No',
  subjects:          {},
};

const isMcqExamType = (et) =>
  et === 'one-paper-mcqs' || et === 'two-paper-mcqs';

/* ── Subject breakdown cell ───────────────────────────────────── */
const SubjectBreakdown = ({ row }) => {
  const subjectsObj = row.subjects ?? row.marks_breakdown ?? row.subject_marks ?? null;

  if (subjectsObj && typeof subjectsObj === 'object' && !Array.isArray(subjectsObj)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(subjectsObj).map(([name, info]) => {
          const obtained = info?.obtained ?? info?.marks ?? info;
          const max = info?.max_marks ?? info?.max ?? null;
          const exceeds = info?.exceeds_max ?? (max !== null && Number(obtained) > Number(max));
          return (
            <span key={name} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
              exceeds
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              {name}:{' '}
              {exceeds
                ? <>{obtained} <span className="font-normal">(Exceeds Max {max})</span></>
                : `${obtained}${max !== null ? ` / ${max}` : ''}`}
            </span>
          );
        })}
      </div>
    );
  }

  if (Array.isArray(subjectsObj) && subjectsObj.length > 0) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {subjectsObj.map((s, i) => {
          const name = s.subject_name ?? s.name ?? `Subject ${i + 1}`;
          const obtained = s.obtained ?? s.marks;
          const max = s.max_marks ?? s.max;
          const exceeds = s.exceeds_max ?? (max != null && Number(obtained) > Number(max));
          return (
            <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              exceeds ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              {name}: {obtained}{max != null && !exceeds ? ` / ${max}` : ''}{exceeds ? ` (Exceeds Max ${max})` : ''}
            </span>
          );
        })}
      </div>
    );
  }

  /* Fallback: simple marks fields */
  const parts = [];
  if (row.paper1_marks !== undefined)
    parts.push(<span key="p1" className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">Paper 1: {row.paper1_marks}</span>);
  if (row.paper2_marks !== undefined)
    parts.push(<span key="p2" className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">Paper 2: {row.paper2_marks}</span>);
  if (row.obtained_marks !== undefined && parts.length === 0)
    parts.push(
      <span key="om" className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">
        Obtained: {row.obtained_marks}
        {row.weighted_marks != null ? ` / Weighted: ${Number(row.weighted_marks).toFixed(2)}` : ''}
      </span>
    );
  if (parts.length > 0) return <div className="flex flex-wrap gap-1.5">{parts}</div>;

  return <span className="text-slate-300 text-xs">—</span>;
};

/* ── Exam status badge ────────────────────────────────────────── */
const ExamStatusBadge = ({ status }) => {
  const s = String(status || '').toUpperCase();
  const cfg = {
    'PASSED': 'bg-emerald-100 text-emerald-700',
    'PASS':   'bg-emerald-100 text-emerald-700',
    'FAILED': 'bg-sky-50 text-sky-600',
    'FAIL':   'bg-sky-50 text-sky-600',
    'ERROR':  'bg-red-100 text-red-700',
    'ABSENT': 'bg-slate-100 text-slate-500',
  }[s] || 'bg-slate-100 text-slate-500';
  return (
    <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${cfg}`}>
      {s || '—'}
    </span>
  );
};

/* ── Row validation cell ─────────────────────────────────────── */
const RowValidation = ({ errors = [] }) => {
  if (!errors || errors.length === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
          Row Clean
        </span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <XCircle size={13} className="text-rose-500 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase text-rose-600">Failed Checks</span>
      </div>
      <ul className="space-y-0.5 pl-1">
        {errors.map((e, i) => (
          <li key={i} className="text-[10px] text-rose-500 leading-relaxed">• {e}</li>
        ))}
      </ul>
    </div>
  );
};

/* ── Dry-run verification (inline in page, two-panel) ────────── */
const DryRunView = ({ data, onClose, onConfirm, confirming, onAdjustMappings }) => {
  const rows    = data?.rows    ?? [];
  const summary = data?.summary ?? {};
  const total   = Number(summary.total      ?? summary.total_rows ?? rows.length);
  const valid   = Number(summary.valid       ?? summary.valid_rows ?? summary.imported ?? 0);
  const failed  = Number(summary.failed      ?? summary.failed_rows ?? 0);
  const hasErrors = failed > 0;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900 border border-slate-200 bg-white flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Dry-Run Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">Review validation reports and preview data integrity check</p>
        </div>
        {hasErrors && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg flex-shrink-0">
            <XCircle size={13} className="text-rose-500" />
            <span className="text-xs font-bold text-rose-600">Validation Required</span>
          </div>
        )}
      </div>

      {/* Two-panel body */}
      <div className="flex gap-5 items-start">

        {/* Left — table card */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden min-w-0">
          {/* Table sub-header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Transactional Dry-Run Sandbox</p>
              <p className="text-xs text-slate-400">Spreadsheet Candidate Marks Audit</p>
            </div>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto max-h-[calc(100vh-260px)] overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-44">Candidate Details</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject Breakdown</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24">Percentage</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-28">Exam Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-56">Row Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => {
                  const errors  = row.errors ?? [];
                  const isClean = errors.length === 0;
                  const status  = String(row.status ?? '').toUpperCase();
                  return (
                    <tr key={i} className={`transition-colors ${!isClean ? 'bg-rose-50/20' : 'bg-white'} hover:bg-slate-50/50`}>
                      <td className="px-4 py-3.5 align-top">
                        <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-bold mb-1">
                          Roll No: {row.roll_no ?? '—'}
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-tight">{row.full_name ?? row.name ?? ''}</p>
                      </td>
                      <td className="px-4 py-3.5 align-top"><SubjectBreakdown row={row} /></td>
                      <td className="px-4 py-3.5 align-top text-sm font-semibold text-slate-700">
                        {row.percentage != null ? `${Number(row.percentage).toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-4 py-3.5 align-top"><ExamStatusBadge status={status} /></td>
                      <td className="px-4 py-3.5 align-top"><RowValidation errors={errors} /></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-slate-400 text-xs">
                      No rows returned from dry-run.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right — stats sidebar */}
        <div className="w-64 shrink-0 space-y-4">
          {/* Stats card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
              <Send size={11} className="text-emerald-500" />
              Dry-Run Stats
            </p>
            <div className="space-y-2.5">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-3xl font-black text-slate-900 leading-none mb-1">{total}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Rows</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-2xl font-black text-emerald-600 leading-none mb-1">{valid}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Valid Rows</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className={`text-2xl font-black leading-none mb-1 ${failed > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{failed}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${failed > 0 ? 'text-rose-400' : 'text-slate-300'}`}>Failed Rows</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action card */}
          {hasErrors ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Action Required</p>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed mb-4">
                The visual sandbox detected broken cells or empty marks. Fix errors in your CSV or adjust column mappings before finalizing.
              </p>
              {onAdjustMappings && (
                <button
                  onClick={onAdjustMappings}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors mb-2"
                >
                  Adjust Column Mappings
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={12} />
                Start Over
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                  <p className="text-xs font-black text-emerald-800 uppercase tracking-wide">All Checks Passed</p>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  All {valid} rows validated. Confirm to save the import.
                </p>
              </div>
              <button
                onClick={onConfirm}
                disabled={confirming}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
              >
                <Users size={14} />
                {confirming ? 'Importing…' : `Confirm Import (${valid})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const ImportResultsPage = () => {
  const { jobId }        = useParams();
  const [searchParams]   = useSearchParams();
  const examType         = searchParams.get('examType') || '';
  const navigate         = useNavigate();

  const [postName,     setPostName]     = useState('');
  const [columns,      setColumns]      = useState(getTemplateColumns(examType));
  const [downloading,  setDownloading]  = useState(false);
  const [scanLoading,  setScanLoading]  = useState(false);
  const [passingMarks, setPassingMarks] = useState(40);

  const isMcq = isMcqExamType(examType);

  // Column mapper state (non-MCQ exams only)
  const [mapperOpen, setMapperOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [tempFileId, setTempFileId] = useState(null);

  // Dry-run state (MCQ + non-MCQ)
  const [dryRunData,            setDryRunData]            = useState(null);
  const [showDryRun,            setShowDryRun]            = useState(false);
  const [confirming,            setConfirming]            = useState(false);
  // Non-MCQ: stores the mapping payload so we can re-use it for the real import
  const [pendingMappingPayload, setPendingMappingPayload] = useState(null);

  // Result state
  const [importResult,   setImportResult]   = useState(null);
  const [rejectionInfo,  setRejectionInfo]  = useState(null);
  const [showTemplate,   setShowTemplate]   = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showRejection,  setShowRejection]  = useState(false);

  /* Load post name + subject columns */
  useEffect(() => {
    if (!jobId) return;
    let alive = true;

    (async () => {
      try {
        const [adsRes, subjectsRes] = await Promise.all([
          RollNumberApi.getAdvertisementsWithJobs(200).catch(() => ({})),
          ResultsApi.getSubjectTemplates(jobId).catch(() => ({})),
        ]);

        if (!alive) return;

        const allAds = adsRes?.data?.data ?? adsRes?.data ?? [];
        for (const ad of allAds) {
          const job = (ad.job_details || []).find(j => (j.hash_id || String(j.id)) === jobId);
          if (job) { setPostName(job.designation || ''); break; }
        }

        const subs = subjectsRes?.data?.subjects ?? subjectsRes?.data ?? subjectsRes?.subjects ?? [];
        const dynamicCols = (Array.isArray(subs) ? subs : []).map(s => ({
          name: (s.subject_name || s.name || '') + ' Marks',
          type: 'Number',
          required: true,
          isSubject: true,
        }));
        setColumns([...getTemplateColumns(examType), ...dynamicCols]);
      } catch { /* silent */ }
    })();

    return () => { alive = false; };
  }, [jobId]);

  /* Download xlsx template from backend */
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await ResultsApi.downloadTemplate(jobId, examType);
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', filename || 'Result_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch {
      toast.error('Failed to download template');
    } finally {
      setDownloading(false);
    }
  };

  /* Step 1 — scan file, then always open the column mapper */
  const handlePreview = async (file) => {
    if (!jobId) { toast.error('Job ID is missing. Please return to the dashboard.'); return; }
    if (!file)  { toast.error('Please select a file first'); return; }

    setScanLoading(true);
    try {
      const formData = new FormData();
      formData.append('csv_file', file);
      formData.append('job_post_id', jobId);

      toast.loading('Scanning file…', { id: 'csv-scan' });
      const res  = await ResultsApi.scanCSVHeaders(formData);
      const data = res?.data ?? res ?? {};
      const fileId = data.temp_file_id ?? null;

      toast.dismiss('csv-scan');

      const apiSubjects = data.subjects ?? [];
      setCsvHeaders(data.headers ?? []);
      // For MCQ: no subject mapping needed; for non-MCQ: use API subjects
      setSubjects(!isMcq && apiSubjects.length > 1 ? apiSubjects : []);
      setTempFileId(fileId);
      setMapperOpen(true);
    } catch (err) {
      toast.dismiss('csv-scan');
      toast.error(err?.message || 'Failed to process file');
    } finally {
      setScanLoading(false);
    }
  };

  /* Step 2 — column mapper confirmed → dry_run=true → show DryRunView */
  const handleMappingConfirm = async (payload) => {
    setMapperOpen(false);
    // For MCQ: always use the fixed MCQ mappings regardless of what mapper returns
    const mappings = isMcq ? MCQ_MAPPINGS : payload.mappings;
    const toastId  = toast.loading('Running dry-run validation…', { position: 'top-right', duration: Infinity });
    try {
      const previewRes = await ResultsApi.processDynamicImport({
        temp_file_id:  payload.temp_file_id,
        job_post_id:   jobId,
        passing_marks: Number(passingMarks) || 40,
        dry_run:       true,
        mappings,
      });
      toast.dismiss(toastId);
      setPendingMappingPayload({ ...payload, mappings });
      setDryRunData(previewRes?.data ?? {});
      setShowDryRun(true);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.message || 'Validation failed', { position: 'top-right' });
    }
  };

  /* Step 3 — confirm real import using stored payload */
  const handleConfirmImport = async () => {
    if (!pendingMappingPayload) return;
    setConfirming(true);
    const toastId = toast.loading('Importing results — please do not close this tab…', { position: 'top-right', duration: Infinity });
    try {
      const res  = await ResultsApi.processDynamicImport({
        temp_file_id:  pendingMappingPayload.temp_file_id,
        job_post_id:   jobId,
        passing_marks: Number(passingMarks) || 40,
        dry_run:       false,
        mappings:      pendingMappingPayload.mappings,
      });
      const data     = res?.data ?? res ?? {};
      const imported = Number(data.imported ?? data.success_count ?? data.uploaded ?? 0);
      const rejected = Number(data.rejected ?? data.failed ?? data.rejected_count ?? 0);
      toast.dismiss(toastId);
      setShowDryRun(false);
      if (rejected > 0) {
        setRejectionInfo({ total: imported + rejected, rejected });
        setShowRejection(true);
      } else {
        setImportResult({ total: imported + rejected, imported });
        setShowCompletion(true);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.message || 'Import failed', { position: 'top-right' });
    } finally {
      setConfirming(false);
    }
  };

  /* Go back to column mapper to fix mappings */
  const handleAdjustMappings = () => {
    setShowDryRun(false);
    setMapperOpen(true);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">

      {/* ── Dry-run view replaces upload form inline (sidebar/navbar stay visible) */}
      {showDryRun && (
        <DryRunView
          data={dryRunData}
          onClose={() => setShowDryRun(false)}
          onConfirm={handleConfirmImport}
          confirming={confirming}
          onAdjustMappings={handleAdjustMappings}
        />
      )}

      {/* ── Upload form — hidden while dry-run is showing */}
      <div className={`max-w-5xl mx-auto space-y-6 ${showDryRun ? 'hidden' : ''}`}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-900 border border-slate-200 bg-white">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bulk Import Results</h1>
            {postName && <p className="text-xs text-slate-500 mt-0.5">{postName}</p>}
          </div>
        </div>

        {/* Upload Instructions */}
        <Card className="border border-emerald-200 bg-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-emerald-700" />
              <span className="text-sm font-bold text-emerald-800">Upload Instructions</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
              {(isMcq ? [
                { n: 1, color: 'bg-emerald-600', text: <>Download the <strong>Excel template</strong> — it has the correct columns for this exam type.</> },
                { n: 2, color: 'bg-emerald-600', text: <>Fill in <strong>Obtained Marks</strong> only. Leave weighted/total/result columns blank — the system calculates them.</> },
                { n: 3, color: 'bg-emerald-600', text: <>Upload the filled file. The system will <strong>scan and preview results</strong> before importing anything.</> },
                { n: 4, color: 'bg-emerald-500', text: <><strong>Roll No</strong> must match exactly. Unrecognised roll numbers will be rejected.</> },
                { n: 5, color: 'bg-slate-500',   text: <>Leave marks <strong>blank for absent candidates</strong> — blank rows are automatically marked Absent.</> },
                { n: 6, color: 'bg-rose-500',    text: <>If <strong>any row</strong> has an error the <strong>entire import is cancelled</strong>. Fix errors and re-upload.</> },
              ] : [
                { n: 1, color: 'bg-emerald-600', text: <>Download the correct <strong>Excel template</strong> for your applicant type using the button below.</> },
                { n: 2, color: 'bg-emerald-600', text: <>Fill in the downloaded <strong>Excel template (.xlsx)</strong> and upload it. The system will scan and map columns automatically.</> },
                { n: 3, color: 'bg-emerald-600', text: <>After scanning, verify the <strong>column mapping</strong> in the dialog before confirming the import.</> },
                { n: 4, color: 'bg-emerald-500', text: <><strong>Roll Number</strong> must be exactly the same. Rows with a missing or incorrect Roll Number will be rejected.</> },
                { n: 5, color: 'bg-emerald-500', text: <><strong>Obtained Marks</strong> must be numeric digits. Rows with invalid marks will be rejected.</> },
                { n: 6, color: 'bg-rose-500',    text: <>If <strong>any row</strong> is invalid the <strong>entire import is rejected</strong>. Fix all errors in your file and re-upload.</> },
              ]).map(({ n, color, text }) => (
                <div key={n} className="flex items-start gap-2.5">
                  <span className={`${color} text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>{n}</span>
                  <p className="text-xs text-emerald-900 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


        {/* Upload form */}
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-6 space-y-5">

            {/* Template download */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Download Template</p>
              <button
                onClick={() => setShowTemplate(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg transition-colors">
                <Download size={14} /> Download Template
              </button>
            </div>

            <div className="border-t border-slate-100" />

            {/* Passing marks */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Passing Marks</label>
                <p className="text-[11px] text-slate-400">Minimum marks required to pass</p>
              </div>
              <input
                type="number"
                min={0}
                max={200}
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value)}
                className="ml-auto w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* Original upload zone */}
            <CSVUploadZone
              onFileSelect={() => {}}
              onPreview={handlePreview}
              loading={scanLoading}
            />

          </CardContent>
        </Card>

      </div>

      {/* Template preview modal */}
      <TemplateModal
        open={showTemplate}
        onClose={() => setShowTemplate(false)}
        columns={columns.length ? columns : getTemplateColumns(examType)}
        onDownload={handleDownloadTemplate}
        downloading={downloading}
        postName={postName}
      />

      {/* Column mapper modal — shows for ALL exam types after scan */}
      <ColumnMapperModal
        isOpen={mapperOpen}
        onClose={() => setMapperOpen(false)}
        csvHeaders={csvHeaders}
        subjects={subjects}
        tempFileId={tempFileId}
        onConfirm={handleMappingConfirm}
        requireSubjectMapping={!isMcq}
      />

      {/* Import completed modal */}
      <CompletionModal
        open={showCompletion}
        total={importResult?.total ?? 0}
        imported={importResult?.imported ?? 0}
        onClose={() => setShowCompletion(false)}
      />

      {/* Import rejected modal */}
      <RejectionModal
        open={showRejection}
        total={rejectionInfo?.total ?? 0}
        rejected={rejectionInfo?.rejected ?? 0}
        onClose={() => setShowRejection(false)}
      />
    </div>
  );
};

export default ImportResultsPage;
