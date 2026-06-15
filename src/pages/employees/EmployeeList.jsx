import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { Menu, MenuItem, IconButton, Switch } from '@mui/material';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Plus,
  Upload,
  MoreVertical,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import EmployeeDetailsModal from 'components/employees/EmployeeDetailsModal';
import EmployeeService from 'services/EmployeeService';

const FILTER_CONFIG = [
  { name: 'username', label: 'Username', type: 'text', placeholder: 'Filter by username' },
  { name: 'cnic', label: 'CNIC', type: 'text', placeholder: 'Filter by CNIC' },
  { name: 'email', label: 'Email', type: 'text', placeholder: 'Filter by email' },
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

const EMPTY_FILTERS = { username: '', cnic: '', email: '', status: '' };

const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc' },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
  '& .MuiDataGrid-row': { minHeight: '56px !important' },
};

const mapUser = (user, idx) => ({
  id: user?.hash_id || user?.id || `user-${idx}`,
  hash_id: user?.hash_id || user?.id,
  username: user?.username || '-',
  cnic: user?.cnic || '-',
  email: user?.email || '-',
  father_husband_name: user?.father_husband_name || '-',
  designation: user?.designation || '-',
  grade: user?.grade || '-',
  status: user?.status || 'inactive',
  status_job: user?.status_job || '-',
});

const ActionCell = ({ employee, onViewDetails }) => {
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

  const handleEmployeeUpdated = (updated) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.hash_id === updated.hash_id
          ? {
              ...emp,
              email: updated.email ?? emp.email,
              father_husband_name: updated.father_husband_name ?? emp.father_husband_name,
              mobile: updated.mobile ?? emp.mobile,
              domicile: updated.domicile ?? emp.domicile,
              designation: updated.designation ?? emp.designation,
              grade: updated.grade ?? emp.grade,
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
  };

  const filteredEmployees = employees.filter((emp) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        emp.username?.toLowerCase().includes(term) ||
        emp.cnic?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    if (filters.username && !emp.username?.toLowerCase().includes(filters.username.toLowerCase())) return false;
    if (filters.cnic && !emp.cnic?.toLowerCase().includes(filters.cnic.toLowerCase())) return false;
    if (filters.email && !emp.email?.toLowerCase().includes(filters.email.toLowerCase())) return false;
    if (filters.status && emp.status !== filters.status) return false;

    return true;
  });

  const activeCount = employees.filter((e) => e.status === 'active').length;
  const inactiveCount = employees.filter((e) => e.status !== 'active').length;

  const columns = [
    { field: 'username', headerName: 'Username', flex: 1, minWidth: 160 },
    { field: 'cnic', headerName: 'CNIC', flex: 0.8, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
    { field: 'designation', headerName: 'Designation', flex: 0.8, minWidth: 150 },
    { field: 'grade', headerName: 'Grade', width: 100 },
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
        <ActionCell employee={params.row} onViewDetails={handleViewDetails} />
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
              placeholder="Search by username, CNIC or email..."
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
          filterConfig={FILTER_CONFIG}
          title="Filter Employees"
        />

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <DataGrid
            rows={filteredEmployees}
            columns={columns}
            loading={loading}
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
            sx={gridSx}
          />
        </div>
      </div>

      <EmployeeDetailsModal
        open={!!selectedHashId}
        hashId={selectedHashId}
        onClose={() => setSelectedHashId(null)}
        onUpdated={handleEmployeeUpdated}
      />
    </div>
  );
};

export default EmployeeList;
