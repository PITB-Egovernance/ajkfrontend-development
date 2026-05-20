import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  TextField, IconButton, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { InlineLoader } from 'components/ui/Loader';

const API_BASE = Config.productionUrl;

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

const emptyForm = { degree_name: '', degree_group: '' };

const DegreesManagement = () => {
  const navigate = useNavigate();

  const [rows,   setRows]   = useState([]);
  const [groups, setGroups] = useState([]);   // degree groups from API
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [degRes, grpRes] = await Promise.all([
        fetch(`${API_BASE}/settings/degrees`, { headers: getHeaders() }),
        fetch(`${API_BASE}/settings/degrees/groups/list`, { headers: getHeaders() }),
      ]);
      const [degData, grpData] = await Promise.all([degRes.json(), grpRes.json()]);

      if (degData.success || degData.status === 200) {
        const data = degData.data?.data ?? degData.data ?? [];
        setRows(data.map((item, i) => ({
          id:          item.hash_id || item.id,
          sr_no:       i + 1,
          hash_id:     item.hash_id,
          degree_name: item.degree_name || item.name,
          degree_group: item.degree_group || '',
          status:      item.status ?? 'active',
        })));
      } else {
        toast.error(degData.message || 'Failed to load degrees');
      }

      if (grpData.success || grpData.status === 200) {
        const grpList = grpData.data?.data ?? grpData.data ?? [];
        setGroups(Array.isArray(grpList) ? grpList : []);
      }
    } catch { toast.error('Server error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const activeCount   = rows.filter((r) => r.status === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  const filtered = rows.filter((r) => {
    const matchSearch = !search.trim() || r.degree_name?.toLowerCase().includes(search.toLowerCase());
    const matchGroup  = !filterGroup || r.degree_group === filterGroup;
    return matchSearch && matchGroup;
  });

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ degree_name: row.degree_name, degree_group: row.degree_group || '' });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.degree_name.trim()) { toast.error('Degree name is required'); return; }
    setSaving(true);
    try {
      const isUpdate = !!editing;
      const url      = isUpdate
        ? `${API_BASE}/settings/degrees/${editing.hash_id}/update`
        : `${API_BASE}/settings/degrees/store`;
      const res      = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ degree_name: form.degree_name.trim(), degree_group: form.degree_group.trim() }),
      });
      const result   = await res.json();
      if (result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Updated successfully' : 'Degree added');
        setOpen(false);
        fetchAll();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch { toast.error('Server error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    if (!await confirmDelete({ title: 'Delete Degree', identifier: row.degree_name })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/degrees/${row.hash_id}/delete`, {
        method: 'DELETE', headers: getHeaders(),
      });
      const result = await res.json();
      if (result.success || result.status === 200) {
        toast.success('Deleted');
        fetchAll();
      } else {
        toast.error(result.message || 'Delete failed');
      }
    } catch { toast.error('Server error'); }
  };

  /* eslint-disable-next-line no-unused-vars */ // kept for future status-toggle column
  const handleToggle = async (row) => {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    try {
      const res    = await fetch(`${API_BASE}/settings/degrees/${row.hash_id || row.id}/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ degree_name: row.degree_name, degree_group: row.degree_group || '', status: newStatus }),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200) {
        toast.success(`Marked as ${newStatus}`);
        fetchAll();
      } else {
        toast.error(result.message || 'Status update failed');
      }
    } catch { toast.error('Server error'); }
  };

  const columns = [
    { field: 'sr_no',        headerName: '#',          width: 60 },
    { field: 'degree_name',  headerName: 'Degree',     flex: 1 },
    { field: 'degree_group', headerName: 'Group',      width: 200,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <IconButton onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading) return <InlineLoader text="Loading degrees..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm p-6">

        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate('/dashboard/settings')}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg"><BookOpen size={22} className="text-indigo-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Degrees</h1>
                <p className="text-sm text-slate-500">Manage academic degrees by group</p>
              </div>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Degree
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{rows.length}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5"><p className="text-sm text-emerald-700 font-medium">Active</p><h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-5"><p className="text-sm text-red-700 font-medium">Inactive</p><h2 className="text-3xl font-bold text-red-900 mt-1">{inactiveCount}</h2></CardContent>
          </Card>
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <TextField size="small" placeholder="Search degrees..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 280 }} />
          <TextField select size="small" label="Filter by Group"
            value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">All Groups</MenuItem>
            {groups.map((g, i) => (
              <MenuItem key={i} value={typeof g === 'string' ? g : g.degree_group || g.name}>
                {typeof g === 'string' ? g : g.degree_group || g.name}
              </MenuItem>
            ))}
          </TextField>
          {filterGroup && (
            <button onClick={() => setFilterGroup('')}
              className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
              Clear
            </button>
          )}
        </div>

        <DataGrid rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={gridSx} />

        {/* 3-dot action menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) openEdit(r); }}>Edit</MenuItem>
          <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) handleDelete(r); }} sx={{ color: 'red' }}>Delete</MenuItem>
        </Menu>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">{editing ? 'Edit Degree' : 'Add Degree'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <TextField fullWidth autoFocus label="Degree Name" margin="normal" size="small"
              value={form.degree_name}
              onChange={(e) => setForm((f) => ({ ...f, degree_name: e.target.value }))}
              placeholder="e.g. BSCS" />
            <TextField fullWidth label="Degree Group" margin="normal" size="small"
              value={form.degree_group}
              onChange={(e) => setForm((f) => ({ ...f, degree_group: e.target.value }))}
              placeholder="e.g. Computer Science"
              helperText="Group name for categorizing this degree" />
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setOpen(false)} disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">Cancel</button>
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

export default DegreesManagement;
