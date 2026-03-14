import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import ApprovalWorkflowService from 'Services/ApprovalWorkflowService';
import { useAuth } from 'context/AuthContext';
import StatusBadge from 'Components/workflow/StatusBadge';
import ApprovalActionDialog from 'Components/workflow/ApprovalActionDialog';

const TABS = {
  CURRENT: 'current',
  COMPLETED: 'completed',
};

const stageValue = (steps, stage, field) => {
  if (!steps || !steps[stage]) return 'N/A';
  return steps[stage][field] || 'N/A';
};

const RoleApprovalInbox = ({ stage, title }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogState, setDialogState] = useState({ open: false, action: 'accept', record: null });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS.CURRENT);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        activeTab === TABS.CURRENT
          ? await ApprovalWorkflowService.getRoleQueue(stage)
          : await ApprovalWorkflowService.getRoleCompleted(stage);

      setRows(
        (data || []).map((item, idx) => ({
          id: item.id || item.hash_id || `${stage}-${idx}`,
          referenceNo: item.referenceNo || item.application_no || item.adv_number || `APP-${idx + 1}`,
          title: item.title || item.note || item.subject || 'Recruitment Application',
          submittedAt: item.submittedAt || item.created_at || item.adv_date,
          currentStage: item.currentStage || item.current_stage || stage,
          workflowStatus: item.workflowStatus || item.workflow_status || 'in_progress',
          roleDecision: stageValue(item.steps || {}, stage, 'status'),
          roleRemarks: stageValue(item.steps || {}, stage, 'remarks'),
          roleActedAt: stageValue(item.steps || {}, stage, 'actedAt'),
          steps: item.steps || {},
          raw: item,
        }))
      );
    } catch (error) {
      toast.error(error.message || `Failed to load ${activeTab} approvals`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, stage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openActionDialog = (record, action) => {
    setDialogState({ open: true, action, record });
  };

  const handleActionSubmit = async (remarks) => {
    if (!dialogState.record) return;

    setSubmitting(true);
    try {
      await ApprovalWorkflowService.takeAction({
        id: dialogState.record.id,
        stage,
        action: dialogState.action,
        remarks,
        actorName: user?.username || user?.name || 'Current User',
        recordMeta: {
          referenceNo: dialogState.record.referenceNo,
          title: dialogState.record.title,
          submittedAt: dialogState.record.submittedAt,
          actorName: user?.username || user?.name || 'Current User',
        },
      });

      toast.success(`Application ${dialogState.action === 'accept' ? 'accepted' : 'rejected'} successfully`);
      setDialogState({ open: false, action: 'accept', record: null });
      await loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to submit action');
    } finally {
      setSubmitting(false);
    }
  };

  const currentColumns = useMemo(
    () => [
      { field: 'referenceNo', headerName: 'Application #', minWidth: 170, flex: 1 },
      { field: 'title', headerName: 'Title/Note', minWidth: 220, flex: 1.4 },
      {
        field: 'submittedAt',
        headerName: 'Submitted',
        minWidth: 140,
        valueFormatter: (params) => (params?.value ? new Date(params.value).toLocaleDateString() : 'N/A'),
      },
      {
        field: 'currentStage',
        headerName: 'Current Stage',
        minWidth: 140,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'workflowStatus',
        headerName: 'Status',
        minWidth: 130,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        minWidth: 220,
        renderCell: (params) => (
          <div className="flex items-center gap-2 py-2">
            <button
              onClick={() => openActionDialog(params.row, 'accept')}
              className="px-3 py-1.5 rounded-md bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800"
            >
              Accept
            </button>
            <button
              onClick={() => openActionDialog(params.row, 'reject')}
              className="px-3 py-1.5 rounded-md bg-rose-700 text-white text-xs font-medium hover:bg-rose-800"
            >
              Reject
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const completedColumns = useMemo(
    () => [
      { field: 'referenceNo', headerName: 'Application #', minWidth: 170, flex: 1 },
      { field: 'title', headerName: 'Title/Note', minWidth: 220, flex: 1.4 },
      {
        field: 'workflowStatus',
        headerName: 'Final Status',
        minWidth: 140,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'roleDecision',
        headerName: 'Your Decision',
        minWidth: 140,
        renderCell: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: 'roleRemarks',
        headerName: 'Your Remarks',
        minWidth: 260,
        flex: 1,
      },
      {
        field: 'roleActedAt',
        headerName: 'Action Time',
        minWidth: 180,
        valueFormatter: (params) =>
          params?.value && params.value !== 'N/A'
            ? new Date(params.value).toLocaleString()
            : 'N/A',
      },
    ],
    []
  );

  const columns = activeTab === TABS.CURRENT ? currentColumns : completedColumns;

  const tabClass = (isActive) =>
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
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === TABS.CURRENT
                  ? 'Only applications currently assigned to your role are shown.'
                  : 'Completed items where you already accepted/rejected are shown.'}
              </p>
            </div>
            <Button onClick={loadData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(TABS.CURRENT)}
              className={tabClass(activeTab === TABS.CURRENT)}
            >
              Current
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(TABS.COMPLETED)}
              className={tabClass(activeTab === TABS.COMPLETED)}
            >
              Completed
            </button>
            <span className="ml-1 text-xs text-slate-500">Showing {rows.length} records</span>
          </div>
        </CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={columns}
            autoHeight
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{ '& .MuiDataGrid-row': { minHeight: '52px !important' } }}
          />
        </CardContent>
      </Card>

      <ApprovalActionDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        record={dialogState.record}
        action={dialogState.action}
        onSubmit={handleActionSubmit}
        submitting={submitting}
      />
    </div>
  );
};

export default RoleApprovalInbox;
