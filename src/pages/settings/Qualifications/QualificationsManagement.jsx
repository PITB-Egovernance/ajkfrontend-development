import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, Menu, MenuItem,
} from '@mui/material';
import SearchableSelect from 'components/ui/SearchableSelect';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import confirmStatus from 'components/ui/confirmStatus';
import Config from 'config/baseUrl';
import { InlineLoader } from 'components/ui/Loader';
import { hasPermission } from 'utils/permissions';
import { GRID_SX } from 'utils/gridStyles';
import settingsCatalogApi from 'api/settingsCatalogApi';
import { fetchPaginatedApiList } from 'utils/paginatedApiUtils';
import AdvancedFilter from 'components/tables/AdvancedFilter';
const PERM = 'settings.qualifications';

const API_BASE = Config.apiUrl;

const QualificationsManagement = () => {
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;
  const navigate = useNavigate();

  const [rows,     setRows]     = useState([]);
  const [allRows,  setAllRows]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };
  const [form, setForm] = useState({
    qualification_name: '',
    qualification_type: '',
    status: 'active',
  });
  const [saving,   setSaving]   = useState(false);
  const [filters,  setFilters]  = useState({ name: '', type: '', status: '' });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const hasActiveFilters = Object.values(filters).some((v) => v.trim().length > 0);

  const filterConfig = [
    { name: 'name', label: 'Qualification Name', type: 'text', placeholder: 'Search qualifications...' },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'required', label: 'Required' },
        { value: 'professional', label: 'Professional' },
      ],
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
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ name: '', type: '', status: '' });
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const fetchPage = async (page = paginationModel.page, pageSize = paginationModel.pageSize) => {
    setLoading(true);
    try {
      const { items, pagination } = await settingsCatalogApi.getPage('qualifications', page + 1, pageSize);
      setRows(items.map((item, i) => ({
          id:       item.hash_id || item.id,
          sr_no:    page * pageSize + i + 1,
          hash_id:  item.hash_id,
          name:     item.qualification_name || item.name,
          type:     String(item.type || 'required').toLowerCase(),
          status:   String(item.status || 'active').toLowerCase(),
        })));
      setTotalRows(Number(pagination.total) || 0);
      const backendPage = Math.max(0, Number(pagination.current_page || page + 1) - 1);
      const backendPageSize = Number(pagination.per_page || pageSize);
      if (backendPage !== paginationModel.page || backendPageSize !== paginationModel.pageSize) {
        setPaginationModel({ page: backendPage, pageSize: backendPageSize });
      }
    } catch { toast.error('Server error'); setRows([]); setTotalRows(0); }
    finally { setLoading(false); }
  };

  const fetchAllForSearch = async () => {
    setLoading(true);
    try {
      const data = await fetchPaginatedApiList(`${API_BASE}/settings/qualifications`, {
        headers: settingsCatalogApi.getHeaders(),
        perPage: 200,
      });
      const mapped = (Array.isArray(data) ? data : []).map((item, i) => ({
        id:       item.hash_id || item.id,
        sr_no:    i + 1,
        hash_id:  item.hash_id,
        name:     item.qualification_name || item.name,
        type:     String(item.type || 'required').toLowerCase(),
        status:   String(item.status || 'active').toLowerCase(),
      }));
      setAllRows(mapped);
      setTotalRows(mapped.length);
    } catch {
      toast.error('Server error');
      setAllRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasActiveFilters) {
      fetchAllForSearch();
      return;
    }
    fetchPage(paginationModel.page, paginationModel.pageSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveFilters, paginationModel.page, paginationModel.pageSize]);


  const filtered = (hasActiveFilters ? allRows : rows).filter((r) => {
    if (filters.name.trim() && !r.name?.toLowerCase().includes(filters.name.trim().toLowerCase())) return false;
    if (filters.type && r.type !== filters.type) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ qualification_name: '', qualification_type: '', status: 'active' });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      qualification_name: row.name || '',
      qualification_type: String(row.type || 'required').toLowerCase(),
      status: String(row.status || 'active').toLowerCase(),
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.qualification_name.trim()) { toast.error('Qualification name is required'); return; }
    if (!form.qualification_type) { toast.error('Please select the qualification type'); return; }
    setSaving(true);
    try {
      const isUpdate = !!editing;
      const payload = {
          qualification_name: form.qualification_name.trim(),
          type: form.qualification_type,
          status: form.status,
        };
      const result = isUpdate
        ? await settingsCatalogApi.update('qualifications', editing.hash_id, payload)
        : await settingsCatalogApi.create('qualifications', payload);
      if (result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Updated successfully' : 'Qualification added');
        setOpen(false);
        if (hasActiveFilters) {
          fetchAllForSearch();
        } else {
          fetchPage(paginationModel.page, paginationModel.pageSize);
        }
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch { toast.error('Server error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    if (!await confirmDelete({ title: 'Delete Qualification', identifier: row.name })) return;
    try {
      const result = await settingsCatalogApi.remove('qualifications', row.hash_id);
      if (result.success || result.status === 200) {
        toast.success('Deleted');
        if (!hasActiveFilters && rows.length === 1 && paginationModel.page > 0) {
          setPaginationModel((p) => ({ ...p, page: p.page - 1 }));
        } else if (hasActiveFilters) {
          fetchAllForSearch();
        } else {
          fetchPage(paginationModel.page, paginationModel.pageSize);
        }
      } else {
        toast.error(result.message || 'Delete failed');
      }
    } catch { toast.error('Server error'); }
  };

  const handleToggle = async (row) => {
    const currentStatus = String(row.status || 'active').toLowerCase();
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!await confirmStatus({ newStatus })) return;

    try {
      const result = await settingsCatalogApi.update('qualifications', row.hash_id || row.id, {
        qualification_name: row.name,
        type: row.type,
        status: newStatus,
      });
      if (result.success || result.status === 200) {
        toast.success(`Marked as ${newStatus}`);
        if (hasActiveFilters) {
          fetchAllForSearch();
        } else {
          fetchPage(paginationModel.page, paginationModel.pageSize);
        }
      } else {
        toast.error(result.message || 'Status update failed');
      }
    } catch { toast.error('Server error'); }
  };

  const columns = [
    { field: 'sr_no', headerName: '#',             width: 60 },
    { field: 'name',  headerName: 'Qualification',  flex: 1 },
    {
      field: 'type',
      headerName: 'Type',
      width: 150,
      renderCell: (p) =>
        String(p.value).toLowerCase() === 'professional' ? 'Professional' : 'Required',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (p) => (
        <Switch
          checked={String(p.value || '').toLowerCase() === 'active'}
          onChange={() => handleToggle(p.row)}
          inputProps={{ 'aria-label': 'toggle qualification status' }}
          size="small"
          disabled={!canEdit}
          color={String(p.value || '').toLowerCase() === 'active' ? 'success' : 'error'}
        />
      ),
    },
    ...(canRowActions ? [{
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <IconButton onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ];

  if (loading && rows.length === 0 && allRows.length === 0) return <InlineLoader text="Loading qualifications..." variant="ring" size="lg" />;

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
              <div className="p-2 bg-emerald-100 rounded-lg"><GraduationCap size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Qualifications</h1>
                <p className="text-sm text-slate-500">Manage academic qualification levels</p>
              </div>
            </div>
          </div>
          {canAdd && (
            <button onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Qualification
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{totalRows}</h2></CardContent>
          </Card>
        </div>

        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Qualifications"
        />

        <TooltipDataGrid rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          paginationMode={hasActiveFilters ? 'client' : 'server'}
          rowCount={hasActiveFilters ? filtered.length : totalRows}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={GRID_SX}
          loading={loading} />

        {/* 3-dot action menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) openEdit(r); }}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) handleDelete(r); }} sx={{ color: 'red' }}>Delete</MenuItem>}
        </Menu>

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">{editing ? 'Edit Qualification' : 'Add Qualification'}</DialogTitle>
          <DialogContent>
            <TextField fullWidth autoFocus label="Qualification Name" margin="normal" size="small"
              value={form.qualification_name}
              onChange={(e) => setForm((current) => ({
                ...current,
                qualification_name: e.target.value,
              }))}
              placeholder="e.g. Bachelor's Degree"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            <SearchableSelect
              label="Type"
              value={form.qualification_type}
              onChange={(e) => setForm((current) => ({
                ...current,
                qualification_type: e.target.value,
              }))}
              options={[
                { value: 'required', label: 'Required' },
                { value: 'professional', label: 'Professional' },
              ]}
              placeholder="— Select Type —"
            />
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

