import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, MenuItem, Switch,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, Flag, Trash2, CheckCircle, XCircle } from 'lucide-react';
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

const PERM = 'settings.nationalities';

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

const BulkBtn = ({ onClick, icon: Icon, label, className = '' }) => (
  <button type="button" onClick={onClick}
    className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm ${className}`}>
    <Icon size={15} /> {label}
  </button>
);

const NationalitiesManagement = () => {
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
  const [selectionModel, setSelectionModel] = useState([]);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const [formName, setFormName] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [filters,  setFilters]  = useState({ name: '', status: '' });
  const [total,    setTotal]    = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    {
      name: 'name',
      label: 'Nationality Name',
      type: 'text',
      placeholder: 'Filter by nationality name',
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
    setFilters({ name: '', status: '' });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const formatNationalityRows = (items, startIndex = 0) => items.map((item, i) => ({
    id:               item.hash_id || item.id,
    sr_no:            startIndex + i + 1,
    hash_id:          item.hash_id || item.id,
    nationality_name: item.nationality_name || item.name,
    status:           item.status ?? 'active',
  }));

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/nationalities?per_page=500`, { headers: getHeaders() });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        const payload = result.data ?? {};
        const data = result.data?.data ?? result.data ?? [];
        const dataArray = Array.isArray(data) ? data : [];
        setRows(formatNationalityRows(dataArray));
        setTotal(Number(payload.total ?? dataArray.length ?? 0));
      } else {
        toast.error(result.message || 'Failed to load nationalities');
      }
    } catch { toast.error('Server error while loading nationalities'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

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
        const fieldErrors = r.errors ? Object.values(r.errors).flat().join(', ') : '';
        toast.error(fieldErrors || r.message || 'Action failed');
      }
    } catch { toast.error('Action failed'); }
  };

  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: 'Delete Nationalities', message: `Are you sure you want to delete ${selectionModel.length} nationalit${selectionModel.length > 1 ? 'ies' : 'y'}?` })) return;
    bulkAction(`${API_BASE}/settings/nationalities/bulk-delete`, 'DELETE', { hashes: selectionModel }, 'Deleted');
  };

  const handleBulkStatus = (status) =>
    selectionModel.length && bulkAction(`${API_BASE}/settings/nationalities/bulk-status`, 'PUT', { hashes: selectionModel, status }, `Marked as ${status}`);

  const openAdd  = () => { setEditing(null); setFormName(''); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setFormName(row.nationality_name); setOpen(true); };

  const handleSubmit = async () => {
    if (!formName.trim()) { toast.error('Nationality name is required'); return; }
    setSaving(true);
    try {
      const isUpdate = !!editing;
      const url = isUpdate
        ? `${API_BASE}/settings/nationalities/${editing.hash_id}/update`
        : `${API_BASE}/settings/nationalities/store`;
      const res = await fetch(url, {
        method:  isUpdate ? 'PUT' : 'POST',
        headers: getHeaders(),
        body:    JSON.stringify({
          nationality_name: formName.trim(),
          // Backend UpdateNationalityRequest requires status on every update — preserve current status on edit
          ...(isUpdate ? { status: editing.status ?? 'active' } : {}),
        }),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Nationality updated successfully' : 'Nationality added successfully');
        setOpen(false);
        fetchAll();
      } else {
        const fieldErrors = result.errors ? Object.values(result.errors).flat().join(', ') : '';
        toast.error(fieldErrors || result.message || (isUpdate ? 'Failed to update nationality' : 'Failed to add nationality'));
      }
    } catch { toast.error('Server error while saving nationality'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    if (!await confirmDelete({ title: 'Delete Nationality', identifier: row.nationality_name })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/nationalities/${row.hash_id}/delete`, {
        method:  'DELETE',
        headers: getHeaders(false),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        toast.success('Nationality deleted successfully');
        setSelectionModel((p) => p.filter((id) => id !== row.hash_id));
        if (rows.length === 1 && paginationModel.page > 0) {
          setPaginationModel((p) => ({ ...p, page: p.page - 1 }));
        } else {
          fetchAll();
        }
      } else {
        toast.error(result.message || 'Failed to delete nationality');
      }
    } catch { toast.error('Server error while deleting nationality'); }
  };

  // TOGGLE STATUS — same method as edit (PUT /update), sends all required fields + new status
  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!await confirmStatus({ newStatus })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/nationalities/${row.hash_id || row.id}/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          nationality_name: row.nationality_name,
          status:           newStatus,
        }),
      });
      const r = await res.json();
      if (res.ok || r.status === 200 || r.success) {
        toast.success(`Nationality marked as ${newStatus}`);
        fetchAll();
      } else {
        const fieldErrors = r.errors ? Object.values(r.errors).flat().join(', ') : '';
        toast.error(fieldErrors || r.message || 'Status update failed');
      }
    } catch { toast.error('Status update failed'); }
  };

  const columns = [
    { field: 'sr_no',            headerName: '#',           width: 60 },
    { field: 'nationality_name', headerName: 'Nationality', flex: 1, minWidth: 200 },
    { field: 'status',           headerName: 'Status',      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === 'active'}
          onChange={() => handleToggleStatus(p.row, p.value)}
          inputProps={{ 'aria-label': 'toggle nationality status' }}
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
    const status = filters.status.trim().toLowerCase();
    if (name && !String(row.nationality_name || '').toLowerCase().includes(name)) return false;
    if (status && String(row.status || '').toLowerCase() !== status) return false;
    return true;
  });

  if (loading && rows.length === 0) return <InlineLoader text="Loading nationalities..." variant="ring" size="lg" />;

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
              <div className="p-2 bg-emerald-100 rounded-lg"><Flag size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Nationalities</h1>
                <p className="text-sm text-slate-500">Manage eligible nationalities for requisitions</p>
              </div>
            </div>
          </div>
          {canAdd && (
            <button onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Nationality
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Nationalities</p>
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
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Nationalities"
        />

        <div className="flex items-center justify-end gap-3 mb-4 flex-wrap">
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
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(s) => setSelectionModel(s)}
          sx={GRID_SX}
        />

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) openEdit(r); }}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) handleDelete(r); }} sx={{ color: 'red' }}>Delete</MenuItem>}
        </Menu>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">{editing ? 'Edit Nationality' : 'Add Nationality'}</DialogTitle>
          <DialogContent>
            <TextField fullWidth autoFocus label="Nationality Name" margin="normal" size="small"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Pakistani/AJK"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
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

export default NationalitiesManagement;
