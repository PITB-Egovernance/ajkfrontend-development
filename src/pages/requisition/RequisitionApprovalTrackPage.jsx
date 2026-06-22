import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

// ─── Dummy Data (replace with API response later) ──────────────────────────

const REQUEST_DATA = {
  id: 'REQ-2024-0001',
  position: 'Digital Marketing Manager',
  department: 'Marketing',
  requestedBy: 'John Doe',
  requestDate: '15 May 2024',
  currentStatus: 'Pending',
  overallStatus: 'Submitted',
};

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Vacancy Submitted',
    approverName: 'John Doe',
    role: 'Requestor',
    status: 'approved',
    actionDate: '15 May 2024, 09:30 AM',
    pendingSince: null,
    remarks: 'Vacancy submitted',
    isCurrent: false,
  },
  {
    step: 2,
    title: 'HR Approval',
    approverName: 'Sarah Johnson',
    role: 'HR Manager',
    status: 'approved',
    actionDate: '15 May 2024, 10:15 AM',
    pendingSince: null,
    remarks: 'Looks good to me.',
    isCurrent: false,
  },
  {
    step: 3,
    title: 'CEO Approval',
    approverName: 'Michael Brown',
    role: 'CEO',
    status: 'pending',
    actionDate: null,
    pendingSince: '15 May 2024, 10:15 AM',
    remarks: null,
    isCurrent: true,
  },
  {
    step: 4,
    title: 'Final Approval',
    approverName: 'Emily Davis',
    role: 'Operations Director',
    status: 'pending',
    actionDate: null,
    pendingSince: null,
    remarks: null,
    isCurrent: false,
  },
];

const WORKFLOW_INFO = {
  name: 'Standard Approval Workflow',
  configuredBy: 'admin',
};

// ─── StatusBadge ────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
  submitted: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const StatusBadge = ({ status, className = '' }) => {
  const key = (status || '').toLowerCase();
  const style = STATUS_STYLES[key] || 'bg-slate-100 text-slate-600 border border-slate-200';
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}>
      {label}
    </span>
  );
};

// ─── HeaderSection ──────────────────────────────────────────────────────────

