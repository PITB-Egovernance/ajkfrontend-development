import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { Menu, MenuItem, IconButton, Switch, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import toast from 'react-hot-toast';
import { Building2, Search, Plus, MoreVertical, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import DepartmentUserService from 'services/DepartmentUserService';
import DepartmentUserDetailsModal from 'components/departmentUsers/DepartmentUserDetailsModal';
import { GRID_SX } from 'utils/gridStyles';
import confirmStatus from 'components/ui/confirmStatus';
import { hasPermission } from 'utils/permissions';

const PERM = 'settings.department_users';

const FILTER_CONFIG = [
  { name: 'dept_user_name', label: 'Departmen Employee Name', type: 'text', placeholder: 'Filter by name' },
  // { name: 'cnic', label: 'CNIC', type: 'text', placeholder: 'Filter by CNIC' },
  { name: 'email', label: 'Email', type: 'text', placeholder: 'Filter by email' },
  { name: 'mobile', label: 'Mobile', type: 'text', placeholder: 'Filter by mobile' },
  { name: 'department', label: 'Department', type: 'text', placeholder: 'Filter by department' },
  { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
];

const EMPTY_FILTERS = { dept_user_name: '', mobile: '', email: '', department: '', status: '' };

const mapUser = (user, idx) => ({
  id: user?.hash_id || user?.id || `dept-${idx}`,
  hash_id: user?.hash_id || user?.id,
  dept_user_name: user?.dept_user_name || user?.dept_user_name || user?.dept_user_name || '-',
  // cnic: user?.cnic || '-',
  email: user?.email || '-',
  mobile: user?.mobile || user?.phone || '-',

   department:
    user?.department?.department_name ||
    user?.department?.name ||
    user?.department_name ||
    '-',

  department_hash_id:
    user?.department?.hash_id ||
    user?.department_id ||
    '',
  status: user?.status || 'inactive',
});

// const ActionCell = ({ user, onView, onDelete }) => {
//   const [anchorEl, setAnchorEl] = useState(null);
//   return (
//     <div className="flex justify-center items-center h-full w-full">
//       <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}>
//         <MoreVertical size={18} />
//       </IconButton>
//       <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
//         PaperProps={{ elevation: 0, sx: { filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))', mt: 1.5, minWidth: 200, '& .MuiMenuItem-root': { fontSize: '14px', color: '#334155', display: 'flex', gap: '8px', padding: '10px 16px' } } }}
//         transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
//         <MenuItem onClick={() => { setAnchorEl(null); onView(user); }}>
//           <Eye className="w-4 h-4" /> Edit
//         </MenuItem>
//         <MenuItem onClick={() => { setAnchorEl(null); onDelete(user); }} sx={{ '&.MuiMenuItem-root': { color: '#dc2626' } }}>
//           <Trash2 className="w-4 h-4" /> Delete
//         </MenuItem>
//       </Menu>
//     </div>
//   );
// };

const ActionCell = ({ user, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <div className="flex justify-center items-center h-full w-full">
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
      >
        <MoreVertical size={18} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          elevation: 0,
          sx: {
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 1.5,
            minWidth: 200,
            '& .MuiMenuItem-root': {
              fontSize: '14px',
              color: '#334155',
              display: 'flex',
              gap: '8px',
              padding: '10px 16px',
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onEdit(user);
          }}
        >
          <Edit className="w-4 h-4" /> Edit
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onDelete(user);
          }}
          sx={{ '&.MuiMenuItem-root': { color: '#dc2626' } }}
        >
          <Trash2 className="w-4 h-4" /> Delete
        </MenuItem>
      </Menu>
    </div>
  );
};

const DepartmentUserList = () => {
  const navigate = useNavigate();
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedHashId, setSelectedHashId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await DepartmentUserService.getAll({ per_page: 100 });
      setRows(result.data.map(mapUser));
    } catch (error) {
      toast.error(error.message || 'Failed to load department users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleStatus = async (row) => {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    if (!await confirmStatus({ newStatus })) return;
    try {
      await DepartmentUserService.update(row.hash_id, { status: newStatus });
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: newStatus } : r));
      toast.success(`Department Employee marked as ${newStatus}`);
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await DepartmentUserService.delete(deleteTarget.hash_id);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('Department user deleted');
    } catch (error) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleUpdated = (updated) => {
    setRows((prev) => prev.map((r) =>
      r.hash_id === updated.hash_id ? { ...r, full_name: updated.dept_user_name || updated.username || r.full_name, email: updated.email ?? r.email, department: updated.department ?? r.department, status: updated.status ?? r.status } : r
    ));
  };

  const filteredRows = rows.filter((r) => {
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      if (!(r.full_name?.toLowerCase().includes(t) || r.cnic?.toLowerCase().includes(t) || r.email?.toLowerCase().includes(t) || r.department?.toLowerCase().includes(t))) return false;
    }
    if (filters.dept_user_name && !r.dept_user_name?.toLowerCase().includes(filters.dept_user_name.toLowerCase())) return false;
    if (filters.cnic && !r.cnic?.toLowerCase().includes(filters.cnic.toLowerCase())) return false;
    if (filters.email && !r.email?.toLowerCase().includes(filters.email.toLowerCase())) return false;
    if (filters.department && !r.department?.toLowerCase().includes(filters.department.toLowerCase())) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  const activeCount = rows.filter((r) => r.status === 'active').length;
  const inactiveCount = rows.filter((r) => r.status !== 'active').length;

  const columns = [
    { field: 'dept_user_name', headerName: 'Department Employee Name', flex: 1, minWidth: 160 },
    { field: 'department', headerName: 'Department', flex: 0.8, minWidth: 150 },
    // { field: 'cnic', headerName: 'CNIC', flex: 0.8, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'mobile', headerName: 'Mobile', width: 140 },
    {
      field: 'status', headerName: 'Status', width: 140,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-2">
          <Switch checked={params.value === 'active'} onChange={() => handleToggleStatus(params.row)} size="small"
            disabled={!canEdit}
            color={params.value === 'active' ? 'success' : 'error'} />
          {/* <span className={`text-xs font-bold ${params.value === 'active' ? 'text-emerald-700' : 'text-red-600'}`}>
            {params.value === 'active' ? 'Active' : 'Inactive'}
          </span> */}
        </div>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <ActionCell
          user={params.row}
          onEdit={(u) => navigate(`/dashboard/settings/department-users/${u.hash_id}/edit`)}
          onDelete={(u) => setDeleteTarget(u)}
        />
      ),
    }
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto space-y-6" style={{ minWidth: "-webkit-fill-available" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/settings')} className="text-sm text-gray-600 flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-2xl flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Department Users</h1>
              <p className="text-sm text-slate-500 mt-1">Manage department login accounts</p>
            </div>
          </div>
          {canAdd && (
          <Button onClick={() => navigate('/dashboard/settings/department-users/create')}>
            <Plus size={16} className="mr-2" /> Create Department User
          </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">Total</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">{rows.length}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">Active</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">{activeCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">Inactive</p>
              <h2 className="text-3xl font-bold text-red-900 mt-2">{inactiveCount}</h2>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input type="text" placeholder="Search by name, CNIC, email or department..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
        </div>

        <AdvancedFilter filters={filters} onFilterChange={(e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }))}
          onClearFilters={() => setFilters(EMPTY_FILTERS)} filterConfig={FILTER_CONFIG} title="Filter Department Users" />

        <div className="bg-white rounded-lg shadow-sm p-4">
          <TooltipDataGrid rows={filteredRows} columns={columns} loading={loading} autoHeight
            pageSizeOptions={[10, 25, 50]} initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick sx={GRID_SX} />
        </div>
      </div>

      <DepartmentUserDetailsModal open={!!selectedHashId} hashId={selectedHashId}
        onClose={() => setSelectedHashId(null)} onUpdated={handleUpdated} />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="font-semibold">Delete Department User</DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-600">Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This action cannot be undone.</p>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <button onClick={handleDeleteConfirm} disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DepartmentUserList;
