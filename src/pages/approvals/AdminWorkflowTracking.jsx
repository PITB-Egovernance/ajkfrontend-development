import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/Card';
import Button from 'components/ui/Button';
import StatusBadge from 'components/workflow/StatusBadge';
import ApprovalWorkflowService from 'services/ApprovalWorkflowService';
import toast from 'react-hot-toast';
import AdvancedFilter from 'components/tables/AdvancedFilter';

const POLL_INTERVAL_MS = 10000;

const stageValue = (steps, stage, field) => {
  if (!steps || !steps[stage]) return 'N/A';
  return steps[stage][field] || 'N/A';
};

const AdminWorkflowTracking = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [filters, setFilters] = useState({
    referenceNo: '',
    currentStage: '',
    workflowStatus: '',
    directorDecision: '',
    secretaryDecision: '',
    chairmanDecision: ''
  });

  const filterConfig = [
    {
      name: 'referenceNo',
      label: 'Application #',
      type: 'text',
      placeholder: 'Filter by Application #'
    },
    {
      name: 'currentStage',
      label: 'Current Stage',
      type: 'select',
      options: [
        { value: 'director', label: 'Director' },
        { value: 'secretary', label: 'Secretary' },
        { value: 'chairman', label: 'Chairman' },
        { value: 'completed', label: 'Completed' }
      ]
    },
    {
      name: 'workflowStatus',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'in_progress', label: 'In Progress' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      name: 'directorDecision',
      label: 'Director Decision',
      type: 'select',
      options: [
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      name: 'secretaryDecision',
      label: 'Secretary Decision',
      type: 'select',
      options: [
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      name: 'chairmanDecision',
      label: 'Chairman Decision',
      type: 'select',
      options: [
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'pending', label: 'Pending' }
      ]
    }
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      referenceNo: '',
      currentStage: '',
      workflowStatus: '',
      directorDecision: '',
      secretaryDecision: '',
      chairmanDecision: ''
    });
  };

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
      if (filters.referenceNo && !row.referenceNo?.toLowerCase().includes(filters.referenceNo.toLowerCase())) return false;
      if (filters.currentStage && row.currentStage !== filters.currentStage) return false;
      if (filters.workflowStatus && row.workflowStatus !== filters.workflowStatus) return false;
      
      const directorStatus = stageValue(row.steps, 'director', 'status');
      const secretaryStatus = stageValue(row.steps, 'secretary', 'status');
      const chairmanStatus = stageValue(row.steps, 'chairman', 'status');

      if (filters.directorDecision && directorStatus !== filters.directorDecision) return false;
      if (filters.secretaryDecision && secretaryStatus !== filters.secretaryDecision) return false;
      if (filters.chairmanDecision && chairmanStatus !== filters.chairmanDecision) return false;

      return true;
    });
  }, [rows, filters]);

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

          <div className="mt-4">
            <AdvancedFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              filterConfig={filterConfig}
              title="Filter Workflow Tracking"
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">Showing {filteredRows.length} of {rows.length}</span>
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
            sx={{
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
              '& .MuiDataGrid-row': { minHeight: '52px !important' }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWorkflowTracking;
