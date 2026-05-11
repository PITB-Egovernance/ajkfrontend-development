import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  TextField, IconButton, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, Trash2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { localSettingsApi } from 'hooks/useLocalSettings';
import { InlineLoader } from 'components/ui/Loader';

const KEY  = 'degrees';
const QKEY = 'qualifications';

const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders':           { backgroundColor: '#f8fafc' },
  '& .MuiDataGrid-columnHeaderTitle':       { fontWeight: 'bold' },
  '& .MuiDataGrid-row':                     { minHeight: '52px !important' },
  '& .MuiDataGrid-checkboxInput svg':       { color: '#064e3b' },
  '& .MuiCheckbox-root .MuiSvgIcon-root':   { color: '#064e3b' },
  '& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root': { color: '#064e3b' },
  '& .MuiDataGrid-row.Mui-selected':        { backgroundColor: '#ecfdf5' },
  '& .MuiDataGrid-row.Mui-selected:hover':  { backgroundColor: '#d1fae5' },
};

const emptyForm = { name: '', qualification_id: '' };

const DegreesManagement = () => {
  const navigate = useNavigate();

  const [rows,           setRows]           = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [open,           setOpen]           = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [form,           setForm]           = useState(emptyForm);
  const [search,         setSearch]         = useState('');
  const [filterQual,     setFilterQual]     = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const load = () => {
    setLoading(true);
    const quals   = localSettingsApi.getAll(QKEY).filter((q) => q.status === 'active');
    const degrees = localSettingsApi.getAll(KEY);
    setQualifications(quals);
    setRows(degrees.map((item, i) => {
      const qual = quals.find((q) => q.id === item.qualification_id);
      return { ...item, sr_no: i + 1, qualification_name: qual?.name ?? '—' };
    }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeCount   = rows.filter((r) => r.status === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  const filtered = rows.filter((r) => {
    const matchSearch = !search.trim() || r.name?.toLowerCase().includes(search.toLowerCase());
    const matchQual   = !filterQual || r.qualification_id === filterQual;
    return matchSearch && matchQual;
  });

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name, qualification_id: row.qualification_id || '' });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Degree name is required'); return; }

    const duplicate = rows.find(
      (r) => r.name.toLowerCase() === form.name.trim().toLowerCase() && r.id !== editing?.id
    );
    if (duplicate) { toast.error('Degree already exists'); return; }

    if (editing) {
      localSettingsApi.update(KEY, { ...editing, name: form.name.trim(), qualification_id: form.qualification_id });
      toast.success('Updated successfully');
    } else {
      localSettingsApi.add(KEY, { name: form.name.trim(), qualification_id: form.qualification_id, status: 'active' });
      toast.success('Degree added');
    }
    setOpen(false);
    load();
  };

  const handleDelete = (row) => {
    if (!window.confirm(`Delete degree "${row.name}"?`)) return;
    localSettingsApi.remove(KEY, row.id);
    toast.success('Deleted');
    load();
  };

  const handleToggle = (row) => {
    localSettingsApi.toggle(KEY, row.id);
    load();
  };

  const columns = [
    { field: 'sr_no',              headerName: '#',             width: 60 },
    { field: 'name',               headerName: 'Degree',        flex: 1 },
    { field: 'qualification_name', headerName: 'Qualification', width: 210 },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === 'active'}
          onChange={() => handleToggle(p.row)}
          size="small"
          color={p.value === 'active' ? 'success' : 'error'}
          inputProps={{ 'aria-label': 'toggle status' }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (p) => (
        <div className="flex gap-1">
          <IconButton size="small" onClick={() => openEdit(p.row)}>
            <BookOpen size={15} />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(p.row)} sx={{ color: 'red' }}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      ),
    },
  ];

  if (loading) return <InlineLoader text="Loading degrees..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate('/dashboard/settings')}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <BookOpen size={22} className="text-indigo-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Degrees</h1>
                <p className="text-sm text-slate-500">Manage academic degrees linked to qualifications</p>
              </div>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Degree
          </button>
        </div>

        {/* STATS */}
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

        {/* SEARCH + FILTER */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <TextField size="small" placeholder="Search degrees..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 280 }} />
          <TextField select size="small" label="Filter by Qualification"
            value={filterQual} onChange={(e) => setFilterQual(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">All Qualifications</MenuItem>
            {qualifications.map((q) => (
              <MenuItem key={q.id} value={q.id}>{q.name}</MenuItem>
            ))}
          </TextField>
          {filterQual && (
            <button onClick={() => setFilterQual('')}
              className="px-3 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
              Clear Filter
            </button>
          )}
        </div>

        {/* GRID */}
        <DataGrid
          rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={gridSx}
        />

        {/* MODAL */}
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">
            {editing ? 'Edit Degree' : 'Add Degree'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <TextField
              fullWidth autoFocus label="Degree Name" margin="normal" size="small"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. BSc Computer Science"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <TextField
              select fullWidth label="Qualification (optional)" margin="normal" size="small"
              value={form.qualification_id}
              onChange={(e) => setForm((f) => ({ ...f, qualification_id: e.target.value }))}
              helperText="Link this degree to a qualification level"
            >
              <MenuItem value="">— None —</MenuItem>
              {qualifications.map((q) => (
                <MenuItem key={q.id} value={q.id}>{q.name}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm">
              {editing ? 'Update' : 'Add'}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default DegreesManagement;
