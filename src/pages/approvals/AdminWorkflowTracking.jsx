import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Card, CardContent, CardHeader, CardTitle } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import StatusBadge from 'Components/workflow/StatusBadge';
import ApprovalWorkflowService from 'Services/ApprovalWorkflowService';
import toast from 'react-hot-toast';

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

const stageValue = (steps, stage, field) => {
  if (!steps || !steps[stage]) return 'N/A';
  return steps[stage][field] || 'N/A';
};

const AdminWorkflowTracking = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await ApprovalWorkflowService.getAdminTracking();
      setRows(
        (data || []).map((item, idx) => ({
          id: item.id || item.hash_id || `admin-wf-${idx}`,
          referenceNo: item.referenceNo || item.application_no || item.adv_number || `APP-${idx + 1}`,
          currentStage: item.currentStage || item.current_stage || 'director',
          workflowStatus: item.workflowStatus || item.workflow_status || 'pending',
          finalDecision: item.finalDecision || item.final_decision || 'pending',
          steps: item.steps || {},
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

  const columns = useMemo(
    () => [
      { field: 'referenceNo', headerName: 'Application #', minWidth: 170, flex: 1 },
      {
        field: 'currentStage',
        headerName: 'Current Stage',
        minWidth: 130,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'workflowStatus',
        headerName: 'Status',
        minWidth: 130,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'directorDecision',
        headerName: 'Director',
        minWidth: 130,
        valueGetter: (params) => stageValue(params.row.steps, 'director', 'status'),
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'secretaryDecision',
        headerName: 'Secretary',
        minWidth: 130,
        valueGetter: (params) => stageValue(params.row.steps, 'secretary', 'status'),
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'chairmanDecision',
        headerName: 'Chairman',
        minWidth: 130,
        valueGetter: (params) => stageValue(params.row.steps, 'chairman', 'status'),
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'directorRemarks',
        headerName: 'Director Remarks',
        minWidth: 180,
        flex: 1,
        valueGetter: (params) => stageValue(params.row.steps, 'director', 'remarks'),
      },
      {
        field: 'secretaryRemarks',
        headerName: 'Secretary Remarks',
        minWidth: 180,
        flex: 1,
        valueGetter: (params) => stageValue(params.row.steps, 'secretary', 'remarks'),
      },
      {
        field: 'chairmanRemarks',
        headerName: 'Chairman Remarks',
        minWidth: 180,
        flex: 1,
        valueGetter: (params) => stageValue(params.row.steps, 'chairman', 'remarks'),
      },
      {
        field: 'finalDecision',
        headerName: 'Final Decision',
        minWidth: 140,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
    ],
    []
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
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{ '& .MuiDataGrid-row': { minHeight: '52px !important' } }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWorkflowTracking;
