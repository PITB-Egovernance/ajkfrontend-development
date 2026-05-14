import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  TextField, IconButton, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { InlineLoader } from 'components/ui/Loader';

const API_BASE = Config.apiUrl;

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

const emptyForm = {
  department_name: '',
  contact_person:  '',
  phone_number:    '',
  mobile_number:   '',
};

const DepartmentsManagement = () => {
  const navigate = useNavigate();

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [formData,    setFormData]    = useState(emptyForm);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/departments`, { headers: getHeaders() });
      const result = await res.json();
      if (result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setRows(data.map((item, i) => ({
          id:              item.hash_id || item.id,
          sr_no:           i + 1,
          hash_id:         item.hash_id,
          department_name: item.department_name || item.name,
          contact_person:  item.contact_person  || '',
          phone_number:    item.phone_number    || '',
          mobile_number:   item.mobile_number   || '',
          status:          item.status          ?? 'active',
        })));
      } else {
        toast.error(result.message || 'Failed to load departments');
      }
    } catch { toast.error('Server error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const activeCount   = rows.filter((r) => r.status === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  const filteredRows = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q ||
      r.department_name?.toLowerCase().includes(q) ||
      r.contact_person?.toLowerCase().includes(q) ||
      r.phone_number?.includes(q) ||
      r.mobile_number?.includes(q);
  });

  const openAdd = () => {
    setEditing(null);
    setFormData(emptyForm);
    setFormError('');
    setOpenModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      department_name: row.department_name || '',
      contact_person:  row.contact_person  || '',
      phone_number:    row.phone_number    || '',
      mobile_number:   row.mobile_number   || '',
    });
    setFormError('');
    setOpenModal(true);
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleSubmit = async () => {
    if (!formData.department_name.trim()) { setFormError('Department name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const isUpdate = !!editing;
      const url      = isUpdate
        ? `${API_BASE}/settings/departments/${editing.hash_id}/update`
        : `${API_BASE}/settings/departments/store`;
      const res      = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          department_name: formData.department_name.trim(),
          contact_person:  formData.contact_person.trim(),
          phone_number:    formData.phone_number.trim(),
          mobile_number:   formData.mobile_number.trim(),
        }),
      });
      const result   = await res.json();
      if (result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Department updated successfully' : 'Department created successfully');
        setOpenModal(false);
        fetchAll();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch { toast.error('Server error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    if (!await confirmDelete({ title: 'Delete Department', identifier: selectedRow.department_name })) {
      setAnchorEl(null); return;
    }
    try {
      const res    = await fetch(`${API_BASE}/settings/departments/${selectedRow.hash_id}/delete`, {
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
    finally { setAnchorEl(null); setSelectedRow(null); }
  };

  const handleToggleStatus = async (row) => {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    try {
      const res    = await fetch(`${API_BASE}/settings/departments/${row.hash_id || row.id}/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          department_name: row.department_name,
          contact_person:  row.contact_person,
          phone_number:    row.phone_number,
          mobile_number:   row.mobile_number,
          status:          newStatus,
        }),
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
    { field: 'sr_no',           headerName: '#',               width: 60 },
    { field: 'department_name', headerName: 'Department Name', flex: 1, minWidth: 200 },
    { field: 'contact_person',  headerName: 'Contact Person',  width: 180,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    { field: 'mobile_number',   headerName: 'Mobile',          width: 140,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    { field: 'phone_number',    headerName: 'Phone',           width: 140,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <IconButton size="small"
          onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedRow(p.row); }}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading) return <InlineLoader text="Loading departments..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        <div className="flex justify-between items-center mb-8">
          <div>
            <button onClick={() => navigate('/dashboard/settings')}
              className="text-sm text-gray-600 flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><Building size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
                <p className="text-sm text-slate-500">Manage organizational departments</p>
              </div>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Department
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6"><p className="text-sm text-blue-700 font-medium">Total Departments</p><h2 className="text-3xl font-bold text-blue-900 mt-2">{rows.length}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6"><p className="text-sm text-emerald-700 font-medium">Active</p><h2 className="text-3xl font-bold text-emerald-900 mt-2">{activeCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6"><p className="text-sm text-red-700 font-medium">Inactive</p><h2 className="text-3xl font-bold text-red-900 mt-2">{inactiveCount}</h2></CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <TextField size="small" placeholder="Search departments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
            sx={{ width: 340 }} />
        </div>

        <DataGrid rows={filteredRows} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={gridSx} />

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => { setAnchorEl(null); setSelectedRow(null); }}>
          <MenuItem onClick={() => openEdit(selectedRow)}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'red' }}>Delete</MenuItem>
        </Menu>

        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle className="font-bold">{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {formError && <p className="text-red-600 text-sm mt-2 mb-1">{formError}</p>}
            <TextField fullWidth autoFocus label="Department Name" margin="normal" size="small"
              value={formData.department_name}
              onChange={(e) => { setFormData((f) => ({ ...f, department_name: e.target.value })); setFormError(''); }}
              placeholder="e.g. Finance Department" />
            <TextField fullWidth label="Contact Person" margin="normal" size="small"
              value={formData.contact_person}
              onChange={(e) => setFormData((f) => ({ ...f, contact_person: e.target.value }))}
              placeholder="e.g. Ali Khan" />
            <TextField fullWidth label="Phone Number" margin="normal" size="small"
              value={formData.phone_number}
              onChange={(e) => setFormData((f) => ({ ...f, phone_number: e.target.value }))}
              placeholder="e.g. 05822-123456" />
            <TextField fullWidth label="Mobile Number" margin="normal" size="small"
              value={formData.mobile_number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 11) setFormData((f) => ({ ...f, mobile_number: val }));
              }}
              inputProps={{ inputMode: 'numeric', maxLength: 11 }}
              placeholder="03XXXXXXXXX" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <button onClick={() => setOpenModal(false)} disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg text-sm disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default DepartmentsManagement;
