import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import ApprovalWorkflowService from 'Services/ApprovalWorkflowService';
import { useAuth } from 'context/AuthContext';
import StatusBadge from 'Components/workflow/StatusBadge';
import ApprovalActionDialog from 'Components/workflow/ApprovalActionDialog';

const RoleApprovalInbox = ({ stage, title }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogState, setDialogState] = useState({ open: false, action: 'accept', record: null });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApprovalWorkflowService.getRoleQueue(stage);
      setRows(
        (data || []).map((item, idx) => ({
          id: item.id || item.hash_id || `${stage}-${idx}`,
          referenceNo: item.referenceNo || item.application_no || item.adv_number || `APP-${idx + 1}`,
          title: item.title || item.note || item.subject || 'Recruitment Application',
          submittedAt: item.submittedAt || item.created_at || item.adv_date,
          currentStage: item.currentStage || item.current_stage || stage,
          workflowStatus: item.workflowStatus || item.workflow_status || 'in_progress',
          steps: item.steps || {},
          raw: item,
        }))
      );
    } catch (error) {
      toast.error(error.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [stage]);

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

  const columns = useMemo(
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

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Only applications currently assigned to your role are shown.</p>
            </div>
            <Button onClick={loadData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
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
