import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  User,
  FileText,
  MessageSquare,
  Activity,
  ClipboardList,
  GitBranch,
  AlertCircle,
  Loader2,
  Send,
  Trash2,
} from 'lucide-react';
import RequisitionApprovalApi from 'api/requisitionApprovalApi';

// ─── StatusBadge ────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
  submitted: 'bg-blue-50 text-blue-700 border border-blue-200',
  returned: 'bg-orange-50 text-orange-700 border border-orange-200',
  upcoming: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const StatusBadge = ({ status, label, className = '' }) => {
  const normalizedStatus = String(status || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  const normalizedLabel = String(label || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  const isDepartmentReceived =
    normalizedStatus === 'requisition received by department' ||
    normalizedLabel === 'requisition received by department';
  const key = isDepartmentReceived ? 'pending' : normalizedStatus;
  const style = STATUS_STYLES[key] || 'bg-slate-100 text-slate-600 border border-slate-200';
  const display = isDepartmentReceived
    ? 'Pending'
    : label || key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}>
      {display}
    </span>
  );
};

// ─── Loading / Error states ──────────────────────────────────────────────────

const PageSpinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
  </div>
);

const PageError = ({ message, onRetry }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-10 text-center max-w-md">
      <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
      <p className="text-slate-700 font-medium mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  </div>
);

// ─── HeaderSection ──────────────────────────────────────────────────────────
// Feeds from: API 11 → data.requisition

const HeaderSection = ({ requisition, onBack, onDownload, onTrackApproval }) => (
  <div className="bg-white border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{requisition.designation}</h1>
            <StatusBadge status={requisition.overall_status} label={requisition.overall_status} />
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 flex-wrap">
            <span>Request ID: {requisition.id_display}</span>
            <span className="text-slate-300">•</span>
            {/* <span>Department: {requisition.department}</span> */}
            <span className="text-slate-300">•</span>
            <span>Requested by: {requisition.requested_by}</span>
            <span className="text-slate-300">•</span>
            <span>{requisition.request_date}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={onTrackApproval}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <GitBranch className="w-4 h-4" />
            Track Approval
          </button> */}
        </div>
      </div>
    </div>
  </div>
);

// ─── TabsSection ────────────────────────────────────────────────────────────

const TABS = [
  { key: 'details', label: 'Request Details', icon: FileText },
  { key: 'approvals', label: 'Approvals', icon: ClipboardList },
  { key: 'activity', label: 'Activity Log', icon: Activity },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
];

const TabsSection = ({ activeTab, onTabChange }) => (
  <div className="bg-white border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav className="flex gap-0 -mb-px overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  </div>
);

// ─── TimelineStep ───────────────────────────────────────────────────────────
// Feeds from: API 11 → data.workflow_steps[]

const getStepConfig = (status, isCurrent) => {
  if (status === 'approved') return { circle: 'bg-emerald-500 text-white', border: '', bg: '', line: 'bg-emerald-400', Icon: CheckCircle };
  if (status === 'rejected' || status === 'returned') return { circle: 'bg-rose-500 text-white', border: 'border-rose-200', bg: 'bg-rose-50', line: 'bg-rose-300', Icon: XCircle };
  if (isCurrent) return { circle: 'bg-amber-400 text-white', border: 'border-amber-300', bg: 'bg-amber-50/60', line: 'bg-slate-200', Icon: Clock };
  return { circle: 'bg-slate-200 text-slate-400', border: '', bg: '', line: 'bg-slate-200', Icon: Clock };
};

