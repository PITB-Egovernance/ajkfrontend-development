import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import toast from 'react-hot-toast';
import { Search, ArrowLeft, UserCog } from 'lucide-react';
import { Card, CardContent } from 'components/ui/Card';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import EmployeeService from 'services/EmployeeService';

const ROLE_DESIGNATIONS = ['chairman', 'secretary', 'admin'];

const HIERARCHY_ORDER = ['chairman', 'secretary', 'admin'];

const getHierarchyRank = (designation) => {
  const d = designation?.toLowerCase() || '';
  const idx = HIERARCHY_ORDER.findIndex((r) => d.includes(r));
  return idx === -1 ? 99 : idx;
};

// Designation now arrives as a relation object ({ name, hash_id }) instead of
// a plain string — normalise both shapes to the display name.
const getDesignationName = (designation) => {
  if (!designation) return '';
  if (typeof designation === 'object') return designation.name || '';
  return String(designation);
};

const FILTER_CONFIG = [
  { name: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Filter by full name' },
  { name: 'designation', label: 'Designation', type: 'text', placeholder: 'Filter by designation' },
];

const EMPTY_FILTERS = { full_name: '', designation: '' };

const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc' },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
  '& .MuiDataGrid-row': { minHeight: '56px !important' },
};

const SystemSettings = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    setLoading(true);
    EmployeeService.getUsers({ per_page: 100 })
      .then((result) => {
        const filtered = result.data
          .filter((emp) => {
            const desigName = getDesignationName(emp.designation).toLowerCase();
            return (
              emp.status_job === 'active' &&
              ROLE_DESIGNATIONS.some((role) => desigName.includes(role))
            );
          })
          .map((emp, idx) => ({
            id: emp.hash_id || emp.id || `emp-${idx}`,
            hash_id: emp.hash_id || emp.id,
            full_name: emp.username || emp.name || emp.full_name || '-',
            designation: getDesignationName(emp.designation) || '-',
            status_job: emp.status_job || '-',
          }))
          .sort((a, b) => getHierarchyRank(a.designation) - getHierarchyRank(b.designation));
        setEmployees(filtered);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load system users');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters(EMPTY_FILTERS);

  const filteredEmployees = employees.filter((emp) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      if (!emp.full_name?.toLowerCase().includes(term)) return false;
    }
    if (filters.full_name && !emp.full_name?.toLowerCase().includes(filters.full_name.toLowerCase())) return false;
    if (filters.designation && !emp.designation?.toLowerCase().includes(filters.designation.toLowerCase())) return false;
    return true;
  });

  const chairmanCount = employees.filter((e) => e.designation?.toLowerCase().includes('chairman')).length;
  const secretaryCount = employees.filter((e) => e.designation?.toLowerCase().includes('secretary')).length;
  const adminCount = employees.filter((e) => e.designation?.toLowerCase().includes('admin')).length;

  const columns = [
    { field: 'full_name',   headerName: 'Full Name',   flex: 1, minWidth: 180 },
    { field: 'designation', headerName: 'Designation', flex: 1, minWidth: 160 },
    {
      field: 'status_job',
      headerName: 'Job Status',
      width: 140,
      renderCell: (params) => (
        <div className="flex items-center h-full">
          <span className={`text-xs font-bold ${params.value === 'active' ? 'text-emerald-700' : 'text-red-600'}`}>
            {params.value === 'active' ? 'Active' : params.value === '-' ? '-' : 'Inactive'}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto space-y-6" style={{ minWidth: "-webkit-fill-available" }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-2xl flex items-center justify-center shadow-md">
              <UserCog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
              <p className="text-sm text-slate-500 mt-1">Active Chairman, Secretary and Admin users</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">Chairman</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">{chairmanCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="p-6">
              <p className="text-sm text-amber-700 font-medium">Secretary</p>
              <h2 className="text-3xl font-bold text-amber-900 mt-2">{secretaryCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">Admin</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">{adminCount}</h2>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name..."
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
          title="Filter System Users"
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
            sx={gridSx}
          />
        </div>

      </div>
    </div>
  );
};

export default SystemSettings;