const HeaderSection = ({ request, onBack, onDownload, onTrackApproval }) => (
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
            <h1 className="text-2xl font-bold text-slate-900">{request.position}</h1>
            <StatusBadge status={request.overallStatus} />
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 flex-wrap">
            <span>Request ID: {request.id}</span>
            <span className="text-slate-300">•</span>
            <span>Department: {request.department}</span>
            <span className="text-slate-300">•</span>
            <span>Requested by: {request.requestedBy}</span>
            <span className="text-slate-300">•</span>
            <span>{request.requestDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
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
          </button>
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

const getTimelineStepConfig = (status, isCurrent) => {
  if (status === 'approved') {
    return {
      circleClasses: 'bg-emerald-500 text-white',
      borderClasses: '',
      bgClasses: '',
      lineColor: 'bg-emerald-400',
      Icon: CheckCircle,
    };
  }
  if (status === 'rejected') {
    return {
      circleClasses: 'bg-rose-500 text-white',
      borderClasses: 'border-rose-200',
      bgClasses: 'bg-rose-50',
      lineColor: 'bg-rose-300',
      Icon: XCircle,
    };
  }
  if (isCurrent) {
    return {
      circleClasses: 'bg-amber-400 text-white',
      borderClasses: 'border-amber-300',
      bgClasses: 'bg-amber-50/60',
      lineColor: 'bg-slate-200',
      Icon: Clock,
    };
  }
  return {
    circleClasses: 'bg-slate-200 text-slate-400',
    borderClasses: '',
    bgClasses: '',
    lineColor: 'bg-slate-200',
    Icon: Clock,
  };
};

const TimelineStep = ({ step, isLast, prevStatus }) => {
  const config = getTimelineStepConfig(step.status, step.isCurrent);
  const { Icon } = config;

  const connectorColor =
    prevStatus === 'approved' ? 'bg-emerald-400' : 'bg-slate-200';

  return (
    <div className="relative flex gap-5">
      {/* Vertical line + circle */}
      <div className="flex flex-col items-center">
        {/* Connector from previous step */}
        {step.step > 1 && (
          <div className={`w-0.5 h-5 ${connectorColor}`} />
        )}
        {/* Circle */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${config.circleClasses}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {/* Connector to next step */}
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[40px] ${config.lineColor}`} />
        )}
      </div>

      {/* Content card */}
      <div className={`flex-1 pb-6 ${step.step === 1 ? '' : '-mt-1'}`}>
        <div
          className={`rounded-xl p-5 ${
            step.isCurrent
              ? `border-2 ${config.borderClasses} ${config.bgClasses}`
              : step.status === 'rejected'
              ? `border-2 ${config.borderClasses} ${config.bgClasses}`
              : 'bg-white'
          }`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className={`text-xs font-medium mb-1 ${step.isCurrent ? 'text-amber-600' : 'text-slate-400'}`}>
                Step {step.step}
              </p>
              <h4 className="text-base font-semibold text-slate-900">{step.title}</h4>
            </div>
            <div className="flex flex-col items-end gap-1">
              {step.actionDate && (
                <span className="text-xs text-slate-400">{step.actionDate}</span>
              )}
              <StatusBadge status={step.status} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{step.approverName}</p>
              <p className="text-xs text-slate-400">({step.role})</p>
            </div>
          </div>

          {step.isCurrent && step.pendingSince && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-600">
              <Clock className="w-3.5 h-3.5" />
              Pending since {step.pendingSince}
            </div>
          )}

          {step.status === 'rejected' && step.remarks && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-rose-100/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-rose-700">Rejection Remarks</p>
                <p className="text-xs text-rose-600 mt-0.5">{step.remarks}</p>
                <p className="text-xs text-rose-400 mt-1">Returned to previous step</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ApprovalTimeline ───────────────────────────────────────────────────────

const ApprovalTimeline = ({ steps }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-slate-900">Approval Tracking</h3>
      <p className="text-sm text-slate-500 mt-1">
        Track the progress of this request through the approval workflow.
      </p>
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
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Role</th>
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Status</th>
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Action Date</th>
            <th className="text-left px-6 py-3 font-semibold text-slate-600">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.step} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    step.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : step.isCurrent
                      ? 'bg-amber-100 text-amber-700'
                      : step.status === 'rejected'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.step}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="font-medium text-slate-800">{step.approverName}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-slate-600">{step.role}</td>
              <td className="px-6 py-4">
                <StatusBadge status={step.status} />
              </td>
              <td className="px-6 py-4 text-slate-500">{step.actionDate || '-'}</td>
              <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">
                {step.remarks || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── StatusOverview (Right Sidebar) ─────────────────────────────────────────

const StatusOverview = ({ steps }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <h3 className="text-base font-semibold text-slate-900 mb-4">Status Overview</h3>
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const circleColor =
          step.status === 'approved'
            ? 'bg-emerald-500 text-white'
            : step.isCurrent
            ? 'bg-amber-400 text-white'
            : step.status === 'rejected'
            ? 'bg-rose-500 text-white'
            : 'bg-slate-200 text-slate-500';
        const lineColor =
          step.status === 'approved'
            ? 'bg-emerald-400'
            : 'bg-slate-200';
        return (
          <div key={step.step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${circleColor}`}
              >
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

// ─── RequestSummary (Right Sidebar) ─────────────────────────────────────────

const RequestSummary = ({ request }) => {
  const fields = [
    { label: 'Request ID', value: request.id },
    { label: 'Position', value: request.position },
    { label: 'Department', value: request.department },
    { label: 'Requested by', value: request.requestedBy },
    { label: 'Request Date', value: request.requestDate },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Request Summary</h3>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between items-start gap-2">
            <span className="text-sm text-slate-500">{f.label}</span>
            <span className="text-sm font-medium text-slate-800 text-right">{f.value}</span>
          </div>
        ))}
        <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-sm text-slate-500">Current Status</span>
          <StatusBadge status={request.currentStatus} />
        </div>
      </div>
    </div>
  );
};

// ─── AboutWorkflow (Right Sidebar) ──────────────────────────────────────────

const AboutWorkflow = ({ steps, workflowInfo }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <div className="flex items-center gap-2 mb-3">
      <ClipboardList className="w-4.5 h-4.5 text-slate-500" />
      <h3 className="text-base font-semibold text-slate-900">About Workflow</h3>
    </div>
    <p className="text-sm text-slate-500 mb-4">
      This request is following the <span className="font-medium text-slate-700">{workflowInfo.name}</span> configured by {workflowInfo.configuredBy}.
    </p>
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const dotColor =
          step.status === 'approved'
            ? 'bg-emerald-500'
            : step.isCurrent
            ? 'bg-amber-400'
            : step.status === 'rejected'
            ? 'bg-rose-500'
            : 'bg-slate-300';
        const lineColor =
          step.status === 'approved'
            ? 'bg-emerald-300'
            : 'bg-slate-200';
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

// ─── Placeholder tabs ──────────────────────────────────────────────────────

const PlaceholderTab = ({ title, icon: Icon }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
      <Icon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500">This section will display {title.toLowerCase()} content.</p>
    </div>
  </div>
);

// ─── Main Page Component ────────────────────────────────────────────────────

/**
 * RequisitionApprovalTrackPage
 *
 * API INTEGRATION GUIDE:
 * ──────────────────────
 * 1. Replace REQUEST_DATA with your API response for requisition details.
 *    Example: const [request, setRequest] = useState(null);
 *    Then fetch in useEffect and setRequest(apiResponse).
 *
 * 2. Replace WORKFLOW_STEPS with your API response for workflow steps.
 *    The API should return an array of step objects matching this shape:
 *    { step, title, approverName, role, status, actionDate, pendingSince, remarks, isCurrent }
 *
 * 3. Replace WORKFLOW_INFO with API data about the workflow config.
 *
 * 4. The `isCurrent` field should be computed: find the first step with
 *    status === 'pending' and mark it as isCurrent = true.
 *
 * 5. For rejected steps, the API should include rejection remarks and
 *    indicate which step it was returned to.
 */
const RequisitionApprovalTrackPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('approvals');

  // TODO: Replace with API calls
  const request = REQUEST_DATA;
  const workflowSteps = WORKFLOW_STEPS;
  const workflowInfo = WORKFLOW_INFO;

  const handleBack = () => navigate(-1);
  const handleDownload = () => {};
  const handleTrackApproval = () => setActiveTab('approvals');

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderSection
        request={request}
        onBack={handleBack}
        onDownload={handleDownload}
        onTrackApproval={handleTrackApproval}
      />

      <TabsSection activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'approvals' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left main column */}
            <div className="lg:col-span-2">
              <ApprovalTimeline steps={workflowSteps} />
              <ApprovalStepsTable steps={workflowSteps} />
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              <StatusOverview steps={workflowSteps} />
              <RequestSummary request={request} />
              <AboutWorkflow steps={workflowSteps} workflowInfo={workflowInfo} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && <PlaceholderTab title="Request Details" icon={FileText} />}
      {activeTab === 'activity' && <PlaceholderTab title="Activity Log" icon={Activity} />}
      {activeTab === 'comments' && <PlaceholderTab title="Comments" icon={MessageSquare} />}
    </div>
  );
};

export default RequisitionApprovalTrackPage;