const TimelineStep = ({ step, isLast, prevStatus }) => {
  const config = getStepConfig(step.status, step.is_current);
  const { Icon } = config;
  const connectorColor = prevStatus === 'approved' ? 'bg-emerald-400' : 'bg-slate-200';

  return (
    <div className="relative flex gap-5">
      <div className="flex flex-col items-center">
        {step.step > 1 && <div className={`w-0.5 h-5 ${connectorColor}`} />}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${config.circle}`}>
          <Icon className="w-5 h-5" />
        </div>
        {!isLast && <div className={`w-0.5 flex-1 min-h-[40px] ${config.line}`} />}
      </div>

      <div className={`flex-1 pb-6 ${step.step === 1 ? '' : '-mt-1'}`}>
        <div className={`rounded-xl p-5 ${step.is_current || step.status === 'rejected' || step.status === 'returned' ? `border-2 ${config.border} ${config.bg}` : 'bg-white'}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className={`text-xs font-medium mb-1 ${step.is_current ? 'text-amber-600' : 'text-slate-400'}`}>
                Step {step.step}
              </p>
              <h4 className="text-base font-semibold text-slate-900">{step.title}</h4>
            </div>
            <div className="flex flex-col items-end gap-1">
              {step.action_date && <span className="text-xs text-slate-400">{step.action_date}</span>}
              <StatusBadge status={step.status} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{step.approver_name || '—'}</p>
              <p className="text-xs text-slate-400">({step.role})</p>
            </div>
          </div>

          {step.is_current && step.pending_since && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-600">
              <Clock className="w-3.5 h-3.5" />
              Pending since {step.pending_since}
            </div>
          )}

          {(step.status === 'rejected' || step.status === 'returned') && step.remarks && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-rose-100/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-rose-700">Remarks</p>
                <p className="text-xs text-rose-600 mt-0.5">{step.remarks}</p>
              </div>
            </div>
          )}

          {step.status === 'approved' && step.remarks && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">{step.remarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ApprovalTimeline = ({ steps }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-slate-900">Approval Tracking</h3>
      <p className="text-sm text-slate-500 mt-1">Track the progress of this request through the approval workflow.</p>
    </div>
    <div>
      {steps.map((step, index) => (
        <TimelineStep
          key={step.step}
          step={step}
          isLast={index === steps.length - 1}
          prevStatus={index > 0 ? steps[index - 1].status : null}
        />
      ))}
    </div>
  </div>
);

// ─── ApprovalStepsTable ─────────────────────────────────────────────────────
// Feeds from: API 11 → data.workflow_steps[]

const ApprovalStepsTable = ({ steps }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
    <div className="px-6 py-4 border-b border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900">Approval Steps Details</h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-6 py-3 font-semibold text-slate-600 w-16">Step</th>
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Approver</th>
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Wing/Section</th>
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Status</th>
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Action Date</th>
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.step} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                  step.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                  : step.is_current ? 'bg-amber-100 text-amber-700'
                  : step.status === 'rejected' || step.status === 'returned' ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-100 text-slate-500'
                }`}>
                  {step.step}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="font-medium text-slate-800">{step.approver_name || '—'}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-slate-600">{step.role}</td>
              <td className="px-6 py-4"><StatusBadge status={step.status} /></td>
              <td className="px-6 py-4 text-slate-500">{step.action_date || '—'}</td>
              <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">{step.remarks || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── ActionPanel ─────────────────────────────────────────────────────────────
// Shown when API 11 returns can_approve: true or can_reject: true
// Calls: API 13 (approve) | API 14 (reject)

const ActionPanel = ({ hashId, canApprove, canReject, onActionComplete }) => {
  const [approveRemarks, setApproveRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [mode, setMode] = useState(null); // 'approve' | 'reject' | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setLoading(true);
    setError('');
    try {
      await RequisitionApprovalApi.approve(hashId, approveRemarks);
      onActionComplete();
    } catch (err) {
      setError(err.message || 'Approval failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (rejectRemarks.trim().length < 10) {
      setError('Rejection reason must be at least 10 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await RequisitionApprovalApi.reject(hashId, rejectRemarks);
      onActionComplete();
    } catch (err) {
      setError(err.message || 'Rejection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!canApprove && !canReject) return null;

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 mt-6">
      <h3 className="text-base font-semibold text-slate-900 mb-1">Your Action Required</h3>
      <p className="text-sm text-slate-500 mb-4">This requisition is currently pending your approval at this step.</p>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {mode === null && (
        <div className="flex gap-3">
          {canApprove && (
            <button
              onClick={() => { setMode('approve'); setError(''); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          )}
          {canReject && (
            <button
              onClick={() => { setMode('reject'); setError(''); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject / Return
            </button>
          )}
        </div>
      )}

      {mode === 'approve' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Remarks <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={approveRemarks}
            onChange={(e) => setApproveRemarks(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Add approval remarks..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm Approval
            </button>
            <button
              onClick={() => { setMode(null); setError(''); }}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'reject' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Rejection Reason <span className="text-rose-500">*</span>
            <span className="text-slate-400 font-normal ml-1">(min 10 characters)</span>
          </label>
          <textarea
            value={rejectRemarks}
            onChange={(e) => { setRejectRemarks(e.target.value); setError(''); }}
            rows={3}
            maxLength={2000}
            placeholder="Provide a reason for rejection or return..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
          />
          <p className="text-xs text-slate-400">
            Rejecting at step 1 permanently rejects this requisition. At higher steps it returns it to the previous step.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Confirm Rejection
            </button>
            <button
              onClick={() => { setMode(null); setError(''); }}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sidebar: StatusOverview ─────────────────────────────────────────────────
// Feeds from: API 11 → data.workflow_steps[]

const StatusOverview = ({ steps }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <h3 className="text-base font-semibold text-slate-900 mb-4">Status Overview</h3>
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const circleColor =
          step.status === 'approved' ? 'bg-emerald-500 text-white'
          : step.is_current ? 'bg-amber-400 text-white'
          : step.status === 'rejected' || step.status === 'returned' ? 'bg-rose-500 text-white'
          : 'bg-slate-200 text-slate-500';
        const lineColor = step.status === 'approved' ? 'bg-emerald-400' : 'bg-slate-200';
        return (
          <div key={step.step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${circleColor}`}>
                {step.step}
              </div>
              {!isLast && <div className={`w-0.5 h-8 ${lineColor}`} />}
            </div>
            <div className="flex items-center justify-between flex-1 min-w-0 pb-4">
              <span className="text-sm font-medium text-slate-700 truncate">{step.title}</span>
              <StatusBadge status={step.status} className="ml-2 shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Sidebar: RequestSummary ─────────────────────────────────────────────────
