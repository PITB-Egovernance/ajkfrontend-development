import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField, IconButton, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, Switch,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import confirmStatus from 'components/ui/confirmStatus';
import Config from 'config/baseUrl';
import { InlineLoader } from 'components/ui/Loader';
import { hasPermission } from 'utils/permissions';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import { GRID_SX, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';
import settingsCatalogApi from 'api/settingsCatalogApi';
import { fetchPaginatedApiList } from 'utils/paginatedApiUtils';

const PERM = 'settings.degrees';

const API_BASE = Config.apiUrl;

const emptyForm = { degree_name: '', degree_group: '', status: 'active' };

const DegreesManagement = () => {
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;
  const navigate = useNavigate();

  const [rows,   setRows]   = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [groups, setGroups] = useState([]);   // all known degree groups — used for the filter dropdown
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [filters, setFilters] = useState({ degree_name: '', degree_group: '', status: '' });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const hasActiveFilters = Object.values(filters).some((value) => String(value ?? '').trim() !== '');

  const mapDegreeRow = (item, i) => ({
    id:           item.hash_id || item.id,
    sr_no:        i + 1,
    hash_id:      item.hash_id,
    degree_name:  item.degree_name || item.name || '',
    degree_group: item.degree_group || '',
    status:       String(item.status || 'active').toLowerCase(),
  });

  const matchesFilters = (row) => {
    const name = filters.degree_name.trim().toLowerCase();
    if (name && !String(row.degree_name || '').toLowerCase().includes(name)) return false;
    if (filters.degree_group && row.degree_group !== filters.degree_group) return false;
    if (filters.status && String(row.status || '').toLowerCase() !== filters.status) return false;
    return true;
  };

  const fetchPage = async (page = paginationModel.page, pageSize = paginationModel.pageSize) => {
    setLoading(true);
    try {
      const { items, pagination } = await settingsCatalogApi.getPage('degrees', page + 1, pageSize);
      const mapped = (Array.isArray(items) ? items : []).filter(Boolean).map((item, index) =>
        mapDegreeRow(item, page * pageSize + index)
      );
      setRows(mapped);
      setTotalRows(Number(pagination.total) || 0);
      const backendPage = Math.max(0, Number(pagination.current_page || page + 1) - 1);
      const backendPageSize = Number(pagination.per_page || pageSize);
      if (backendPage !== paginationModel.page || backendPageSize !== paginationModel.pageSize) {
        setPaginationModel({ page: backendPage, pageSize: backendPageSize });
      }
    } catch { toast.error('Server error'); setRows([]); setTotalRows(0); }
    finally { setLoading(false); }
  };

  const fetchAllForFilters = async () => {
    setLoading(true);
    try {
      const data = await fetchPaginatedApiList(`${API_BASE}/settings/degrees`, {
        headers: settingsCatalogApi.getHeaders(),
        perPage: 200,
      });
      const mapped = (Array.isArray(data) ? data : []).filter(Boolean).map(mapDegreeRow);
      setAllRows(mapped);
      setTotalRows(mapped.length);
      setGroups([...new Set(mapped.map((d) => d.degree_group).filter(Boolean))]);
    } catch {
      toast.error('Server error');
      setAllRows([]);
      setTotalRows(0);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasActiveFilters) {
      fetchAllForFilters();
      return;
    }
    fetchPage(paginationModel.page, paginationModel.pageSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveFilters, paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await fetchPaginatedApiList(`${API_BASE}/settings/degrees`, {
          headers: settingsCatalogApi.getHeaders(),
          perPage: 200,
        });
        const mapped = (Array.isArray(data) ? data : []).filter(Boolean).map(mapDegreeRow);
        setGroups([...new Set(mapped.map((d) => d.degree_group).filter(Boolean))]);
      } catch {
        setGroups([]);
      }
    };
    fetchGroups();
  }, []);

  const filterConfig = [
    { name: 'degree_name',  label: 'Degree Name',  type: 'text',   placeholder: 'Filter by degree name' },
    { name: 'degree_group', label: 'Degree Group', type: 'select', options: groups.map((g) => ({ value: g, label: g })) },
    { name: 'status',       label: 'Status',       type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ degree_name: '', degree_group: '', status: '' });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const filtered = (hasActiveFilters ? allRows : rows).filter((r) => {
    const matchName  = !filters.degree_name.trim() || r.degree_name?.toLowerCase().includes(filters.degree_name.toLowerCase());
    const matchGroup = !filters.degree_group || r.degree_group === filters.degree_group;
    const matchStatus = !filters.status || r.status === filters.status;
    return matchName && matchGroup && matchStatus;
  });

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      degree_name: row.degree_name,
      degree_group: row.degree_group || '',
      status: String(row.status || 'active').toLowerCase(),
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.degree_name.trim()) { toast.error('Degree name is required'); return; }
    setSaving(true);
    try {
      const isUpdate = !!editing;
      const payload = {
          degree_name: form.degree_name.trim(),
          degree_group: form.degree_group.trim(),
          status: form.status,
        };
      const result = isUpdate
        ? await settingsCatalogApi.update('degrees', editing.hash_id, payload)
        : await settingsCatalogApi.create('degrees', payload);
      if (result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Updated successfully' : 'Degree added');
        setOpen(false);
        if (hasActiveFilters) {
          fetchAllForFilters();
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
    if (!await confirmDelete({ title: 'Delete Degree', identifier: row.degree_name })) return;
    try {
      const result = await settingsCatalogApi.remove('degrees', row.hash_id);
      if (result.success || result.status === 200) {
        toast.success('Deleted');
        if (!hasActiveFilters && rows.length === 1 && paginationModel.page > 0) {
          setPaginationModel((p) => ({ ...p, page: p.page - 1 }));
        } else if (hasActiveFilters) {
          fetchAllForFilters();
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

    const rowId = row.hash_id || row.id;
    setTogglingId(rowId);

    try {
      const result = await settingsCatalogApi.update('degrees', rowId, {
        degree_name: row.degree_name,
        degree_group: row.degree_group || '',
        status: newStatus,
      });

      if (result.success || result.status === 200) {
        if (hasActiveFilters) {
          setAllRows((currentRows) =>
            currentRows.map((degree) =>
              (degree.hash_id || degree.id) === rowId
                ? { ...degree, status: newStatus }
                : degree
            )
          );
        } else {
          setRows((currentRows) =>
            currentRows.map((degree) =>
              (degree.hash_id || degree.id) === rowId
                ? { ...degree, status: newStatus }
                : degree
            )
          );
        }
        toast.success(`Marked as ${newStatus}`);
      } else {
        toast.error(result.message || 'Status update failed');
      }
    } catch {
      toast.error('Server error');
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    { field: 'sr_no',        headerName: '#',          width: 60 },
    { field: 'degree_name',  headerName: 'Degree',     flex: 1 },
    { field: 'degree_group', headerName: 'Group',      width: 200,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">N/A</span> },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (p) => (
        <Switch
          checked={String(p.value || '').toLowerCase() === 'active'}
          onChange={() => handleToggle(p.row)}
          inputProps={{ 'aria-label': 'toggle degree status' }}
          size="small"
          disabled={!canEdit || togglingId === (p.row.hash_id || p.row.id)}
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

  if (loading && rows.length === 0) return <InlineLoader text="Loading degrees..." variant="ring" size="lg" />;

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
              <div className="p-2 bg-indigo-100 rounded-lg"><BookOpen size={22} className="text-indigo-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Degrees</h1>
                <p className="text-sm text-slate-500">Manage academic degrees by group</p>
              </div>
            </div>
          </div>
          {canAdd && (
            <button onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Degree
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
          title="Filter Degrees"
        />

        <TooltipDataGrid rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={GRID_PAGE_SIZE_OPTIONS}
          paginationMode={hasActiveFilters ? 'client' : 'server'}
          rowCount={hasActiveFilters ? filtered.length : totalRows}
          loading={loading} autoHeight disableRowSelectionOnClick sx={GRID_SX} />

        {/* 3-dot action menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) openEdit(r); }}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); if (r) handleDelete(r); }} sx={{ color: 'red' }}>Delete</MenuItem>}
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
