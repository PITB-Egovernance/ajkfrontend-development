import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, MenuItem, Switch, FormControlLabel,
} from '@mui/material';
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
const FILTER_FETCH_PAGE_SIZE = 100;

const EXAM_CATEGORIES = [
  { value: 'one_paper_mcq',         label: 'One Paper MCQ' },
  { value: 'two_paper_mcq',         label: 'Two Paper MCQ' },
  { value: 'written_exam',          label: 'Written Exam' },
  { value: 'joint_competitive_exam', label: 'Joint Competitive Exam' },
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

const emptyForm = {
  name: '',
  description: '',
  exam_category: 'one_paper_mcq',
  total_marks: '',
  paper_weightage_percentage: '',
  interview_weightage_percentage: '',
  interview_marks: '',
  passing_marks: '',
  passing_percentage: '',
  is_passing_required: false,
  status: 'active',
};

const TestTypesManagement = () => {
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;
  const navigate = useNavigate();

  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving,   setSaving]   = useState(false);
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
    { name: 'total_marks', label: 'Total Marks', type: 'text', placeholder: 'Filter by marks' },
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
    is_passing_required: !!item.is_passing_required,
    status:    item.status ?? 'active',
  }));

  const fetchTestTypePage = async (page, pageSize) => {
    const res = await fetch(
      `${API_BASE}/settings/test-types?page=${page}&per_page=${pageSize}`,
      { headers: getHeaders() }
    );
    const result = await res.json();
    if (!(res.ok || result.success || result.status === 200)) {
      throw new Error(result.message || 'Failed to load exam test types');
    }

    const payload = result.data ?? {};
    const data = payload.data ?? result.data ?? [];
    return {
      data: Array.isArray(data) ? data : [],
      total: Number(payload.total ?? 0),
      lastPage: Number(payload.last_page ?? 0),
    };
  };

  const fetchFilteredTestTypes = async (page, pageSize) => {
    const name = filters.name.trim().toLowerCase();
    const examCategory = filters.exam_category.trim();
    const totalMarks = filters.total_marks.trim().toLowerCase();
    const status = filters.status.trim().toLowerCase();
    const firstPage = await fetchTestTypePage(1, FILTER_FETCH_PAGE_SIZE);
    const totalRows = firstPage.total || firstPage.data.length;
    const lastPage = firstPage.lastPage || Math.max(1, Math.ceil(totalRows / FILTER_FETCH_PAGE_SIZE));

    const remainingPages = lastPage > 1
      ? await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) =>
            fetchTestTypePage(i + 2, FILTER_FETCH_PAGE_SIZE)
          )
        )
      : [];

    const allRows = [firstPage, ...remainingPages].flatMap((pageResult) => pageResult.data);
    const filteredRows = formatTestTypeRows(allRows).filter((row) => {
      if (name && !String(row.name || '').toLowerCase().includes(name)) return false;
      if (examCategory && row.exam_category !== examCategory) return false;
      if (totalMarks && !String(row.total_marks ?? '').toLowerCase().includes(totalMarks)) return false;
      if (status && String(row.status || '').toLowerCase() !== status) return false;
      return true;
    });
    const startIndex = page * pageSize;

    setRows(
      filteredRows
        .slice(startIndex, startIndex + pageSize)
        .map((row, i) => ({ ...row, sr_no: startIndex + i + 1 }))
    );
    setTotal(filteredRows.length);
  };

  const fetchAll = async (page = 0, pageSize = 15) => {
    setLoading(true);
    try {
      const hasActiveFilters = Object.values(filters).some((value) => String(value || '').trim());
      if (hasActiveFilters) {
        await fetchFilteredTestTypes(page, pageSize);
        return;
      }

      const res    = await fetch(`${API_BASE}/settings/test-types?page=${page + 1}&per_page=${pageSize}`, { headers: getHeaders() });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        const payload = result.data ?? {};
        const data = result.data?.data ?? result.data ?? [];
        const dataArray = Array.isArray(data) ? data : [];
        setRows(formatTestTypeRows(dataArray, page * pageSize));
        setTotal(Number(payload.total ?? dataArray.length ?? 0));
      } else {
        toast.error(result.message || 'Failed to load exam test types');
      }
    } catch { toast.error('Server error while loading exam test types'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAll(paginationModel.page, paginationModel.pageSize);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, filters.name, filters.exam_category, filters.total_marks, filters.status]);

  const activeCount   = rows.filter((r) => (r.status ?? 'active') === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  const openAdd = () => {
    setEditing(null);
    setFormData(emptyForm);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      name:          row.name || '',
      description:   row.description || '',
      exam_category: row.exam_category || 'one_paper_mcq',
      total_marks:   row.total_marks ?? '',
      paper_weightage_percentage:     row.paper_weightage_percentage ?? '',
      interview_weightage_percentage: row.interview_weightage_percentage ?? '',
      interview_marks:    row.interview_marks ?? '',
      passing_marks:      row.passing_marks ?? '',
      passing_percentage: row.passing_percentage ?? '',
      is_passing_required: !!row.is_passing_required,
      status:        row.status || 'active',
    });
    setFormError('');
    setOpen(true);
  };

  // Build the request payload — omit optional numeric fields left blank so the
  // backend keeps them null rather than rejecting an empty string.
  const buildPayload = () => {
    const payload = {
      name:          formData.name.trim(),
      exam_category: formData.exam_category,
      total_marks:   Number(formData.total_marks),
      status:        formData.status,
      is_passing_required: !!formData.is_passing_required,
    };
    if (formData.description.trim()) payload.description = formData.description.trim();
    const optionalNumbers = [
      'paper_weightage_percentage',
      'interview_weightage_percentage',
      'interview_marks',
      'passing_marks',
      'passing_percentage',
    ];
    optionalNumbers.forEach((key) => {
      if (formData[key] !== '' && formData[key] !== null) payload[key] = Number(formData[key]);
    });
    return payload;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim())       { setFormError('Name is required.'); return; }
    if (String(formData.total_marks).trim() === '') { setFormError('Total marks is required.'); return; }
    const marks = Number(formData.total_marks);
    if (Number.isNaN(marks) || marks < 0) { setFormError('Total marks must be a non-negative number.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const isUpdate = !!editing;
      const url = isUpdate
        ? `${API_BASE}/settings/test-types/${editing.hash_id}/update`
        : `${API_BASE}/settings/test-types/create`;
      const res = await fetch(url, {
        method:  isUpdate ? 'PUT' : 'POST',
        headers: getHeaders(),
        body:    JSON.stringify(buildPayload()),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Exam test type updated successfully' : 'Exam test type added successfully');
        setOpen(false);
        fetchAll(paginationModel.page, paginationModel.pageSize);
      } else {
        const fieldErrors = result.errors ? Object.values(result.errors).flat().join(', ') : '';
        toast.error(fieldErrors || result.message || (isUpdate ? 'Failed to update exam test type' : 'Failed to add exam test type'));
      }
    } catch { toast.error('Server error while saving exam test type'); }
    finally { setSaving(false); }
  };

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
          fetchAll(paginationModel.page, paginationModel.pageSize);
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
        fetchAll(paginationModel.page, paginationModel.pageSize);
      } else {
        const fieldErrors = r.errors ? Object.values(r.errors).flat().join(', ') : '';
        toast.error(fieldErrors || r.message || 'Status update failed');
      }
    } catch { toast.error('Status update failed'); }
  };

  const columns = [
    { field: 'sr_no',         headerName: '#',          width: 60 },
    { field: 'name',          headerName: 'Name',       flex: 1, minWidth: 200 },
    
    { field: 'total_marks',   headerName: 'Total Marks', width: 130,
      renderCell: (p) => Number(p.value || 0).toLocaleString('en-PK') },
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
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50, 100]}
          paginationMode="server"
          rowCount={total}
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

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold">{editing ? 'Edit Exam/Test Type' : 'Add Exam/Test Type'}</DialogTitle>
          <DialogContent>
            {formError && <p className="text-red-600 text-sm mt-2 mb-1">{formError}</p>}
            <TextField fullWidth autoFocus required label="Name" margin="normal" size="small"
              value={formData.name}
              onChange={(e) => { setFormData((f) => ({ ...f, name: e.target.value })); setFormError(''); }}
              placeholder="e.g. PMS Two Paper MCQ" />
            <TextField fullWidth multiline minRows={2} label="Description (optional)" margin="normal" size="small"
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description of this exam test type" />

            <div className="grid grid-cols-2 gap-3">
              <TextField fullWidth required type="number" label="Total Marks" margin="normal" size="small"
                value={formData.total_marks}
                onChange={(e) => { setFormData((f) => ({ ...f, total_marks: e.target.value })); setFormError(''); }}
                inputProps={{ min: 0, step: '0.01' }} placeholder="e.g. 200" />
              {/*<TextField fullWidth type="number" label="Interview Marks" margin="normal" size="small"
                value={formData.interview_marks}
                onChange={(e) => setFormData((f) => ({ ...f, interview_marks: e.target.value }))}
                inputProps={{ min: 0, step: '0.01' }} placeholder="e.g. 40" />*/}
              <TextField fullWidth type="number" label="Paper Weightage (%)" margin="normal" size="small"
                value={formData.paper_weightage_percentage}
                onChange={(e) => setFormData((f) => ({ ...f, paper_weightage_percentage: e.target.value }))}
                inputProps={{ min: 0, max: 100, step: '0.01' }} placeholder="0 - 100" />
              <TextField fullWidth type="number" label="Interview Weightage (%)" margin="normal" size="small"
                value={formData.interview_weightage_percentage}
                onChange={(e) => setFormData((f) => ({ ...f, interview_weightage_percentage: e.target.value }))}
                inputProps={{ min: 0, max: 100, step: '0.01' }} placeholder="0 - 100" />
              <TextField fullWidth type="number" label="Passing Marks" margin="normal" size="small"
                value={formData.passing_marks}
                onChange={(e) => setFormData((f) => ({ ...f, passing_marks: e.target.value }))}
                inputProps={{ min: 0, step: '0.01' }} placeholder="e.g. 100" />
              <TextField fullWidth type="number" label="Passing Percentage (%)" margin="normal" size="small"
                value={formData.passing_percentage}
                onChange={(e) => setFormData((f) => ({ ...f, passing_percentage: e.target.value }))}
                inputProps={{ min: 0, max: 100, step: '0.01' }} placeholder="0 - 100" />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_passing_required}
                    onChange={(e) => setFormData((f) => ({ ...f, is_passing_required: e.target.checked }))}
                    size="small"
                  />
                }
                label="Passing required"
              />
            </div>
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setOpen(false)} disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update' : 'Add'}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default TestTypesManagement;
