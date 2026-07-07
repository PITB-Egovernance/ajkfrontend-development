import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField, IconButton, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import confirmStatus from 'components/ui/confirmStatus';
import Config from 'config/baseUrl';
import { InlineLoader } from 'components/ui/Loader';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import { hasPermission } from 'utils/permissions';
import settingsCatalogApi from 'api/settingsCatalogApi';
import { fetchPaginatedApiList } from 'utils/paginatedApiUtils';

const PERM = 'settings.departments';
const API_BASE = Config.apiUrl;

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
  status:          'active',
};

const DepartmentsManagement = () => {
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;
  const navigate = useNavigate();

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [allRows, setAllRows] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [filters, setFilters] = useState({
    department_name: '',
    contact_person: '',
    status: '',
  });

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [formData,    setFormData]    = useState(emptyForm);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');
  const hasActiveFilters = Object.values(filters).some((value) => String(value ?? '').trim() !== '');

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const filterConfig = [
    {
      name: 'department_name',
      label: 'Department Name',
      type: 'text',
      placeholder: 'Filter by department name',
    },
    {
      name: 'contact_person',
      label: 'Contact Person',
      type: 'text',
      placeholder: 'Filter by contact person',
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
    setFilters({ department_name: '', contact_person: '', status: '' });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const formatDepartmentRows = (items, startIndex = 0) => items.map((item, i) => ({
    id:              item.hash_id || item.id,
    sr_no:           startIndex + i + 1,
    hash_id:         item.hash_id,
    department_name: item.department_name || item.name,
    contact_person:  item.contact_person  || '',
    phone_number:    item.phone_number    || '',
    mobile_number:   item.mobile_number   || '',
    status:          String(item.status || 'active').toLowerCase(),
  }));

  const matchesFilters = (row) => {
    const departmentName = filters.department_name.trim().toLowerCase();
    const contactPerson = filters.contact_person.trim().toLowerCase();
    const status = filters.status.trim().toLowerCase();

    if (departmentName && !String(row.department_name || '').toLowerCase().includes(departmentName)) {
      return false;
    }
    if (contactPerson && !String(row.contact_person || '').toLowerCase().includes(contactPerson)) {
      return false;
    }
    if (status && String(row.status || '').toLowerCase() !== status) {
      return false;
    }

    return true;
  };

  const fetchPage = async (page = paginationModel.page, pageSize = paginationModel.pageSize) => {
    setLoading(true);
    try {
      const { items, pagination } = await settingsCatalogApi.getPage('departments', page + 1, pageSize);
      setRows(formatDepartmentRows(items, page * pageSize));
      setTotal(Number(pagination.total) || 0);
      const backendPage = Math.max(0, Number(pagination.current_page || page + 1) - 1);
      const backendPageSize = Number(pagination.per_page || pageSize);
      if (backendPage !== paginationModel.page || backendPageSize !== paginationModel.pageSize) {
        setPaginationModel({ page: backendPage, pageSize: backendPageSize });
      }
    } catch { toast.error('Server error while loading departments'); }
    finally { setLoading(false); }
  };

  const fetchAllForFilters = async () => {
    setLoading(true);
    try {
      const data = await fetchPaginatedApiList(`${API_BASE}/settings/departments`, {
        headers: settingsCatalogApi.getHeaders(),
        perPage: 200,
      });
      setAllRows(formatDepartmentRows(data));
      setTotal(Array.isArray(data) ? data.length : 0);
    } catch {
      toast.error('Server error while loading departments');
      setAllRows([]);
      setTotal(0);
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
      status:          String(row.status || 'active').toLowerCase(),
    });
    setFormError('');
    setOpenModal(true);
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleSubmit = async () => {
    if (!formData.department_name.trim()) { setFormError('Department name is required.'); return; }
    if (!formData.phone_number.trim())    { setFormError('Phone number is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const isUpdate = !!editing;
      const payload = {
          department_name: formData.department_name.trim(),
          contact_person:  formData.contact_person.trim(),
          phone_number:    formData.phone_number.trim(),
          mobile_number:   formData.mobile_number.trim(),
          status:          formData.status,
        };
      const result = isUpdate
        ? await settingsCatalogApi.update('departments', editing.hash_id, payload)
        : await settingsCatalogApi.create('departments', payload);
      if (result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? 'Department updated successfully' : 'Department created successfully');
        setOpenModal(false);
        if (hasActiveFilters) {
          fetchAllForFilters();
        } else {
          fetchPage(paginationModel.page, paginationModel.pageSize);
        }
      } else {
        toast.error(result.message || (isUpdate ? 'Failed to update department' : 'Failed to create department'));
      }
    } catch { toast.error('Server error while saving department'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    const row = selectedRow;
    handleMenuClose();
    if (!await confirmDelete({ title: 'Delete Department', identifier: row.department_name })) return;
    try {
      const result = await settingsCatalogApi.remove('departments', row.hash_id);
      if (result.success || result.status === 200) {
        toast.success('Department deleted successfully');
        if (!hasActiveFilters && rows.length === 1 && paginationModel.page > 0) {
          setPaginationModel((p) => ({ ...p, page: p.page - 1 }));
        } else if (hasActiveFilters) {
          fetchAllForFilters();
        } else {
          fetchPage(paginationModel.page, paginationModel.pageSize);
        }
      } else {
        toast.error(result.message || 'Failed to delete department');
      }
    } catch { toast.error('Server error while deleting department'); }
  };

  const handleToggleStatus = async (row) => {
    const currentStatus = String(row.status || 'active').toLowerCase();
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!await confirmStatus({ newStatus })) return;

    try {
      const result = await settingsCatalogApi.update('departments', row.hash_id || row.id, {
        department_name: row.department_name,
        contact_person: row.contact_person || '',
        phone_number: row.phone_number || '',
        mobile_number: row.mobile_number || '',
        status: newStatus,
      });

      if (result.success || result.status === 200) {
        toast.success(`Department marked as ${newStatus}`);
        if (hasActiveFilters) {
          fetchAllForFilters();
        } else {
          fetchPage(paginationModel.page, paginationModel.pageSize);
        }
      } else {
        toast.error(result.message || 'Status update failed');
      }
    } catch {
      toast.error('Server error while updating department status');
    }
  };

  const columns = [
    { field: 'sr_no',           headerName: '#',               width: 60 },
    { field: 'department_name', headerName: 'Department Name', flex: 1, minWidth: 200 },
    { field: 'contact_person',  headerName: 'Contact Person',  width: 180,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">N/A</span> },
    { field: 'mobile_number',   headerName: 'Mobile',          width: 140,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">N/A</span> },
    { field: 'phone_number',    headerName: 'Phone',           width: 140,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">N/A</span> },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (p) => (
        <Switch
          checked={String(p.value || '').toLowerCase() === 'active'}
          onChange={() => handleToggleStatus(p.row)}
          inputProps={{ 'aria-label': 'toggle department status' }}
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
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ];

  const filteredRows = (hasActiveFilters ? allRows : rows).filter(matchesFilters);

  if (loading && rows.length === 0) return <InlineLoader text="Loading departments..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: "-webkit-fill-available" }}>

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
          {canAdd && (
            <button onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Department
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6"><p className="text-sm text-blue-700 font-medium">Total Departments</p><h2 className="text-3xl font-bold text-blue-900 mt-2">{total}</h2></CardContent>
          </Card>
        </div>

        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Departments"
        />

        <TooltipDataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50, 100]}
          paginationMode={hasActiveFilters ? 'client' : 'server'}
          rowCount={hasActiveFilters ? filteredRows.length : total}
          loading={loading}
          initialState={{ pagination: { paginationModel: { pageSize: 15, page: 0 } } }}
          autoHeight
          disableRowSelectionOnClick
          sx={gridSx}
        />

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={() => openEdit(selectedRow)}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={handleDelete} sx={{ color: 'red' }}>Delete</MenuItem>}
        </Menu>

        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle className="font-bold">{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {formError && <p className="text-red-600 text-sm mt-2 mb-1">{formError}</p>}
            <TextField fullWidth autoFocus required label="Department Name" margin="normal" size="small"
              value={formData.department_name}
              onChange={(e) => { setFormData((f) => ({ ...f, department_name: e.target.value })); setFormError(''); }}
              placeholder="e.g. Finance Department" />
            <TextField fullWidth label="Contact Person (optional)" margin="normal" size="small"
              value={formData.contact_person}
              onChange={(e) => setFormData((f) => ({ ...f, contact_person: e.target.value }))}
              placeholder="e.g. Ali Khan" />
            <TextField fullWidth required label="Phone Number" margin="normal" size="small"
              value={formData.phone_number}
              onChange={(e) => { setFormData((f) => ({ ...f, phone_number: e.target.value })); setFormError(''); }}
              placeholder="e.g. 05822-123456" />
            <TextField fullWidth label="Mobile Number (optional)" margin="normal" size="small"
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
