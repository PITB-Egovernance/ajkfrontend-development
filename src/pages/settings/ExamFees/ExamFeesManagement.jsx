import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, MenuItem,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, DollarSign, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { InlineLoader } from 'components/ui/Loader';
import { hasPermission } from 'utils/permissions';

const PERM = 'settings.exam_test_fee';

const API_BASE = Config.apiUrl;
const FILTER_FETCH_PAGE_SIZE = 100;

const TEST_TYPES = ['MCQs', 'Written Exam'];

const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': Config.apiKey,
});

const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders':    { backgroundColor: '#f8fafc' },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
  '& .MuiDataGrid-row':              { minHeight: '52px !important' },
  '& .MuiDataGrid-row.Mui-selected': { backgroundColor: '#ecfdf5' },
  '& .MuiDataGrid-row.Mui-selected:hover': { backgroundColor: '#d1fae5' },
};

const emptyForm = { test_type: 'MCQs', label: '', amount: '' };

const ExamFeesManagement = () => {
  const navigate = useNavigate();
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [open,        setOpen]        = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [filters,  setFilters]  = useState({ label: '', test_type: '', amount: '', status: '' });
  const [total,    setTotal]    = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const hasActiveFilters = Object.values(filters).some((value) => String(value || '').trim());

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ label: '', test_type: '', amount: '', status: '' });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const formatExamFeeRows = (items, startIndex = 0) => items.map((item, i) => ({
    id:        item.hash_id || item.id,
    sr_no:     startIndex + i + 1,
    hash_id:   item.hash_id || item.id,
    test_type: item.test_type,
    label:     item.label || '',
    amount:    item.amount,
    status:    item.status ?? 'active',
  }));

  const fetchExamFeePage = async (page, pageSize) => {
    const res = await fetch(
      `${API_BASE}/settings/exam-fees?page=${page}&per_page=${pageSize}`,
      { headers: getHeaders() }
    );
    const result = await res.json();
    if (!(res.ok || result.success || result.status === 200)) {
      throw new Error(result.message || 'Failed to load exam fees');
    }

    const payload = result.data ?? {};
    const data = payload.data ?? result.data ?? [];
    return {
      data: Array.isArray(data) ? data : [],
      total: Number(payload.total ?? 0),
      lastPage: Number(payload.last_page ?? 0),
    };
  };

  const fetchFilteredExamFees = async (page, pageSize) => {
    const label = filters.label.trim().toLowerCase();
    const testType = filters.test_type.trim();
    const amount = filters.amount.trim().toLowerCase();
    const status = filters.status.trim().toLowerCase();
    const firstPage = await fetchExamFeePage(1, FILTER_FETCH_PAGE_SIZE);
    const totalRows = firstPage.total || firstPage.data.length;
    const lastPage = firstPage.lastPage || Math.max(1, Math.ceil(totalRows / FILTER_FETCH_PAGE_SIZE));

    const remainingPages = lastPage > 1
      ? await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) =>
            fetchExamFeePage(i + 2, FILTER_FETCH_PAGE_SIZE)
          )
        )
      : [];

    const allRows = [firstPage, ...remainingPages].flatMap((pageResult) => pageResult.data);
    const filteredRows = formatExamFeeRows(allRows).filter((row) => {
      if (label && !String(row.label || '').toLowerCase().includes(label)) return false;
      if (testType && row.test_type !== testType) return false;
      if (amount && !String(row.amount ?? '').toLowerCase().includes(amount)) return false;
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
        await fetchFilteredExamFees(page, pageSize);
        return;
      }

      const res    = await fetch(`${API_BASE}/settings/exam-fees?page=${page + 1}&per_page=${pageSize}`, { headers: getHeaders() });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        const payload = result.data ?? {};
        const data = result.data?.data ?? result.data ?? [];
        const dataArray = Array.isArray(data) ? data : [];
        setRows(formatExamFeeRows(dataArray, page * pageSize));
        setTotal(Number(payload.total ?? dataArray.length ?? 0));
      } else {
        toast.error(result.message || 'Failed to load exam fees');
      }
    } catch { toast.error('Server error while loading exam fees'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAll(paginationModel.page, paginationModel.pageSize);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, filters.label, filters.test_type, filters.amount, filters.status]);

  const openAdd  = () => { setEditing(null); setFormData(emptyForm); setFormError(''); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      test_type: row.test_type || 'MCQs',
      label:     row.label     || '',
      amount:    row.amount    || '',
    });
    setFormError('');
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.test_type)            { setFormError('Test type is required.'); return; }
    if (!String(formData.amount).trim()) { setFormError('Fee amount is required.'); return; }
    const amt = Number(formData.amount);
    if (Number.isNaN(amt) || amt < 0)   { setFormError('Fee amount must be a non-negative number.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const isUpdate = !!editing;
      const url = isUpdate
        ? `${API_BASE}/settings/exam-fees/${editing.hash_id}/update`
        : `${API_BASE}/settings/exam-fees/store`;
      const res = await fetch(url, {
        method:  isUpdate ? 'PUT' : 'POST',
        headers: getHeaders(),
        body:    JSON.stringify({
          test_type: formData.test_type,
          label:     formData.label.trim() || null,
          amount:    amt,
        }),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Exam fee updated successfully' : 'Exam fee added successfully');
        setOpen(false);
        fetchAll(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || (isUpdate ? 'Failed to update exam fee' : 'Failed to add exam fee'));
      }
    } catch { toast.error('Server error while saving exam fee'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    if (!await confirmDelete({ title: 'Delete Exam Fee', identifier: `${row.test_type} — ${row.label || row.amount}` })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/exam-fees/${row.hash_id}/delete`, {
        method:  'DELETE',
        headers: getHeaders(),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        toast.success('Exam fee deleted successfully');
        if (rows.length === 1 && paginationModel.page > 0) {
          setPaginationModel((p) => ({ ...p, page: p.page - 1 }));
        } else {
          fetchAll(paginationModel.page, paginationModel.pageSize);
        }
      } else {
        toast.error(result.message || 'Failed to delete exam fee');
      }
    } catch { toast.error('Server error while deleting exam fee'); }
  };

  const columns = [
    { field: 'sr_no',     headerName: '#',          width: 60 },
    { field: 'test_type', headerName: 'Test Type',  width: 180 },
    { field: 'label',     headerName: 'Label',      flex: 1, minWidth: 200,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    { field: 'amount',    headerName: 'Fee (PKR)',  width: 140,
      renderCell: (p) => Number(p.value).toLocaleString('en-PK', { minimumFractionDigits: 2 }) },
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

  if (loading && rows.length === 0) return <InlineLoader text="Loading exam fees..." variant="ring" size="lg" />;

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
              <div className="p-2 bg-emerald-100 rounded-lg"><DollarSign size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Exam Fees</h1>
                <p className="text-sm text-slate-500">Manage application fees per test type (MCQs / Written)</p>
              </div>
            </div>
          </div>
          {canAdd && (
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Exam Fee
          </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Exam Fees</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">Filter Exam Fees</h3>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <X size={14} /> Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <TextField
              size="small"
              label="Label"
              name="label"
              placeholder="Filter by label"
              value={filters.label}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              size="small"
              label="Test Type"
              name="test_type"
              value={filters.test_type}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            >
              <MenuItem value="">All Test Type</MenuItem>
              {TEST_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Fee Amount"
              name="amount"
              placeholder="Filter by amount"
              value={filters.amount}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              size="small"
              label="Status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </div>
        </div>

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
          sx={gridSx}
        />

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) openEdit(r); }}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) handleDelete(r); }} sx={{ color: 'red' }}>Delete</MenuItem>}
        </Menu>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">{editing ? 'Edit Exam Fee' : 'Add Exam Fee'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {formError && <p className="text-red-600 text-sm mt-2 mb-1">{formError}</p>}
            <TextField fullWidth select required label="Test Type" margin="normal" size="small"
              value={formData.test_type}
              onChange={(e) => { setFormData((f) => ({ ...f, test_type: e.target.value })); setFormError(''); }}>
              {TEST_TYPES.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
            </TextField>
            <TextField fullWidth label="Label (optional)" margin="normal" size="small"
              value={formData.label}
              onChange={(e) => setFormData((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Standard Fee, Concessional" />
            <TextField fullWidth required type="number" label="Fee Amount (PKR)" margin="normal" size="small"
              value={formData.amount}
              onChange={(e) => { setFormData((f) => ({ ...f, amount: e.target.value })); setFormError(''); }}
              inputProps={{ min: 0, step: '0.01' }}
              placeholder="e.g. 500" />
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

export default ExamFeesManagement;
