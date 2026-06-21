import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { Menu, MenuItem, IconButton, Switch, Dialog, DialogTitle,TextField,Checkbox,ListItemText, Chip,Box, DialogContent, DialogActions } from '@mui/material';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import {
  Users,
  Search,
  Plus,
  Upload,
  MoreVertical,
  Eye,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import EmployeeDetailsModal from 'components/employees/EmployeeDetailsModal';
import EmployeeService from 'services/EmployeeService';
import { GRID_SX } from 'utils/gridStyles';

const BASE_FILTER_CONFIG = [
  { name: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Filter by full name' },
  { name: 'cnic', label: 'CNIC', type: 'text', placeholder: 'Filter by CNIC' },
  { name: 'email', label: 'Email', type: 'text', placeholder: 'Filter by email' },
  { name: 'mobile', label: 'Mobile Number', type: 'text', placeholder: 'Filter by mobile' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
];

const EMPTY_FILTERS = { full_name: '', cnic: '', email: '', mobile: '', status: '' };

const mapUser = (user, idx) => ({
  id: user?.hash_id || user?.id || `user-${idx}`,
  hash_id: user?.hash_id || user?.id,
  full_name: user?.username || user?.name || user?.full_name || '-',
  cnic: user?.cnic || '-',
  email: user?.email || '-',
  mobile: user?.mobile || user?.phone || '-',
  father_husband_name: user?.father_husband_name || '-',
  designation: Array.isArray(user?.designation) ? user.designation.join(', ') : (user?.designation || '-'),
  scale: user?.scale || user?.grade || '-',
  role: Array.isArray(user?.role_permission) ? user.role_permission.join(', ') : (user?.role || '-'),
  wing: user?.wing || '-',
  status: user?.status || 'inactive',
  status_job: user?.status_job || '-',
});

const ActionCell = ({ employee, onViewDetails, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

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
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
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
        <MenuItem onClick={(e) => { handleClose(e); onViewDetails(employee); }}>
          <Eye className="w-4 h-4" /> View / Edit Details
        </MenuItem>
        <MenuItem
          onClick={(e) => { handleClose(e); onDelete(employee); }}
          sx={{ '&.MuiMenuItem-root': { color: '#dc2626' } }}
        >
          <Trash2 className="w-4 h-4" /> Delete Employee
        </MenuItem>
      </Menu>
    </div>
  );
};

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedHashId, setSelectedHashId] = useState(null);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [wingOptions, setWingOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [selectedWings, setSelectedWings] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const result = await EmployeeService.getUsers({ per_page: 100 });
      setEmployees(result.data.map(mapUser));
    } catch (error) {
      toast.error(error.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();

    const headers = {
      Authorization: `Bearer ${AuthService.getToken()}`,
      Accept: 'application/json',
      'X-API-KEY': Config.apiKey,
    };
    const loadOptions = async () => {
      try {
        const [desigRes, wingsRes, rolesRes] = await Promise.all([
          fetch(`${Config.apiUrl}/settings/designations?per_page=200`, { headers }),
          fetch(`${Config.apiUrl}/settings/wings?per_page=200`, { headers }),
          fetch(`${Config.apiUrl}/settings/roles`, { headers }),
        ]);
        const desigResult = await desigRes.json();
        const wingsResult = await wingsRes.json();
        const rolesResult = await rolesRes.json();
        const wingsList = wingsResult.success ? (wingsResult.data?.data ?? wingsResult.data ?? []) : [];

        setWingOptions(
          wingsList.filter((w) => w.status === 'active' || !w.status)
            .map((w) => ({ id: w.hash_id || String(w.id), name: w.name }))
        );

        if (desigResult.success === true || desigResult.status === 200) {
          setDesignationOptions(
            (desigResult.data?.data ?? desigResult.data ?? [])
              .filter((d) => !['chairman', 'secretary'].includes(d.name?.toLowerCase()))
              .map((d) => {
                let wingName = '';
                if (d.wings) {
                  const wing = wingsList.find((w) => w.hash_id === d.wings || String(w.id) === String(d.wings));
                  wingName = wing?.name || '';
                }
                return { id: d.hash_id, name: d.name, wingName };
              })
          );
        }

        if (rolesResult.success) {
          setRoleOptions(
            (rolesResult.data?.data ?? rolesResult.data ?? [])
              .filter((r) => !r.deleted_at)
              .map((r) => ({ id: r.hash_id, name: r.role_name, permissions: r.permissions || [] }))
          );
        }
      } catch {
        setDesignationOptions([]);
        setWingOptions([]);
        setRoleOptions([]);
      }
    };
    loadOptions();
  }, []);

  const handleToggleStatus = async (employee) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    try {
      await EmployeeService.updateUser(employee.hash_id, { status: newStatus });
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === employee.id ? { ...emp, status: newStatus } : emp))
      );
      toast.success(`${employee.username} marked as ${newStatus}`);
    } catch (error) {
      toast.error(error.message || 'Failed to update employee status');
    }
  };

  const handleViewDetails = (employee) => {
    setSelectedHashId(employee.hash_id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await EmployeeService.deleteEmployee(deleteTarget.hash_id);
      setEmployees((prev) => prev.filter((emp) => emp.id !== deleteTarget.id));
      toast.success(`${deleteTarget.full_name} deleted successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to delete employee');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleEmployeeUpdated = (updated) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.hash_id === updated.hash_id
          ? {
              ...emp,
              full_name: updated.name || updated.full_name || emp.full_name,
              email: updated.email ?? emp.email,
              mobile: updated.mobile ?? emp.mobile,
              father_husband_name: updated.father_husband_name ?? emp.father_husband_name,
              designation: updated.designation ?? emp.designation,
              scale: updated.scale || updated.grade || emp.scale,
              status: updated.status ?? emp.status,
            }
          : emp
      )
    );
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSelectedWings([]);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        emp.full_name?.toLowerCase().includes(term) ||
        emp.cnic?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.mobile?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    if (filters.full_name && !emp.full_name?.toLowerCase().includes(filters.full_name.toLowerCase())) return false;
    if (filters.cnic && !emp.cnic?.toLowerCase().includes(filters.cnic.toLowerCase())) return false;
    if (filters.email && !emp.email?.toLowerCase().includes(filters.email.toLowerCase())) return false;
    if (filters.mobile && !emp.mobile?.toLowerCase().includes(filters.mobile.toLowerCase())) return false;
    if (selectedWings.length > 0) {
      const selectedNames = selectedWings.map((id) => {
        const opt = wingOptions.find((w) => w.id === id);
        return opt?.name?.toLowerCase() || '';
      });
      if (!selectedNames.some((n) => n && emp.wing?.toLowerCase().includes(n))) return false;
    }
    if (filters.status && emp.status !== filters.status) return false;

    return true;
  });

  const activeCount = employees.filter((e) => e.status === 'active').length;
  const inactiveCount = employees.filter((e) => e.status !== 'active').length;

  const columns = [
    { field: 'full_name',   headerName: 'Name',          flex: 1,   minWidth: 160 },
    { field: 'cnic',        headerName: 'CNIC',          flex: 0.8, minWidth: 150 },
    { field: 'email',       headerName: 'Email',         flex: 1,   minWidth: 200 },
    { field: 'mobile',      headerName: 'Mobile', width: 130 },
    { field: 'designation', headerName: 'Designation',   width: 150 },
    { field: 'role',        headerName: 'Role',          width: 150 },
    {
      field: 'permissions',
      headerName: 'Permissions',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const roleName = params.row.role;
        if (!roleName || roleName === '-') return <span className="text-slate-400">—</span>;
        const roleNames = roleName.split(',').map((r) => r.trim());
        const perms = roleNames.flatMap((rn) => {
          const found = roleOptions.find((ro) => ro.name?.toLowerCase() === rn.toLowerCase());
          return found?.permissions || [];
        });
        const unique = [...new Set(perms)];
        if (unique.length === 0) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-0.5 py-1">
            {unique.slice(0, 3).map((p, i) => (
              <span key={i} className="inline-block bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{p}</span>
            ))}
            {unique.length > 3 && <span className="text-[10px] text-slate-500">+{unique.length - 3}</span>}
          </div>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-2">
          <Switch
            checked={params.value === 'active'}
            onChange={() => handleToggleStatus(params.row)}
            inputProps={{ 'aria-label': 'toggle employee status' }}
            size="small"
            color={params.value === 'active' ? 'success' : 'error'}
          />
          <span className={`text-xs font-bold ${params.value === 'active' ? 'text-emerald-700' : 'text-red-600'}`}>
            {params.value === 'active' ? 'Active' : 'Inactive'}
          </span>
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
        <ActionCell employee={params.row} onViewDetails={handleViewDetails} onDelete={setDeleteTarget} />
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-2xl flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
              <p className="text-sm text-slate-500 mt-1">View and manage registered employees</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/dashboard/employees')}>
              <Upload size={16} className="mr-2" />
              Import Employees
            </Button>
            <Button onClick={() => navigate('/dashboard/employees/create')}>
              <Plus size={16} className="mr-2" />
              Register Employee
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">Total Employees</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">{employees.length}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">Active Employees</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">{activeCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">Inactive Employees</p>
              <h2 className="text-3xl font-bold text-red-900 mt-2">{inactiveCount}</h2>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, CNIC, email or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Advanced Filters */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={BASE_FILTER_CONFIG}
          title="Filter Employees"
          extraFilters={
            wingOptions.length > 0 && (
              <TextField
                fullWidth
                select
                label="Wing"
                value={selectedWings}
                size="small"
                SelectProps={{
                  multiple: true,
                  onChange: () => {},
                  renderValue: (selected) => {
                    if (!selected || selected.length === 0) return '';
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                        {selected.map((id) => {
                          const opt = wingOptions.find((w) => w.id === id);
                          return <Chip key={id} label={opt?.name || id} size="small" />;
                        })}
                      </Box>
                    );
                  },
                  MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
                }}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 40, height: 'auto' } }}
              >
                <MenuItem dense onClick={(e) => {
                  e.preventDefault();
                  const allIds = wingOptions.map((w) => w.id);
                  const allSelected = allIds.length > 0 && allIds.every((id) => selectedWings.includes(id));
                  setSelectedWings(allSelected ? [] : allIds);
                }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                  <Checkbox size="small"
                    checked={wingOptions.length > 0 && wingOptions.every((w) => selectedWings.includes(w.id))}
                    indeterminate={wingOptions.some((w) => selectedWings.includes(w.id)) && !wingOptions.every((w) => selectedWings.includes(w.id))}
                    sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
                  />
                  <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
                </MenuItem>
                {wingOptions.map((w) => (
                  <MenuItem key={w.id} dense onClick={(e) => {
                    e.preventDefault();
                    setSelectedWings((prev) =>
                      prev.includes(w.id) ? prev.filter((id) => id !== w.id) : [...prev, w.id]
                    );
                  }}>
                    <Checkbox size="small"
                      checked={selectedWings.includes(w.id)}
                      sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                    />
                    <ListItemText primary={w.name} primaryTypographyProps={{ fontSize: 13 }} />
                  </MenuItem>
                ))}
              </TextField>
            )
          }
        />

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <TooltipDataGrid
            rows={filteredEmployees}
            columns={columns}
            loading={loading}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
            sx={GRID_SX}
          />
        </div>
      </div>

      <EmployeeDetailsModal
        open={!!selectedHashId}
        hashId={selectedHashId}
        onClose={() => setSelectedHashId(null)}
        onUpdated={handleEmployeeUpdated}
      />

      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle className="text-lg font-semibold">Delete Employee</DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={deleting}
            className="!bg-red-600 hover:!bg-red-700 !text-white"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EmployeeList;
