import React, { useState, useEffect, useRef } from "react";
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import Button from "components/ui/Button";
import { Plus, ArrowLeft, MoreVertical, Building2, Upload, Trash2, CheckCircle, XCircle, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { GRID_SX, GRID_INITIAL_STATE, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';

const BulkBtn = ({ onClick, icon: Icon, label, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm ${className}`}
  >
    <Icon size={15} /> {label}
  </button>
);

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

const ExamCentersManagement = () => {
  const navigate  = useNavigate();
  const importRef = useRef(null);

  const [allRows,   setAllRows]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [importing, setImporting] = useState(false);
  const [cities,    setCities]    = useState([]);   // full city objects with district_id
  const [districts, setDistricts] = useState([]);   // for name lookup
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    name: '',
    city: '',
    status: ''
  });

  const filterConfig = [
    {
      name: 'name',
      label: 'Center Name',
      type: 'text',
      placeholder: 'Filter by center name'
    },
    {
      name: 'city',
      label: 'City',
      type: 'select',
      options: cities.map(c => ({ value: c.city || c.name, label: c.city || c.name }))
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      name: '',
      city: '',
      status: ''
    });
  };

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [selectionModel,  setSelectionModel]  = useState([]);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [formData, setFormData] = useState({ name: "", city: "", capacity: "", district_id: "", district_name: "" });

  /* ── FETCH ALL (client-side search needs full dataset) ── */
  const fetchCenters = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/exam-centers?per_page=1000`, { headers: getHeaders() });
      const result = await res.json();
      if (result.status === 200 || result.success) {
        const data = result.data?.data ?? result.data ?? [];
        setAllRows(data.map((item, i) => ({
          id:          item.hash_id || item.id,
          sr_no:       i + 1,
          hash_id:     item.hash_id,
          name:        item.name,
          city:        item.city,
          district_id: item.district_id || null,
          capacity:    item.capacity,
          created_at:  item.created_at,
          status:      item.status ?? "active",
        })));
      } else {
        toast.error(result.message || "Failed to load exam centers");
        setAllRows([]);
      }
    } catch { toast.error("Server error"); setAllRows([]); }
    finally { setLoading(false); }
  };

  // Fetch full city list (includes district_id if set via Cities Management)
  const fetchCities = async () => {
    try {
      const res    = await fetch(`${API_BASE}/settings/cities?per_page=1000`, { headers: getHeaders() });
      const result = await res.json();
      if (result.status === 200 || result.success) {
        const data = result.data?.data ?? result.data ?? [];
        setCities(data.map((c) => ({
          hash_id:     c.hash_id || c.id,
          city:        c.city || c.name,
          district_id: c.district_id || null,
        })));
      }
    } catch {}
  };

  const fetchDistricts = async () => {
    try {
      const res    = await fetch(`${API_BASE}/settings/districts?per_page=1000`, { headers: getHeaders() });
      const result = await res.json();
      if (result.status === 200 || result.success)
        setDistricts(result.data?.data ?? result.data ?? []);
    } catch {}
  };

  useEffect(() => { Promise.all([fetchCenters(), fetchCities(), fetchDistricts()]); }, []); // eslint-disable-line

  // Resolve district name from a district_id
  const getDistrictName = (districtId) => {
    if (!districtId) return null;
    const d = districts.find((d) => (d.hash_id || d.id) === districtId);
    return d?.name ?? null;
  };

  // When city selection changes → auto-populate district
  const handleCityChange = (cityName) => {
    const cityObj    = cities.find((c) => c.city === cityName);
    const districtId = cityObj?.district_id ?? "";
    setFormData((p) => ({
      ...p,
      city:          cityName,
      district_id:   districtId,
      district_name: districtId ? (getDistrictName(districtId) ?? "") : "",
    }));
  };

  /* ── CLIENT-SIDE SEARCH ── */
  const filteredRows = allRows.filter((row) => {
    // Basic search term filter
    const q = searchTerm.toLowerCase();
    const searchMatch = !searchTerm.trim() || 
      row.name?.toLowerCase().includes(q) ||
      row.city?.toLowerCase().includes(q) ||
      String(row.capacity).includes(q);
    
    if (!searchMatch) return false;

    // Advanced filters
    if (filters.name && !row.name?.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    if (filters.city && row.city !== filters.city) {
      return false;
    }

    if (filters.status && row.status !== filters.status) {
      return false;
    }
    
    return true;
  });

  const total        = allRows.length;
  const totalCapacity= allRows.reduce((s, r) => s + (Number(r.capacity) || 0), 0);

  /* ── MENU ── */
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };
  const openAdd = () => {
    setEditingCenter(null);
    setFormData({ name: "", city: "", capacity: "", district_id: "", district_name: "" });
    setOpenModal(true);
  };

  const handleEdit = () => {
    const distId   = selectedRow.district_id || "";
    const distName = distId ? (getDistrictName(distId) ?? "") : "";
    setEditingCenter(selectedRow);
    setFormData({
      name:          selectedRow.name,
      city:          selectedRow.city,
      capacity:      String(selectedRow.capacity ?? ""),
      district_id:   distId,
      district_name: distName,
    });
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── SINGLE DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return; handleMenuClose();
    if (!await confirmDelete({ title: 'Delete Exam Center', identifier: selectedRow.name })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/exam-centers/${selectedRow.hash_id}/delete`, { method: "DELETE", headers: getHeaders(false) });
      const r   = await res.json();
      if (r.status === 200 || r.success) { toast.success("Deleted"); setSelectionModel((p) => p.filter((id) => id !== selectedRow.hash_id)); fetchCenters(); }
      else toast.error(r.message || "Delete failed");
    } catch { toast.error("Delete failed"); }
  };

  /* ── BULK ACTIONS ── */
  const bulkAction = async (url, method, body, successMsg) => {
    try {
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      const r   = await res.json();
      if (r.status === 200 || r.success) { toast.success(r.success || successMsg); setSelectionModel([]); fetchCenters(); }
      else toast.error(r.message || "Action failed");
    } catch { toast.error("Action failed"); }
  };

  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: 'Delete Exam Centers', message: `Are you sure you want to delete ${selectionModel.length} center${selectionModel.length > 1 ? 's' : ''}?` })) return;
    bulkAction(`${API_BASE}/settings/exam-centers/bulk-delete`, "DELETE", { hashes: selectionModel }, "Deleted");
  };
  const handleBulkStatus = (status) => {
    if (!selectionModel.length) return;
    bulkAction(`${API_BASE}/settings/exam-centers/bulk-status`, "PUT", { hashes: selectionModel, status }, `Marked as ${status}`);
  };

  /* ── SAVE ── */
  const handleSubmit = async () => {
    if (!formData.name.trim())    { toast.error("Center name is required"); return; }
    if (!formData.city.trim())    { toast.error("City is required"); return; }
    if (!formData.capacity || Number(formData.capacity) <= 0) { toast.error("Valid capacity required"); return; }
    setSaving(true);
    try {
      const isUpdate = !!editingCenter;
      const url = isUpdate ? `${API_BASE}/settings/exam-centers/${editingCenter.hash_id}/update` : `${API_BASE}/settings/exam-centers/store`;
      const res = await fetch(url, { method: isUpdate ? "PUT" : "POST", headers: getHeaders(), body: JSON.stringify({ name: formData.name.trim(), city: formData.city.trim(), capacity: Number(formData.capacity) }) });
      const r   = await res.json();
      if (r.status === 200 || r.status === 201 || r.success) { toast.success(isUpdate ? "Updated" : "Created"); setOpenModal(false); fetchCenters(); }
      else toast.error(r.message || "Operation failed");
    } catch { toast.error("Operation failed"); }
    finally { setSaving(false); }
  };

  /* ── IMPORT ── */
  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    setImporting(true);
    try {
      const body = new FormData(); body.append("file", file);
      const res = await fetch(`${API_BASE}/settings/exam-centers/import`, { method: "POST", headers: getHeaders(false), body });
      const r   = await res.json();
      if (r.status === 200 || r.success) { toast.success(r.message || "Import successful"); fetchCenters(); }
      else toast.error(r.message || "Import failed");
    } catch { toast.error("Import failed"); }
    finally { setImporting(false); }
  };

  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`${API_BASE}/settings/exam-centers/${row.hash_id || row.id}/update`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          name: row.name,
          city: row.city,
          capacity: row.capacity,
          status: newStatus,
        }),
      });
      const r = await res.json();
      if (res.ok || r.status === 200 || r.success) {
        toast.success(`Center marked as ${newStatus}`);
        fetchCenters();
      } else toast.error(r.message || "Status update failed");
    } catch { toast.error("Status update failed"); }
  };

  const columns = [
    { field: "sr_no",     headerName: "#",           width: 60 },
    { field: "name",      headerName: "Center Name", flex: 1, minWidth: 200 },
    { field: "city",      headerName: "City",        width: 140 },
    {
      field: "district_id",
      headerName: "District",
      width: 170,
      renderCell: (p) => {
        // Exam centers have no district_id of their own.
        // Resolve via: row.city (name) → cities[] → district_id → districts[] → name
        const cityObj    = cities.find((c) => c.city === p.row.city);
        const districtId = cityObj?.district_id || p.value;
        const name       = getDistrictName(districtId);
        return name
          ? <span className="text-slate-700 text-sm">{name}</span>
          : <span className="text-slate-400 text-xs">—</span>;
      },
    },
    { field: "capacity",  headerName: "Capacity",    width: 100, renderCell: (p) => <span className="font-semibold text-slate-700">{Number(p.value).toLocaleString()}</span> },
    { field: "actions",   headerName: "Actions",     width: 75, sortable: false,
      renderCell: (p) => <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}><MoreVertical size={18} /></IconButton> },
  ];

  if (loading && allRows.length === 0)
    return <div className="flex justify-center items-center min-h-screen"><InlineLoader text="Loading exam centers..." variant="ring" size="lg" /></div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate("/dashboard/settings")} className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Building2 size={22} className="text-blue-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Exam Centers</h1>
                <p className="text-sm text-slate-500">Manage examination venues and their capacities</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 border border-emerald-700 text-emerald-800 font-medium rounded-lg hover:bg-emerald-50 transition-all duration-200 flex items-center gap-2 text-sm disabled:opacity-60"
            >
              <Upload size={15} /> {importing ? "Importing…" : "Import Excel"}
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Plus size={15} /> Add Center
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"><CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total Centers</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2></CardContent></Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200"><CardContent className="p-5"><p className="text-sm text-violet-700 font-medium">Total Capacity</p><h2 className="text-3xl font-bold text-violet-900 mt-1">{totalCapacity.toLocaleString()}</h2></CardContent></Card>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">

          {selectionModel.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700 mr-1">{selectionModel.length} selected</span>
              <BulkBtn onClick={() => handleBulkStatus("active")}   icon={CheckCircle} label="Mark Active"
                className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white" />
              <BulkBtn onClick={() => handleBulkStatus("inactive")} icon={XCircle}     label="Mark Inactive"
                className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white" />
              <BulkBtn onClick={handleBulkDelete}                   icon={Trash2}       label="Delete"
                className="bg-gradient-to-br from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white" />
            </div>
          )}
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Exam Centers"
        />

        {/* GRID — client-side pagination + search */}
        <TooltipDataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]}
          loading={loading}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(s) => setSelectionModel(s)}
          sx={GRID_SX}
        />

        {/* MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>
        </Menu>

        {/* MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold">{editingCenter ? "Edit Exam Center" : "Add Exam Center"}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth label="Center Name" margin="normal" size="small" autoFocus
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Govt School XYZ"
            />
            <TextField
              fullWidth select label="City" margin="normal" size="small"
              value={formData.city}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <MenuItem value=""><em>Select a city</em></MenuItem>
              {cities.length > 0
                ? cities.map((c) => <MenuItem key={c.hash_id} value={c.city}>{c.city}</MenuItem>)
                : <MenuItem disabled value="">No cities — add cities first</MenuItem>}
            </TextField>
            <TextField
              fullWidth label="Capacity (seats)" margin="normal" size="small"
              type="number" inputProps={{ min: 1 }}
              value={formData.capacity}
              onChange={(e) => setFormData((p) => ({ ...p, capacity: e.target.value }))}
              placeholder="e.g. 500"
            />
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button type="button" onClick={() => setOpenModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 text-sm disabled:opacity-60">
              {saving ? "Saving…" : editingCenter ? "Update" : "Create"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default ExamCentersManagement;
