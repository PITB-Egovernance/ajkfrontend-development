import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'Components/ui/Dialog';
import StatusBadge from 'Components/workflow/StatusBadge';
import ApprovalWorkflowService from 'Services/ApprovalWorkflowService';
import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  Info,
  UserRound,
  XCircle,
  MessageSquareText,
} from 'lucide-react';

const FLOW_STAGES = [
  { key: 'submitted', label: 'Submitted', shortLabel: 'S', eventIcon: FileCheck2 },
  { key: 'director', label: 'Director Review', shortLabel: 'D', eventIcon: UserRound },
  { key: 'secretary', label: 'Secretary Review', shortLabel: 'S', eventIcon: UserRound },
  { key: 'chairman', label: 'Chairman Approval', shortLabel: 'C', eventIcon: UserRound },
];

const REVIEW_STAGES = [
  { key: 'director', label: 'Director Review' },
  { key: 'secretary', label: 'Secretary Review' },
  { key: 'chairman', label: 'Chairman Approval' },
];

const normalizeStatus = (value) => {
  if (!value) return 'pending';
  const key = String(value).toLowerCase();

  if (['approved', 'approve', 'accepted', 'accept'].includes(key)) return 'approved';
  if (['rejected', 'reject'].includes(key)) return 'rejected';
  return 'pending';
};

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
};

const normalizeStep = (step = {}) => ({
  status: normalizeStatus(step?.status || step?.action),
  note: step?.remarks || step?.comment || '',
  actedAt: step?.actedAt || step?.acted_at || step?.created_at || null,
  actedBy:
    step?.actedBy ||
    step?.acted_by_name ||
    step?.actor_name ||
    step?.approved_by ||
    null,
});

const getStageStep = (payload, stage, fallbackStep = {}) => {
  // nested shape: { steps: { director: { status, remarks, acted_at, ... } } }
  const nested = payload?.steps?.[stage] || payload?.[stage];
  const hasNested = nested && typeof nested === 'object' && Object.keys(nested).length > 0;

  // flat shape: { director_status, director_remarks, director_acted_at, ... }
  const flatStatus =
    payload?.[`${stage}_status`] || payload?.[`${stage}Status`] ||
    payload?.[`${stage}_decision`] || payload?.[`${stage}Decision`];
  const flatRemarks =
    payload?.[`${stage}_remarks`] || payload?.[`${stage}Remarks`] ||
    payload?.[`${stage}_comment`] || payload?.[`${stage}Comment`];
  const flatActedAt =
    payload?.[`${stage}_acted_at`] || payload?.[`${stage}ActedAt`] ||
    payload?.[`${stage}_updated_at`] || payload?.[`${stage}UpdatedAt`];
  const flatActedBy =
    payload?.[`${stage}_acted_by`] || payload?.[`${stage}ActedBy`] ||
    payload?.[`${stage}_acted_by_name`] || payload?.[`${stage}ActedByName`];

  // resolve each field in priority order: nested API → flat API → row fallback
  // never let undefined from a higher-priority source overwrite a valid fallback
  return normalizeStep({
    status:
      (hasNested ? nested?.status : undefined) ??
      flatStatus ??
      fallbackStep?.status,
    remarks:
      (hasNested ? (nested?.remarks || nested?.comment) : undefined) ??
      flatRemarks ??
      fallbackStep?.remarks,
    actedAt:
      (hasNested ? (nested?.actedAt || nested?.acted_at) : undefined) ??
      flatActedAt ??
      fallbackStep?.actedAt,
    actedBy:
      (hasNested ? (nested?.actedBy || nested?.acted_by_name) : undefined) ??
      flatActedBy ??
      fallbackStep?.actedBy,
  });
};

