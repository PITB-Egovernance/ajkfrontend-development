import React, { useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Card, CardContent, CardHeader, CardTitle } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import StatusBadge from 'Components/workflow/StatusBadge';
import ApprovalWorkflowService from 'Services/ApprovalWorkflowService';
import toast from 'react-hot-toast';

const stageValue = (steps, stage, field) => {
  if (!steps || !steps[stage]) return 'N/A';
  return steps[stage][field] || 'N/A';
};

const AdminWorkflowTracking = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
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
    } catch (error) {
      toast.error(error.message || 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Admin Workflow Tracking</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Complete status, stage progression, remarks, and final decisions.</p>
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