// Feeds from: API 11 → data.requisition

const getScaleName = (rawScale, gradeOptions) => {
  if (rawScale === null || rawScale === undefined || rawScale === '') return '—';
  if (typeof rawScale === 'object') {
    return rawScale.name || rawScale.grade_name || rawScale.hash_id || rawScale.id || '—';
  }

  const scale = String(rawScale).trim();
  const matchedGrade = gradeOptions.find(
    (grade) => String(grade.id) === scale || String(grade.name) === scale
  );
  return matchedGrade?.name || scale;
};

const RequestSummary = ({ requisition, gradeOptions }) => {
  const fields = [
    { label: 'Request ID', value: requisition.id_display },
    { label: 'Designation', value: requisition.designation },
    { label: 'Department', value: requisition.department },
    { label: 'Scale', value: getScaleName(requisition.scale, gradeOptions) },
    { label: 'Posts', value: requisition.num_posts },
    { label: 'Requested by', value: requisition.requested_by },
    { label: 'Request Date', value: requisition.request_date },
  ];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Request Summary</h3>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between items-start gap-2">
            <span className="text-sm text-slate-500">{f.label}</span>
            <span className="text-sm font-medium text-slate-800 text-right">{f.value ?? '—'}</span>
          </div>
        ))}
        <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-sm text-slate-500">Current Status</span>
          <StatusBadge status={requisition.status} label={requisition.status_label} />
        </div>
      </div>
    </div>
  );
};

// ─── Sidebar: AboutWorkflow ──────────────────────────────────────────────────
// Feeds from: API 11 → data.workflow_info + data.workflow_steps[]

