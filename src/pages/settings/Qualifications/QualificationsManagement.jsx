import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, GraduationCap, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { localSettingsApi } from 'hooks/useLocalSettings';
import { InlineLoader } from 'components/ui/Loader';

const KEY = 'qualifications';

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

const QualificationsManagement = () => {
  const navigate = useNavigate();

  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [formName, setFormName] = useState('');
  const [search,   setSearch]   = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const load = () => {
    setLoading(true);
    const data = localSettingsApi.getAll(KEY);
    setRows(data.map((item, i) => ({ ...item, sr_no: i + 1 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeCount   = rows.filter((r) => r.status === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  const filtered = rows.filter((r) =>
    !search.trim() || r.name?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd  = () => { setEditing(null); setFormName(''); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setFormName(row.name); setOpen(true); };

  const handleSubmit = () => {
    if (!formName.trim()) { toast.error('Qualification name is required'); return; }

    // Duplicate check
    const duplicate = rows.find(
      (r) => r.name.toLowerCase() === formName.trim().toLowerCase() && r.id !== editing?.id
    );
    if (duplicate) { toast.error('Qualification already exists'); return; }

    if (editing) {
      localSettingsApi.update(KEY, { ...editing, name: formName.trim() });
      toast.success('Updated successfully');
    } else {
      localSettingsApi.add(KEY, { name: formName.trim(), status: 'active' });
      toast.success('Qualification added');
    }
    setOpen(false);
    load();
  };

  const handleDelete = (row) => {
    if (!window.confirm(`Delete qualification "${row.name}"?`)) return;
    localSettingsApi.remove(KEY, row.id);
    toast.success('Deleted');
    load();
  };

  const handleToggle = (row) => {
    localSettingsApi.toggle(KEY, row.id);
    load();
  };

  const columns = [
    { field: 'sr_no', headerName: '#',             width: 60 },
    { field: 'name',  headerName: 'Qualification', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
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
            <MoreVertical size={16} />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(p.row)} sx={{ color: 'red' }}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      ),
    },
  ];

  if (loading) return <InlineLoader text="Loading qualifications..." variant="ring" size="lg" />;

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
              <div className="p-2 bg-emerald-100 rounded-lg">
                <GraduationCap size={22} className="text-emerald-700" />
              </div>
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

        {/* SEARCH */}
        <div className="mb-4">
          <TextField size="small" placeholder="Search qualifications..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 320 }} />
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
            {editing ? 'Edit Qualification' : 'Add Qualification'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth autoFocus label="Qualification Name" margin="normal" size="small"
              value={formName} onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Bachelor's"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
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

export default QualificationsManagement;
