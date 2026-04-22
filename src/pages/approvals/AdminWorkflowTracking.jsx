import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from 'Components/ui/tooltip';
import StatusBadge from 'Components/workflow/StatusBadge';
import WorkflowTimelineDialog from 'Components/workflow/WorkflowTimelineDialog';
import ApprovalWorkflowService from 'Services/ApprovalWorkflowService';
import toast from 'react-hot-toast';

const formatDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
};

const POLL_INTERVAL_MS = 10000;
const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STAGE_TABS = [
  { key: 'all', label: 'All Stages' },
  { key: 'director', label: 'Director' },
  { key: 'secretary', label: 'Secretary' },
  { key: 'chairman', label: 'Chairman' },
  { key: 'completed', label: 'Completed' },
];



const AdminWorkflowTracking = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await ApprovalWorkflowService.getAdminTracking();
      setRows(
        (data || []).map((item, idx) => ({
          id: item.id || item.hash_id || `admin-wf-${idx}`,
          hashId: item.hash_id || item.id || null,
          referenceNo: item.referenceNo || item.application_no || item.adv_number || `APP-${idx + 1}`,
          title: item.title || item.note || item.subject || item.important_notes || 'Recruitment application',
          submittedAt: item.submittedAt || item.created_at || item.adv_date || null,
          currentStage: item.currentStage || item.current_stage || 'director',
          workflowStatus: item.workflowStatus || item.workflow_status || 'pending',
          finalDecision: item.finalDecision || item.final_decision || 'pending',
          steps: item.steps || {},
          raw: item.raw || item,
        }))
      );
      setLastUpdatedAt(new Date());
    } catch (error) {
      if (!silent) {
        toast.error(error.message || 'Failed to load tracking data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const intervalId = setInterval(() => {
      loadData({ silent: true });
    }, POLL_INTERVAL_MS);

    const handleFocus = () => loadData({ silent: true });
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData({ silent: true });
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  const handleViewTimeline = useCallback((record) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      {
        field: 'referenceNo',
        headerName: 'Advertisement #',
        minWidth: 160,
        flex: 1,
      },
      {
        field: 'title',
        headerName: 'Advertisement Title',
        minWidth: 220,
        flex: 1.6,
      },
      {
        field: 'submittedAt',
        headerName: 'Adv. Date',
        minWidth: 120,
        valueFormatter: (params) => formatDate(params?.value),
      },
      {
        field: 'currentStage',
        headerName: 'Current Stage',
        minWidth: 150,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'workflowStatus',
        headerName: 'Status',
        minWidth: 140,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'finalDecision',
        headerName: 'Final Decision',
        minWidth: 150,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <TooltipProvider delayDuration={180}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleViewTimeline(params.row)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700 hover:shadow"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View timeline</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">View workflow timeline</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
    ],
    [handleViewTimeline]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const byStatus = statusFilter === 'all' || row.workflowStatus === statusFilter;
      const byStage = stageFilter === 'all' || row.currentStage === stageFilter;
      return byStatus && byStage;
    });
  }, [rows, statusFilter, stageFilter]);

  const getTabButtonClass = (isActive) =>
    [
      'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
      isActive
        ? 'bg-emerald-700 text-white shadow-sm'
        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
    ].join(' ');

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Admin Workflow Tracking</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Complete status, stage progression, remarks, and final decisions.</p>
              <p className="text-xs text-slate-400 mt-1">
                Auto-refresh every {POLL_INTERVAL_MS / 1000}s
                {lastUpdatedAt ? ` • Last update: ${lastUpdatedAt.toLocaleTimeString()}` : ''}
              </p>
            </div>
            <Button onClick={loadData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={getTabButtonClass(statusFilter === tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Stage:</span>
            {STAGE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStageFilter(tab.key)}
                className={getTabButtonClass(stageFilter === tab.key)}
              >
                {tab.label}
              </button>
            ))}
            <span className="ml-1 text-xs text-slate-500">Showing {filteredRows.length} of {rows.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loading}
            autoHeight
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            sx={{ '& .MuiDataGrid-row': { minHeight: '52px !important' } }}
          />
        </CardContent>
      </Card>

      <WorkflowTimelineDialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setSelectedRecord(null);
        }}
        record={selectedRecord}
      />
    </div>
  );
};

export default AdminWorkflowTracking;