const AboutWorkflow = ({ steps, workflowInfo }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <div className="flex items-center gap-2 mb-3">
      <ClipboardList className="w-4 h-4 text-slate-500" />
      <h3 className="text-base font-semibold text-slate-900">About Workflow</h3>
    </div>
    <p className="text-sm text-slate-500 mb-4">
      Following the{' '}
      <span className="font-medium text-slate-700">{workflowInfo.name}</span>{' '}
      configured by {workflowInfo.configured_by}.
    </p>
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const dotColor =
          step.status === 'approved' ? 'bg-emerald-500'
          : step.is_current ? 'bg-amber-400'
          : step.status === 'rejected' || step.status === 'returned' ? 'bg-rose-500'
          : 'bg-slate-300';
        const lineColor = step.status === 'approved' ? 'bg-emerald-300' : 'bg-slate-200';
        return (
          <div key={step.step} className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
              {!isLast && <div className={`w-0.5 h-8 mt-1 ${lineColor}`} />}
            </div>
            <div className="pb-3">
              <p className="text-sm font-medium text-slate-800">{step.title}</p>
              <p className="text-xs text-slate-400">by {step.role}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── ActivityLogTab ──────────────────────────────────────────────────────────
// Feeds from: API 16 → data[]

const ACTION_COLORS = {
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  returned: 'bg-orange-100 text-orange-700',
  created: 'bg-slate-100 text-slate-600',
};

const ActivityLogTab = ({ hashId }) => {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    RequisitionApprovalApi.getActivityLog(hashId)
      .then((res) => setLog(res.data || []))
      .catch((err) => setError(err.message || 'Failed to load activity log.'))
      .finally(() => setLoading(false));
  }, [hashId]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
      <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
    </div>
  );
  if (error) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-700 text-sm">{error}</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Activity Log</h3>
        {log.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {log.map((entry, index) => {
              const isLast = index === log.length - 1;
              const actionKey = (entry.action || '').toLowerCase();
              const badge = ACTION_COLORS[actionKey] || 'bg-slate-100 text-slate-600';
              return (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${badge}`}>
                      {(entry.action || '?').charAt(0).toUpperCase()}
                    </div>
                    {!isLast && <div className="w-0.5 flex-1 min-h-[32px] bg-slate-100 my-1" />}
                  </div>
                  <div className="flex-1 pb-5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{entry.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {entry.action_by_user_name} · {entry.action_by_role_name}
                          {entry.step_name ? ` · ${entry.step_name}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">
                        {entry.action_at ? new Date(entry.action_at).toLocaleString() : ''}
                      </span>
                    </div>
                    {entry.remarks && (
                      <div className="mt-2 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 italic">
                        "{entry.remarks}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CommentsTab ─────────────────────────────────────────────────────────────
// Feeds from: API 17 (list) | API 18 (add) | API 19 (delete)

const CommentsTab = ({ hashId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchComments = useCallback(() => {
    setLoading(true);
    RequisitionApprovalApi.getComments(hashId)
      .then((res) => { setComments(res.data || []); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load comments.'))
      .finally(() => setLoading(false));
  }, [hashId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handlePost = async () => {
    if (newComment.trim().length < 2) {
      setPostError('Comment must be at least 2 characters.');
      return;
    }
    setPosting(true);
    setPostError('');
    try {
      await RequisitionApprovalApi.addComment(hashId, newComment.trim());
      setNewComment('');
      fetchComments();
    } catch (err) {
      setPostError(err.message || 'Failed to post comment.');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentHashId) => {
    setDeletingId(commentHashId);
    try {
      await RequisitionApprovalApi.deleteComment(hashId, commentHashId);
      setComments((prev) => prev.filter((c) => c.hash_id !== commentHashId));
    } catch (err) {
      alert(err.message || 'Failed to delete comment.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Comments</h3>

        {/* Add comment */}
        <div className="mb-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
          <textarea
            value={newComment}
            onChange={(e) => { setNewComment(e.target.value); setPostError(''); }}
            rows={3}
            maxLength={5000}
            placeholder="Write a comment..."
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          {postError && <p className="text-xs text-rose-600 mt-1">{postError}</p>}
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-slate-400">{newComment.length}/5000</span>
            <button
              onClick={handlePost}
              disabled={posting || newComment.trim().length < 2}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post Comment
            </button>
          </div>
        </div>

        {/* Comment list */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 text-center">{error}</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No comments yet. Be the first to comment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.hash_id} className="flex gap-3 group">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-800">{comment.user_name}</span>
                    <span className="text-xs text-slate-400">{comment.user_role}</span>
                    {comment.is_own && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">You</span>
                    )}
                    <span className="text-xs text-slate-400 ml-auto">
                      {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700 leading-relaxed">
                    {comment.comment}
                  </div>
                </div>
                {comment.is_own && (
                  <button
                    onClick={() => handleDelete(comment.hash_id)}
                    disabled={deletingId === comment.hash_id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-40"
                    title="Delete comment"
                  >
                    {deletingId === comment.hash_id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── RequestDetailsTab ───────────────────────────────────────────────────────
// Feeds from: API 11 → data.requisition (qualification + eligibility)

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-start gap-4 py-3 border-b border-slate-100 last:border-b-0">
    <span className="text-sm text-slate-500 shrink-0">{label}</span>
    <span className="text-sm font-medium text-slate-800 text-right">{value ?? '—'}</span>
  </div>
);

const RequestDetailsTab = ({ requisition }) => {
  const q = requisition.qualification || {};
  const e = requisition.eligibility || {};
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Qualification</h3>
        <DetailRow label="Academic Qualification" value={q.academic_qualification} />
        <DetailRow label="Equivalent Qualification" value={q.equivalent_qualification} />
        <DetailRow label="Minimum Qualification" value={q.min_qualification} />
        <DetailRow label="Experience Type" value={q.experience_type} />
        <DetailRow label="Experience Length" value={q.experience_length} />
        <DetailRow label="Training Institute" value={q.training_institute} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Eligibility</h3>
        <DetailRow label="Age Range" value={e.min_age && e.max_age ? `${e.min_age} – ${e.max_age} years` : null} />
        <DetailRow label="Nationality" value={e.nationality} />

        {e.merit_type === 'open_merit' ? (
          <DetailRow label="Merit Type" value="Open Merit" />
        ) : e.merit_type === 'quota_wise' ? (
          <DetailRow label="Merit Type" value="Quota Based" />
        ) : null}

        <DetailRow label="Gender" value={e.gender_basis} />
        <DetailRow label="Other Conditions" value={e.other_conditions} />
      </div>
    </div>
  );
};

// ─── Main Page Component ────────────────────────────────────────────────────

const RequisitionApprovalTrackPage = () => {
  const navigate = useNavigate();
  const { id: hashId } = useParams(); // route: requisitions/:id/approval-tracking

  const [activeTab, setActiveTab] = useState('approvals');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null); // API 11 full response data
  const [gradeOptions, setGradeOptions] = useState([]);

  const loadDetail = useCallback(() => {
    setLoading(true);
    setError('');
    RequisitionApprovalApi.getDetail(hashId)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err.message || 'Failed to load requisition details.'))
      .finally(() => setLoading(false));
  }, [hashId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  useEffect(() => {
    RequisitionApprovalApi.getGrades()
      .then((res) => {
        const grades = res.data?.data ?? res.data ?? [];
        setGradeOptions(
          (Array.isArray(grades) ? grades : [])
            .filter((grade) => String(grade.status ?? 'active').toLowerCase() === 'active')
            .map((grade) => ({
              id: grade.hash_id || grade.id,
              name: grade.name,
            }))
        );
      })
      .catch(() => setGradeOptions([]));
  }, []);

  if (loading) return <PageSpinner />;
  if (error || !detail) return <PageError message={error || 'No data found.'} onRetry={loadDetail} />;

  const { requisition, workflow_steps, workflow_info, can_approve, can_reject } = detail;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header — API 11: data.requisition */}
      <HeaderSection
        requisition={requisition}
        onBack={() => navigate(-1)}
        onDownload={() => {}}
        onTrackApproval={() => setActiveTab('approvals')}
      />

      <TabsSection activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Approvals tab — API 11: data.workflow_steps, data.workflow_info */}
      {activeTab === 'approvals' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ApprovalTimeline steps={workflow_steps} />
              <ApprovalStepsTable steps={workflow_steps} />
              {/* Action panel — API 13 / API 14 (shown only when user can act) */}
              <ActionPanel
                hashId={hashId}
                canApprove={can_approve}
                canReject={can_reject}
                onActionComplete={loadDetail}
              />
            </div>
            <div className="space-y-6">
              <StatusOverview steps={workflow_steps} />
              <RequestSummary requisition={requisition} gradeOptions={gradeOptions} />
              <AboutWorkflow steps={workflow_steps} workflowInfo={workflow_info} />
            </div>
          </div>
        </div>
      )}

      {/* Details tab — API 11: data.requisition.qualification + eligibility */}
      {activeTab === 'details' && <RequestDetailsTab requisition={requisition} />}

      {/* Activity Log tab — API 16 */}
      {activeTab === 'activity' && <ActivityLogTab hashId={hashId} />}

      {/* Comments tab — API 17, 18, 19 */}
      {activeTab === 'comments' && <CommentsTab hashId={hashId} />}
    </div>
  );
};

export default RequisitionApprovalTrackPage;
