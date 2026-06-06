import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, MenuItem, Switch,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, ClipboardCheck, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { InlineLoader } from 'components/ui/Loader';

const API_BASE = Config.apiUrl;

const getHeaders = (json = true) => {
  const h = {
    Authorization: `Bearer ${AuthService.getToken()}`,
    Accept: 'application/json',
    'X-API-KEY': Config.apiKey,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders':    { backgroundColor: '#f8fafc' },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
  '& .MuiDataGrid-row':              { minHeight: '52px !important' },
  '& .MuiDataGrid-checkboxInput svg':             { color: '#064e3b' },
  '& .MuiDataGrid-checkboxInput:hover svg':        { color: '#065f46' },
  '& .MuiDataGrid-checkboxInput.Mui-checked svg':  { color: '#064e3b' },
  '& .MuiCheckbox-root .MuiSvgIcon-root':           { color: '#064e3b' },
  '& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root': { color: '#064e3b' },
  '& .MuiDataGrid-row.Mui-selected':       { backgroundColor: '#ecfdf5' },
  '& .MuiDataGrid-row.Mui-selected:hover': { backgroundColor: '#d1fae5' },
};

const emptyForm = { test_name: '', test_fees: '' };

const BulkBtn = ({ onClick, icon: Icon, label, className = '' }) => (
  <button type="button" onClick={onClick}
    className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm ${className}`}>
    <Icon size={15} /> {label}
  </button>
);

const TestsManagement = () => {
  const navigate = useNavigate();

  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectionModel, setSelectionModel] = useState([]);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/tests`, { headers: getHeaders() });
      const result = await res.json();
      if (result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setRows(data.map((item, i) => ({
          id:         item.hash_id || item.id,
          sr_no:      i + 1,
          hash_id:    item.hash_id,
          test_name:  item.test_name  || item.name || '',
          test_fees:  item.test_fees  ?? item.fees ?? 0,
          status:     item.status     ?? 'active',
        })));
      } else {
        toast.error(result.message || 'Failed to load tests');
      }
    } catch { toast.error('Server error while loading tests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.test_name?.toLowerCase().includes(q) ||
      String(r.test_fees).includes(q)
    );
  });

  const total         = rows.length;
  const activeCount   = rows.filter((r) => (r.status ?? 'active') === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  /* ── BULK ACTIONS ── */
  const bulkAction = async (url, method, body, successMsg) => {
    try {
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      const r   = await res.json();
      if (res.ok || r.status === 200 || r.success) {
        toast.success(r.success || successMsg);
        setSelectionModel([]);
        fetchAll();
      } else {
        toast.error(r.message || 'Action failed');
      }
    } catch { toast.error('Action failed'); }
  };

  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: 'Delete Tests', message: `Are you sure you want to delete ${selectionModel.length} test${selectionModel.length > 1 ? 's' : ''}?` })) return;
    bulkAction(`${API_BASE}/settings/tests/bulk-delete`, 'DELETE', { hashes: selectionModel }, 'Deleted');
  };

  const handleBulkStatus = (status) =>
    selectionModel.length && bulkAction(`${API_BASE}/settings/tests/bulk-status`, 'PUT', { hashes: selectionModel, status }, `Marked as ${status}`);

  const openAdd = () => {
    setEditing(null);
    setFormData(emptyForm);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      test_name: row.test_name || '',
      test_fees: row.test_fees ?? '',
    });
    setFormError('');
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.test_name.trim()) { setFormError('Test name is required.'); return; }
    if (formData.test_fees === '' || formData.test_fees === null) {
      setFormError('Test fees is required.'); return;
    }
    const fees = Number(formData.test_fees);
    if (Number.isNaN(fees) || fees < 0) { setFormError('Test fees must be a non-negative number.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const isUpdate = !!editing;
      const url = isUpdate
        ? `${API_BASE}/settings/tests/${editing.hash_id}/update`
        : `${API_BASE}/settings/tests/store`;
      const res = await fetch(url, {
        method:  isUpdate ? 'PUT' : 'POST',
        headers: getHeaders(),
        body:    JSON.stringify({
          test_name: formData.test_name.trim(),
          test_fees: fees,
          // Backend UpdateTestRequest requires status on every update — preserve current status on edit,
          // default to 'active' on create (server default; explicit for clarity)
          ...(isUpdate ? { status: editing.status ?? 'active' } : {}),
        }),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Test updated successfully' : 'Test added successfully');
        setOpen(false);
        fetchAll();
      } else {
        toast.error(result.message || (isUpdate ? 'Failed to update test' : 'Failed to add test'));
      }
    } catch { toast.error('Server error while saving test'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    if (!await confirmDelete({ title: 'Delete Test', identifier: row.test_name })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/tests/${row.hash_id}/delete`, {
        method:  'DELETE',
        headers: getHeaders(false),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        toast.success('Test deleted successfully');
        setSelectionModel((p) => p.filter((id) => id !== row.hash_id));
        fetchAll();
      } else {
        toast.error(result.message || 'Failed to delete test');
      }
    } catch { toast.error('Server error while deleting test'); }
  };

  // TOGGLE STATUS — same method as edit (PUT /update), sends all required fields + new status
  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`${API_BASE}/settings/tests/${row.hash_id || row.id}/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          test_name: row.test_name,
          test_fees: Number(row.test_fees) || 0,
          status:    newStatus,
        }),
      });
      const r = await res.json();
      if (res.ok || r.status === 200 || r.success) {
        toast.success(`Test marked as ${newStatus}`);
        fetchAll();
      } else {
        // Show backend validation messages if present (Laravel returns { errors: { field: [..] } })
        const fieldErrors = r.errors ? Object.values(r.errors).flat().join(', ') : '';
        toast.error(fieldErrors || r.message || 'Status update failed');
        console.error('Toggle status failed', r);
      }
    } catch (e) { toast.error('Status update failed'); console.error(e); }
  };

  const columns = [
    { field: 'sr_no',     headerName: '#',         width: 60 },
    { field: 'test_name', headerName: 'Test Name', flex: 1, minWidth: 220 },
    { field: 'test_fees', headerName: 'Fees (PKR)', width: 160,
      renderCell: (p) => Number(p.value || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { field: 'status',    headerName: 'Status',    width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === 'active'}
          onChange={() => handleToggleStatus(p.row, p.value)}
          inputProps={{ 'aria-label': 'toggle test status' }}
          size="small"
          color={p.value === 'active' ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading && rows.length === 0) return <InlineLoader text="Loading tests..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate('/dashboard/settings')}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><ClipboardCheck size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Tests</h1>
                <p className="text-sm text-slate-500">Manage eligible tests and their fees for requisitions</p>
              </div>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Test
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Tests</p>
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

        {/* TOOLBAR — bulk actions appear when rows are selected */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="mb-0">
            <TextField size="small" placeholder="Search tests..."
              value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 320 }} />
          </div>

          {selectionModel.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700 mr-1">{selectionModel.length} selected</span>
              <BulkBtn onClick={() => handleBulkStatus('active')}   icon={CheckCircle} label="Mark Active"
                className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white" />
              <BulkBtn onClick={() => handleBulkStatus('inactive')} icon={XCircle}     label="Mark Inactive"
                className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white" />
              <BulkBtn onClick={handleBulkDelete}                   icon={Trash2}       label="Delete"
                className="bg-gradient-to-br from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white" />
            </div>
          )}
        </div>

        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 15, page: 0 } } }}
          loading={loading}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(s) => setSelectionModel(s)}
          sx={gridSx}
        />

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) openEdit(r); }}>Edit</MenuItem>
          <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) handleDelete(r); }} sx={{ color: 'red' }}>Delete</MenuItem>
        </Menu>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">{editing ? 'Edit Test' : 'Add Test'}</DialogTitle>
          <DialogContent>
            {formError && <p className="text-red-600 text-sm mt-2 mb-1">{formError}</p>}
            <TextField fullWidth autoFocus required label="Test Name" margin="normal" size="small"
              value={formData.test_name}
              onChange={(e) => { setFormData((f) => ({ ...f, test_name: e.target.value })); setFormError(''); }}
              placeholder="e.g. NTS, MDCAT"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            <TextField fullWidth required type="number" label="Test Fees (PKR)" margin="normal" size="small"
              value={formData.test_fees}
              onChange={(e) => { setFormData((f) => ({ ...f, test_fees: e.target.value })); setFormError(''); }}
              inputProps={{ min: 0, step: '0.01' }}
              placeholder="e.g. 1500" />
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

export default TestsManagement;