const getTimelineTheme = (status) => {
  if (status === 'approved') {
    return {
      icon: CheckCircle2,
      ring: 'ring-emerald-200',
      iconColor: 'text-emerald-700',
      nodeBg: 'bg-emerald-50',
      line: 'bg-emerald-200',
      statusLabel: 'Approved',
      statusPill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  if (status === 'rejected') {
    return {
      icon: XCircle,
      ring: 'ring-rose-200',
      iconColor: 'text-rose-700',
      nodeBg: 'bg-rose-50',
      line: 'bg-rose-200',
      statusLabel: 'Rejected',
      statusPill: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  return {
    icon: Clock3,
    ring: 'ring-slate-200',
    iconColor: 'text-amber-600',
    nodeBg: 'bg-amber-50',
    line: 'bg-slate-200',
    statusLabel: 'Pending',
    statusPill: 'bg-amber-50 text-amber-700 border-amber-200',
  };
};

const getSummaryNodeTheme = (status, isCurrent) => {
  if (status === 'approved') {
    return {
      dot: 'bg-emerald-500 text-white ring-emerald-200',
      line: 'bg-emerald-300',
    };
  }

  if (status === 'rejected') {
    return {
      dot: 'bg-rose-500 text-white ring-rose-200',
      line: 'bg-rose-300',
    };
  }

  if (isCurrent) {
    return {
      dot: 'bg-blue-500 text-white ring-blue-200',
      line: 'bg-slate-200',
    };
  }

  return {
    dot: 'bg-slate-200 text-slate-500 ring-slate-100',
    line: 'bg-slate-200',
  };
};

const WorkflowTimelineDialog = ({ open, onOpenChange, record }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usingCached, setUsingCached] = useState(false);

  useEffect(() => {
    if (!open || !record) return;

    let active = true;
    const hashId = record?.hashId || record?.hash_id || record?.id;

    setUsingCached(false);

    const loadTimeline = async () => {
      setLoading(true);

      try {
        if (!hashId) {
          setHistory(null);
          if (active) setUsingCached(true);
          return;
        }

        const data = await ApprovalWorkflowService.getApprovalHistory(hashId);
        if (active) {
          setHistory(data || null);
          setUsingCached(false);
        }
      } catch {
        // API unavailable (rate-limit, network, etc.) — fall back to row data silently
        if (active) {
          setHistory(null);
          setUsingCached(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadTimeline();

    return () => {
      active = false;
    };
  }, [open, record]);

  const timeline = useMemo(() => {
    if (!record) return [];

    const rowSteps = record?.steps || {};

    // When API history is available use it; otherwise fall back cleanly to row data
    // which is kept fresh by the grid's 10-second polling cycle.
    const payload = !usingCached && history && typeof history === 'object' ? history : null;

    const submittedAt =
      payload?.submitted_at ||
      payload?.created_at ||
      record?.submittedAt ||
      record?.raw?.created_at ||
      null;

    const submittedBy =
      payload?.submitted_by ||
      payload?.submitted_by_name ||
      record?.raw?.submitted_by ||
      record?.raw?.submitted_by_name ||
      'System';

    const submittedEvent = {
      key: 'submitted',
      label: 'Submitted',
      status: 'approved',
      actedAt: submittedAt,
      actedBy: submittedBy,
      note: payload?.submission_note || 'Application entered workflow.',
      eventIcon: FileCheck2,
    };

    const reviewEvents = REVIEW_STAGES.map((stage) => {
      // If API payload available, merge it with row fallback via getStageStep.
      // Otherwise read directly from the normalised row steps (no undefined pollution).
      const step = payload
        ? getStageStep(payload, stage.key, rowSteps?.[stage.key])
        : normalizeStep(rowSteps?.[stage.key] || {});

      return {
        key: stage.key,
        label: stage.label,
        status: step.status,
        actedAt: step.actedAt,
        actedBy: step.actedBy,
        note: step.note,
        eventIcon: UserRound,
      };
    });

    return [submittedEvent, ...reviewEvents];
  }, [history, usingCached, record]);

  const currentSummary = useMemo(() => {
    const activeStage = timeline.find((event) => event.status === 'pending' && event.key !== 'submitted');
    const rejectedStage = timeline.find((event) => event.status === 'rejected');

    if (rejectedStage) {
      return {
        title: 'Workflow rejected',
        subtitle: `${rejectedStage.label} returned this request.`,
      };
    }

    if (activeStage) {
      return {
        title: 'Current status',
        subtitle: `Waiting for ${activeStage.label}`,
      };
    }

    return {
      title: 'Current status',
      subtitle: 'Workflow completed',
    };
  }, [timeline]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] w-[98vw] max-w-[92rem] overflow-hidden border border-slate-200 p-0 shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 px-8 py-7 xl:px-10 xl:py-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900 xl:text-[2rem]">
                Workflow Timeline
              </DialogTitle>
              <DialogDescription className="max-w-3xl text-sm leading-6 text-slate-600 xl:text-base">
                {record?.referenceNo || 'Application'}
                {record?.title ? ` - ${record.title}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Current Stage</span>
              <StatusBadge value={record?.currentStage || 'pending'} />
              <span className="ml-0 text-xs font-medium uppercase tracking-wide text-slate-400 xl:ml-3">Workflow</span>
              <StatusBadge value={record?.workflowStatus || 'pending'} />
            </div>
          </div>
        </div>

        <div className="h-[calc(92vh-118px)] overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))] px-8 py-7 xl:px-10 xl:py-8">
          {loading && (
            <div className="space-y-4">
              <div className="h-5 w-44 rounded bg-slate-200 animate-pulse" />
              <div className="h-48 rounded-3xl border border-slate-200 bg-slate-100/60 animate-pulse" />
              <div className="h-32 rounded-3xl border border-slate-200 bg-slate-100/60 animate-pulse" />
              <div className="h-32 rounded-3xl border border-slate-200 bg-slate-100/60 animate-pulse" />
            </div>
          )}

          {!loading && usingCached && (
            <div >
            </div>
          )}

          {!loading && (
            <div className="space-y-8">
              <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
                <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-sm xl:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Request workflow</p>
                      <p className="mt-1 text-sm text-slate-500">A quick summary of the current approval progress across stages.</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.75rem] border border-blue-100 bg-white/85 px-6 py-6 shadow-inner xl:px-7 xl:py-7">
                    <p className="text-base font-semibold text-slate-900">{currentSummary.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{currentSummary.subtitle}</p>

                    <div className="mt-8 overflow-x-auto overflow-y-visible px-2 py-3">
                      <div className="relative min-w-[620px]">
                        <div className="absolute left-[12%] right-[12%] top-6 border-t-2 border-dashed border-slate-300" />

                        <div className="relative z-10 grid grid-cols-4 gap-3">
                          {FLOW_STAGES.map((stage) => {
                        const event = timeline.find((item) => item.key === stage.key);
                        const isCurrent =
                          event?.status === 'pending' &&
                          !timeline.some((item) => item.key !== 'submitted' && item.status === 'rejected');
                        const nodeTheme = getSummaryNodeTheme(event?.status, isCurrent);
                        const EventIcon = stage.eventIcon;

                        return (
                          <div key={stage.key} className="flex min-w-[132px] flex-col items-center text-center overflow-visible">
                              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-4 shadow-sm ${nodeTheme.dot}`}>
                                <EventIcon className="h-5 w-5" />
                              </div>
                              <p className="mt-3 text-xs font-semibold leading-5 text-slate-700 xl:text-sm">{stage.label}</p>
                          </div>
                        );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:p-7">
                  <p className="text-sm font-semibold text-slate-900">Request details</p>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Application</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{record?.referenceNo || 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Title</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{record?.title || 'Recruitment application'}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current stage</p>
                        <div className="mt-3"><StatusBadge value={record?.currentStage || 'pending'} /></div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Workflow</p>
                        <div className="mt-3"><StatusBadge value={record?.workflowStatus || 'pending'} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-5 text-sm font-semibold text-slate-900">Activity timeline</p>
              </div>

              <div className="space-y-1">
                {timeline.map((event, index) => {
                  const isLast = index === timeline.length - 1;
                  const theme = getTimelineTheme(event.status);
                  const StatusIcon = theme.icon;
                  const EventIcon = event.eventIcon;

                  return (
                    <div key={event.key} className="grid grid-cols-[64px_1fr] gap-6 xl:grid-cols-[76px_1fr] xl:gap-7">
                      <div className="relative flex justify-center pt-1">
                        {!isLast && <span className={`absolute top-16 bottom-0 w-[2px] ${theme.line}`} />}
                        <div className={`mt-1 flex h-12 w-12 items-center justify-center rounded-full ${theme.nodeBg} ring-4 ${theme.ring} shadow-sm xl:h-14 xl:w-14`}>
                          <EventIcon className={`h-5 w-5 ${theme.iconColor} xl:h-6 xl:w-6`} />
                        </div>
                      </div>

                      <div className="pb-7">
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md xl:p-7">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1.5">
                              <h4 className="text-lg font-semibold tracking-tight text-slate-900">{event.label}</h4>
                              <p className="text-sm leading-6 text-slate-500">{formatDateTime(event.actedAt)}</p>
                            </div>
                            <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${theme.statusPill}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {theme.statusLabel}
                            </span>
                          </div>

                          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 px-4 py-4">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Performed by</p>
                              <p className="mt-2 flex items-center gap-2 text-sm font-medium leading-6 text-slate-700">
                                <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                                {event.actedBy || 'Not assigned'}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-4">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Updated at</p>
                              <p className="mt-2 flex items-center gap-2 text-sm font-medium leading-6 text-slate-700">
                                <Clock3 className="h-4 w-4 shrink-0 text-slate-400" />
                                {formatDateTime(event.actedAt)}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-4 sm:col-span-2 xl:col-span-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Stage key</p>
                              <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{event.key}</p>
                            </div>
                          </div>

                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 xl:px-5">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Comment / note</p>
                            <p className="mt-2 flex items-start gap-2 text-sm leading-7 text-slate-700">
                              <MessageSquareText className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                              <span>{event.note || 'No comments provided.'}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowTimelineDialog;
