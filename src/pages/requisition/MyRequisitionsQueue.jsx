import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MenuItem, IconButton } from '@mui/material';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { InlineLoader } from 'components/ui/Loader';
import { Inbox, Clock, CornerUpLeft, CheckCircle2, MoreVertical, Eye, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';
import RequisitionApprovalApi from 'api/requisitionApprovalApi';

const TABS = [
  { key: 'assigned',  label: 'My Assigned',     icon: Inbox },
  { key: 'pending',   label: 'Pending Actions', icon: Clock },
  { key: 'returned',  label: 'Returned Cases',  icon: CornerUpLeft },
  { key: 'completed', label: 'Completed Cases', icon: CheckCircle2 },
];

const statusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('approved')) return 'bg-emerald-100 text-emerald-700';
  if (s.includes('rejected')) return 'bg-rose-100 text-rose-700';
  if (s.includes('progress') || s.includes('pending')) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const getWorkflowStatusLabel = (workflowStatus, requisitionStatus) => {
  const status = String(workflowStatus || '').trim().toLowerCase();

  if (status === 'in_progress') return 'In Progress';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';

  return requisitionStatus || '—';
};

const MyRequisitionsQueue = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('assigned');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const openMenu = (e, row) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const closeMenu = () => setAnchorEl(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await RequisitionApprovalApi.myQueue(tab);
      const list = res?.data?.data ?? res?.data ?? [];
      const mapped = (Array.isArray(list) ? list : []).map((r, i) => ({
        id: r.hash_id || r.id || `row-${i}`,
        hash_id: r.hash_id || r.id,
        designation: r.designation || '—',
        department: (() => {
          // Department can arrive at the top level or nested on the job detail,
          // and as a string or a relation object — normalise all of them.
          const raw = r.department ?? r.department_name ?? r.job_detail?.department
            ?? r.jobDetail?.department ?? r.requisition?.department ?? r.job?.department ?? '';
          if (raw && typeof raw === 'object') return raw.department_name || raw.name || '—';
          return raw || '—';
        })(),
        case_number: r.case_number || r.hash_id || '—',
        current_step: r.current_step ?? '—',
        status: getWorkflowStatusLabel(r.workflow_status, r.requisition_status),
        created_at: r.created_at ? new Date(r.created_at).toLocaleDateString() : '—',
      }));
      setRows(mapped);
    } catch (err) {
      toast.error(err.message || 'Failed to load your requisitions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const openTracking = (row) =>
    navigate(`/dashboard/requisitions/${row.hash_id}/approval-tracking`);

  const openView = (row) =>
    navigate(`/dashboard/requisitions/${row.hash_id}`);

  const columns = [
    { field: 'case_number', headerName: 'Ref / Case #', width: 160 },
    { field: 'designation', headerName: 'Designation', flex: 1, minWidth: 160 },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 160 },
    { field: 'current_step', headerName: 'Step', width: 80 },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (p) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(p.value)}`}>
          {p.value}
        </span>
      ),
    },
    { field: 'created_at', headerName: 'Received', width: 120 },
    {
      field: 'actions',
      headerName: 'Action',
      width: 90,
      sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => openMenu(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Requisitions</h1>
          <p className="text-sm text-slate-500 mt-1">Requisitions assigned to you for approval.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gradient-to-br from-emerald-950 to-emerald-900 text-white shadow'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <InlineLoader text="Loading your requisitions..." variant="ring" size="lg" />
          ) : (
            <TooltipDataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50]}
              rowCount={rows.length}
              loading={loading}
              disableRowSelectionOnClick
              autoHeight
              onRowClick={(params) => openTracking(params.row)}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
                '& .MuiDataGrid-cell': { borderBottom: '1px solid #f1f5f9' },
                '& .MuiDataGrid-row:hover': { backgroundColor: '#f8fafc', cursor: 'pointer' },
                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold', color: '#475569' },
              }}
            />
          )}
        </div>

        {/* Row action menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={closeMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{ elevation: 0, sx: { filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.12))', mt: 1, minWidth: 210, '& .MuiMenuItem-root': { fontSize: '14px', display: 'flex', gap: '8px', padding: '10px 16px' } } }}
        >
          <MenuItem onClick={() => { openView(selectedRow); closeMenu(); }}>
            <Eye size={16} /> View Requisition
          </MenuItem>
          <MenuItem onClick={() => { openTracking(selectedRow); closeMenu(); }} sx={{ '&.MuiMenuItem-root': { color: '#047857' } }}>
            <GitBranch size={16} /> Open Approval
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
};

export default MyRequisitionsQueue;
