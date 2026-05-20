import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, Menu, MenuItem,
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

const QualificationsManagement = () => {
  const navigate = useNavigate();

  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };
  const [formName, setFormName] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/qualifications`, { headers: getHeaders() });
      const result = await res.json();
      if (result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setRows(data.map((item, i) => ({
          id:       item.hash_id || item.id,
          sr_no:    i + 1,
          hash_id:  item.hash_id,
          name:     item.qualification_name || item.name,
          status:   item.status ?? 'active',
        })));
      } else {
        toast.error(result.message || 'Failed to load qualifications');
      }
    } catch { toast.error('Server error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const activeCount   = rows.filter((r) => r.status === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  const filtered = rows.filter((r) =>
    !search.trim() || r.name?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd  = () => { setEditing(null); setFormName(''); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setFormName(row.name); setOpen(true); };

  const handleSubmit = async () => {
    if (!formName.trim()) { toast.error('Qualification name is required'); return; }
    setSaving(true);
    try {
      const isUpdate = !!editing;
      const url    = isUpdate
        ? `${API_BASE}/settings/qualifications/${editing.hash_id}/update`
        : `${API_BASE}/settings/qualifications/store`;
      const res    = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ qualification_name: formName.trim() }),
      });
      const result = await res.json();
      if (result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Updated successfully' : 'Qualification added');
        setOpen(false);
        fetchAll();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch { toast.error('Server error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    if (!await confirmDelete({ title: 'Delete Qualification', identifier: row.name })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/qualifications/${row.hash_id}/delete`, {
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

  const handleToggle = async (row) => {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    try {
      const res    = await fetch(`${API_BASE}/settings/qualifications/${row.hash_id || row.id}/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ qualification_name: row.name, status: newStatus }),
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
    { field: 'sr_no', headerName: '#',             width: 60 },
    { field: 'name',  headerName: 'Qualification',  flex: 1 },
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

  if (loading) return <InlineLoader text="Loading qualifications..." variant="ring" size="lg" />;

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
              <div className="p-2 bg-emerald-100 rounded-lg"><GraduationCap size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Qualifications</h1>
                <p className="text-sm text-slate-500">Manage academic qualification levels</p>
              </div>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Qualification
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

        <div className="mb-4">
          <TextField size="small" placeholder="Search qualifications..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 320 }} />
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
          <DialogTitle className="font-bold">{editing ? 'Edit Qualification' : 'Add Qualification'}</DialogTitle>
          <DialogContent>
            <TextField fullWidth autoFocus label="Qualification Name" margin="normal" size="small"
              value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Bachelor's Degree"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
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

export default QualificationsManagement;
