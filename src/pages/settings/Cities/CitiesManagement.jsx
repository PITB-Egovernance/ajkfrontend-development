import React, { useState, useEffect } from "react";
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
import { Plus, ArrowLeft, MoreVertical, MapPin, Trash2, CheckCircle, XCircle, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from 'components/ui/ConfirmDelete';
import confirmStatus from 'components/ui/confirmStatus';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { GRID_SX, GRID_INITIAL_STATE, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';

const BulkBtn = ({ onClick, icon: Icon, label, className = "" }) => (
  <button type="button" onClick={onClick}
    className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm ${className}`}>
    <Icon size={15} /> {label}
  </button>
);

// Districts excluded from the city-linking dropdown — these are quota categories, not geographic cities.
const EXCLUDED_DISTRICTS = [
  "refugee in pakistan",
  "special person",
  "open merit",
  "refugees 1989",
  "refugees settle in pakistan (1947)",
];

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

const CitiesManagement = () => {
  const navigate = useNavigate();

  // City→district mapping cache (backend doesn't return district_id yet)
  const DISTRICT_MAP_KEY = 'ajk_city_district_map';
  const loadDistrictMap  = () => { try { return JSON.parse(localStorage.getItem(DISTRICT_MAP_KEY) || '{}'); } catch { return {}; } };
  const saveDistrictMap  = (map) => { try { localStorage.setItem(DISTRICT_MAP_KEY, JSON.stringify(map)); } catch {} };

  const [allRows,    setAllRows]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ city: '', status: '' });

  // Districts for the city-district linking dropdown
  const [districts,         setDistricts]         = useState([]);
  const [loadingDistricts,  setLoadingDistricts]  = useState(false);

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [selectionModel,  setSelectionModel]  = useState([]);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [formData,    setFormData]    = useState({ city_name: "", district_id: "" });

  /* ── FETCH ALL ── */
  const fetchCities = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/cities?per_page=1000`, { headers: getHeaders() });
      const result = await res.json();
      if (result.status === 200 || result.success) {
        const data     = result.data?.data ?? result.data ?? [];
        setAllRows(data.map((item, i) => {
          const hid = item.hash_id || item.id;
          return {
            id:          hid,
            sr_no:       i + 1,
            hash_id:     item.hash_id,
            city:          item.city_name || item.city || item.name,
            district_name: item.district_name || null,
            district_id:   item.district_id   || null,
            created_at:  item.created_at,
            status:      item.status ?? "active",
          };
        }));
      } else {
        toast.error(result.message || "Failed to load cities");
        setAllRows([]);
      }
    } catch { toast.error("Server error"); setAllRows([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { Promise.all([fetchCities(), fetchDistricts()]); }, []); // eslint-disable-line

  /* ── FETCH DISTRICTS FOR DROPDOWN ── */
  const fetchDistricts = async () => {
    setLoadingDistricts(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/districts?per_page=1000`, { headers: getHeaders() });
      const result = await res.json();
      if (result.status === 200 || result.success) {
        const data = result.data?.data ?? result.data ?? [];
        const filtered = data.filter(
          (d) => !EXCLUDED_DISTRICTS.includes((d.name || "").toLowerCase().trim())
        );
        setDistricts(filtered);
      }
    } catch { /* non-critical — district dropdown stays empty */ }
    finally { setLoadingDistricts(false); }
  };

  /* ── FILTER CONFIGURATION ── */
  const filterConfig = [
    {
      name: 'city',
      label: 'City Name',
      type: 'text',
      placeholder: 'Filter by city name'
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

  /* ── FILTER HANDLERS ── */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      city: '',
      status: ''
    });
  };

  /* ── CLIENT-SIDE FILTERING ── */
  const filteredRows = allRows.filter((row) => {
    // Basic search term filter
    if (searchTerm.trim() && !row.city?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Advanced filters
    if (filters.city && !row.city?.toLowerCase().includes(filters.city.toLowerCase())) {
      return false;
    }
    
    if (filters.status && row.status !== filters.status) {
      return false;
    }
    
    return true;
  });

  const total        = allRows.length;
  const activeCount  = allRows.filter((r) => (r.status ?? "active") === "active").length;
  const inactiveCount= allRows.filter((r) => r.status === "inactive").length;

  /* ── MENU ── */
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };
  const openAdd = () => { setEditingCity(null); setFormData({ city_name: "", district_id: "" }); setOpenModal(true); };
  const handleEdit = () => {
    setEditingCity(selectedRow);
    setFormData({ 
      city_name: selectedRow.city, 
      district_id: selectedRow.district_id || "" 
    });
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── SINGLE DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return; handleMenuClose();
    if (!await confirmDelete({ title: 'Delete City', identifier: selectedRow.city })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/cities/${selectedRow.hash_id}/delete`, { method: "DELETE", headers: getHeaders(false) });
      const r   = await res.json();
      if (r.status === 200 || r.success) { toast.success("Deleted"); setSelectionModel((p) => p.filter((id) => id !== selectedRow.hash_id)); fetchCities(); }
      else toast.error(r.message || "Delete failed");
    } catch { toast.error("Delete failed"); }
  };

  /* ── BULK ACTIONS ── */
  const bulkAction = async (url, method, body, successMsg) => {
    try {
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      const r   = await res.json();
      if (r.status === 200 || r.success) { toast.success(r.success || successMsg); setSelectionModel([]); fetchCities(); }
      else toast.error(r.message || "Action failed");
    } catch { toast.error("Action failed"); }
  };

  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: 'Delete Cities', message: `Are you sure you want to delete ${selectionModel.length} cit${selectionModel.length > 1 ? 'ies' : 'y'}?` })) return;
    bulkAction(`${API_BASE}/settings/cities/bulk-delete`, "DELETE", { hashes: selectionModel }, "Deleted");
  };
  const handleBulkStatus = (status) =>
    selectionModel.length && bulkAction(`${API_BASE}/settings/cities/bulk-status`, "PUT", { hashes: selectionModel, status }, `Marked as ${status}`);

  /* ── SAVE ── */
  const handleSubmit = async () => {
    if (!formData.city_name.trim()) { toast.error("City name is required"); return; }
    setSaving(true);
    try {
      const isUpdate = !!editingCity;
      const url = isUpdate
        ? `${API_BASE}/settings/cities/${editingCity.hash_id}/update`
        : `${API_BASE}/settings/cities/store`;
      const payload = { city: formData.city_name.trim() };
      if (formData.district_id) payload.district_id = formData.district_id;
      const res = await fetch(url, { method: isUpdate ? "PUT" : "POST", headers: getHeaders(), body: JSON.stringify(payload) });
      const r   = await res.json();
      if (res.ok || r.status === 200 || r.status === 201 || r.success) {
        toast.success(isUpdate ? "City updated successfully" : "City added successfully");
        setOpenModal(false);
        fetchCities();
      } else {
        toast.error(r.message || "Operation failed");
      }
    } catch { toast.error("Operation failed"); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    if (!await confirmStatus({ newStatus })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/cities/${row.hash_id || row.id}/update`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          city:          row.city,
          district_name: row.district_name || undefined,
          status:        newStatus,
        }),
      });
      const r = await res.json();
      if (res.ok || r.status === 200 || r.success) {
        toast.success(`City marked as ${newStatus}`);
        fetchCities();
      } else toast.error(r.message || "Status update failed");
    } catch { toast.error("Status update failed"); }
  };

  const columns = [
    { field: "sr_no",        headerName: "#",          width: 65 },
    { field: "city",         headerName: "City Name",  flex: 1 },
    {
      field: "district_name",
      headerName: "District",
      width: 180,
      renderCell: (p) => {
        const dist = districts.find(d => (d.hash_id || d.id) === p.row.district_id);
        const name = dist ? dist.name : (p.value || p.row.district_name);
        return name
          ? <span className="text-slate-700 text-sm">{name}</span>
          : <span className="text-slate-400 text-xs">—</span>;
      },
    },
    { field: "status",     headerName: "Status",    width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row, p.value)}
          inputProps={{ "aria-label": "toggle city status" }}
          size="small"
          color={p.value === "active" ? "success" : "error"}
        />
      ),
    },
    { field: "actions",    headerName: "Actions",    width: 75, sortable: false,
      renderCell: (p) => <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}><MoreVertical size={18} /></IconButton> },
  ];

  if (loading && allRows.length === 0)
    return <div className="flex justify-center items-center min-h-screen"><InlineLoader text="Loading cities..." variant="ring" size="lg" /></div>;

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
              <div className="p-2 bg-emerald-100 rounded-lg"><MapPin size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Cities</h1>
                <p className="text-sm text-slate-500">Manage cities</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add City
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"><CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total Cities</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2></CardContent></Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200"><CardContent className="p-5"><p className="text-sm text-emerald-700 font-medium">Active</p><h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2></CardContent></Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200"><CardContent className="p-5"><p className="text-sm text-red-700 font-medium">Inactive</p><h2 className="text-3xl font-bold text-red-900 mt-1">{inactiveCount}</h2></CardContent></Card>
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
          title="Filter Cities"
        />

        {/* GRID */}
        <TooltipDataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          initialState={GRID_INITIAL_STATE}
          pageSizeOptions={GRID_PAGE_SIZE_OPTIONS}
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
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">{editingCity ? "Edit City" : "Add City"}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth label="City Name" margin="normal" size="small" autoFocus
              value={formData.city_name}
              onChange={(e) => setFormData((f) => ({ ...f, city_name: e.target.value }))}
              placeholder="e.g. Muzaffarabad"
            />
            <TextField
              select fullWidth label="District" margin="normal" size="small"
              value={formData.district_id}
              onChange={(e) => setFormData((f) => ({ ...f, district_id: e.target.value }))}
              disabled={loadingDistricts}
              helperText={loadingDistricts ? "Loading districts…" : "Link this city to a district"}
            >
              <MenuItem value="">— Select District —</MenuItem>
              {districts.map((d) => (
                <MenuItem key={d.hash_id || d.id} value={d.hash_id || d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button type="button" onClick={() => setOpenModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 text-sm disabled:opacity-60">
              {saving ? "Saving…" : editingCity ? "Update" : "Create"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default CitiesManagement;
