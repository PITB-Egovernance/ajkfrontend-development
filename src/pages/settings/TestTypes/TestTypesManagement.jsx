import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { IconButton, Menu, MenuItem, Switch } from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import confirmStatus from 'components/ui/confirmStatus';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { InlineLoader } from 'components/ui/Loader';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import { hasPermission } from 'utils/permissions';
import { GRID_SX } from 'utils/gridStyles';

const PERM = 'settings.test_types';

const API_BASE = Config.apiUrl;

const EXAM_CATEGORIES = [
  { value: 'one_paper_mcq',         label: 'One Paper MCQ' },
  { value: 'two_paper_mcq',         label: 'Two Paper MCQ' },
  { value: 'written_exam',          label: 'Written Exam' },
  { value: 'combined_competitive_exam', label: 'Combined Competitive Exam' },
];


const getHeaders = (json = true) => {
  const h = {
    Authorization: `Bearer ${AuthService.getToken()}`,
    Accept: 'application/json',
    'X-API-KEY': Config.apiKey,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const TestTypesManagement = () => {
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;
  const navigate = useNavigate();

  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const [filters,  setFilters]  = useState({ name: '', exam_category: '', total_marks: '', status: '' });
  const [total,    setTotal]    = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'Filter by name' },
    {
      name: 'exam_category',
      label: 'Category',
      type: 'select',
      options: EXAM_CATEGORIES,
    },
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ name: '', exam_category: '', total_marks: '', status: '' });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const formatTestTypeRows = (items, startIndex = 0) => items.map((item, i) => ({
    id:        item.hash_id || item.id,
    sr_no:     startIndex + i + 1,
    hash_id:   item.hash_id || item.id,
    name:      item.name || '',
    description: item.description || '',
    exam_category: item.exam_category || '',
    total_marks:   item.total_marks ?? 0,
    paper_weightage_percentage:     item.paper_weightage_percentage ?? '',
    interview_weightage_percentage: item.interview_weightage_percentage ?? '',
    interview_marks:    item.interview_marks ?? '',
    passing_marks:      item.passing_marks ?? '',
    passing_percentage: item.passing_percentage ?? '',
    // Two-paper / written / CCE extended fields (used to prefill the edit page).
    paper1_weightage_percentage:    item.paper1_weightage_percentage ?? '',
    paper2_weightage_percentage:    item.paper2_weightage_percentage ?? '',
    total_subjects:                 item.total_subjects ?? '',
    qualification_marks_percentage: item.qualification_marks_percentage ?? '',
    interview_percentage:           item.interview_percentage ?? '',
    screening_total_marks:          item.screening_total_marks ?? '',
    screening_passing_marks:        item.screening_passing_marks ?? '',
    screening_passing_percentage:   item.screening_passing_percentage ?? '',
    screening_include_in_merit:     !!item.screening_include_in_merit,
    written_total_marks:            item.written_total_marks ?? '',
    passing_percentage_per_subject: item.passing_percentage_per_subject ?? '',
    aggregate_passing_percentage:   item.aggregate_passing_percentage ?? '',
    interview_total_marks:          item.interview_total_marks ?? '',
    interview_passing_percentage:   item.interview_passing_percentage ?? '',
    interview_include_in_merit:     !!item.interview_include_in_merit,
    is_passing_required: !!item.is_passing_required,
    status:    item.status ?? 'active',
  }));

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/test-types?per_page=500`, { headers: getHeaders() });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        const payload = result.data ?? {};
        const data = result.data?.data ?? result.data ?? [];
        const dataArray = Array.isArray(data) ? data : [];
        setRows(formatTestTypeRows(dataArray));
        setTotal(Number(payload.total ?? dataArray.length ?? 0));
      } else {
        toast.error(result.message || 'Failed to load exam test types');
      }
    } catch { toast.error('Server error while loading exam test types'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const activeCount   = rows.filter((r) => (r.status ?? 'active') === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  const openAdd = () => navigate('/dashboard/settings/test-types/create');

  const openEdit = (row) => navigate(`/dashboard/settings/test-types/${row.hash_id}/edit`, { state: { row } });

  const handleDelete = async (row) => {
    if (!await confirmDelete({ title: 'Delete Exam Test Type', identifier: row.name })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/test-types/${row.hash_id}/delete`, {
        method:  'DELETE',
        headers: getHeaders(false),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        toast.success('Exam test type deleted successfully');
        if (rows.length === 1 && paginationModel.page > 0) {
          setPaginationModel((p) => ({ ...p, page: p.page - 1 }));
        } else {
          fetchAll();
        }
      } else {
        toast.error(result.message || 'Failed to delete exam test type');
      }
    } catch { toast.error('Server error while deleting exam test type'); }
  };

  // TOGGLE STATUS — same method as edit (PUT /update), sends all required fields + new status
  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!await confirmStatus({ newStatus })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/test-types/${row.hash_id || row.id}/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          name:          row.name,
          exam_category: row.exam_category,
          total_marks:   Number(row.total_marks) || 0,
          is_passing_required: !!row.is_passing_required,
          status:        newStatus,
        }),
      });
      const r = await res.json();
      if (res.ok || r.status === 200 || r.success) {
        toast.success(`Exam test type marked as ${newStatus}`);
        fetchAll();
      } else {
        const fieldErrors = r.errors ? Object.values(r.errors).flat().join(', ') : '';
        toast.error(fieldErrors || r.message || 'Status update failed');
      }
    } catch { toast.error('Status update failed'); }
  };

  const columns = [
    { field: 'sr_no',         headerName: '#',          width: 60 },
    { field: 'name',          headerName: 'Name',       flex: 1, minWidth: 200 },
    { field: 'status',        headerName: 'Status',     width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === 'active'}
          onChange={() => handleToggleStatus(p.row, p.value)}
          inputProps={{ 'aria-label': 'toggle exam test type status' }}
          size="small"
          disabled={!canEdit}
          color={p.value === 'active' ? 'success' : 'error'}
        />
      ),
    },
    ...(canRowActions ? [{
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ];

  const filteredRows = rows.filter((row) => {
    const name = filters.name.trim().toLowerCase();
    const examCategory = filters.exam_category.trim();
    const totalMarks = filters.total_marks.trim().toLowerCase();
    const status = filters.status.trim().toLowerCase();
    if (name && !String(row.name || '').toLowerCase().includes(name)) return false;
    if (examCategory && row.exam_category !== examCategory) return false;
    if (totalMarks && !String(row.total_marks ?? '').toLowerCase().includes(totalMarks)) return false;
    if (status && String(row.status || '').toLowerCase() !== status) return false;
    return true;
  });

  if (loading && rows.length === 0) return <InlineLoader text="Loading exam test types..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: "-webkit-fill-available" }}>

        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate('/dashboard/settings')}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><FileText size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Exam/Test Type</h1>
                <p className="text-sm text-slate-500">Manage exam categories, marks and passing criteria</p>
              </div>
            </div>
          </div>
          {canAdd && (
            <button onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Exam/Test Type
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Exam/Test Types</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5">
              <p className="text-sm text-emerald-700 font-medium">Active</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-5">
              <p className="text-sm text-red-700 font-medium">Inactive</p>
              <h2 className="text-3xl font-bold text-red-900 mt-1">{inactiveCount}</h2>
            </CardContent>
          </Card>
        </div>

        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Exam/Test Types"
        />

        <TooltipDataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50, 100]}
          paginationMode="client"
          rowCount={filteredRows.length}
          initialState={{ pagination: { paginationModel: { pageSize: 15, page: 0 } } }}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          sx={GRID_SX}
        />

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) openEdit(r); }}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) handleDelete(r); }} sx={{ color: 'red' }}>Delete</MenuItem>}
        </Menu>
      </div>
    </div>
  );
};

export default TestTypesManagement;
