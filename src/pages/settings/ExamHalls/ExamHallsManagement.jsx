import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import { Plus, ArrowLeft, MoreVertical, DoorOpen, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";

const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders":    { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
  "& .MuiDataGrid-row": { minHeight: "52px !important" },
  "& .MuiDataGrid-checkboxInput svg":             { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput:hover svg":        { color: "#065f46" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":  { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":          { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root": { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":       { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover": { backgroundColor: "#d1fae5" },
};

const BulkBtn = ({ onClick, icon: Icon, label, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm ${className}`}
  >
    <Icon size={15} /> {label}
  </button>
);

const emptyForm = { exam_center_id: "", name: "", floor: "", capacity: "" };

const ExamHallsManagement = () => {
  const navigate = useNavigate();

  const API_BASE = Config.apiUrl; // local — switch to Config.productionUrl after deploying backend
  const API_KEY  = Config.apiKey;

  const getHeaders = () => ({
    Authorization: `Bearer ${AuthService.getToken()}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-KEY": API_KEY,
  });

  const [allRows,        setAllRows]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [centers,        setCenters]        = useState([]);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [filterCenterId, setFilterCenterId] = useState("");

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [selectionModel,  setSelectionModel]  = useState([]);
  const [anchorEl,        setAnchorEl]        = useState(null);
  const [selectedRow,     setSelectedRow]     = useState(null);
  const [openModal,       setOpenModal]       = useState(false);
  const [editingHall,     setEditingHall]     = useState(null);
  const [formData,        setFormData]        = useState(emptyForm);

  const fetchHalls = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/exam-halls?per_page=1000`, { headers: getHeaders() });
      const result = await res.json();
      if (result.status === 200 || result.success) {
        const data = result.data?.data ?? result.data ?? [];
        setAllRows(data.map((item, i) => ({
          id:           item.hash_id || item.id,
          sr_no:        i + 1,
          hash_id:      item.hash_id,
          name:         item.name,
          floor:        item.floor ?? "—",
          capacity:     item.capacity,
          status:       item.status ?? "active",
          center_name:  item.exam_center?.name ?? "—",
          exam_center_id: item.exam_center_id,
        })));
      } else {
        toast.error(result.message || "Failed to load exam halls");
        setAllRows([]);
      }
    } catch { toast.error("Server error"); setAllRows([]); }
    finally { setLoading(false); }
  };

  const fetchCenters = async () => {
    try {
      const res    = await fetch(`${API_BASE}/settings/exam-centers?per_page=1000`, { headers: getHeaders() });
      const result = await res.json();
      if (result.status === 200 || result.success)
        setCenters(result.data?.data ?? result.data ?? []);
    } catch {}
  };

  useEffect(() => { fetchHalls(); fetchCenters(); }, []); // eslint-disable-line

  const filteredRows = allRows.filter((r) => {
    const matchSearch = !searchTerm.trim() || [r.name, r.floor, r.center_name, String(r.capacity)]
      .some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCenter = !filterCenterId || String(r.exam_center_id) === String(filterCenterId);
    return matchSearch && matchCenter;
  });

  const total         = allRows.length;
  const activeCount   = allRows.filter((r) => r.status === "active").length;
  const inactiveCount = allRows.filter((r) => r.status === "inactive").length;
  const totalCapacity = allRows.reduce((s, r) => s + (Number(r.capacity) || 0), 0);

  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const openAdd = () => {
    setEditingHall(null);
    setFormData(emptyForm);
    setOpenModal(true);
  };

  const handleEdit = () => {
    setEditingHall(selectedRow);
    setFormData({
      exam_center_id: String(selectedRow.exam_center_id ?? ""),
      name:     selectedRow.name,
      floor:    selectedRow.floor === "—" ? "" : (selectedRow.floor ?? ""),
      capacity: String(selectedRow.capacity ?? ""),
    });
    setOpenModal(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedRow) return; handleMenuClose();
    if (!await confirmDelete({ title: 'Delete Exam Hall', identifier: selectedRow.name })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/exam-halls/${selectedRow.hash_id}/delete`, { method: "DELETE", headers: getHeaders() });
      const r   = await res.json();
      if (r.status === 200 || r.success) { toast.success("Deleted"); setSelectionModel((p) => p.filter((id) => id !== selectedRow.hash_id)); fetchHalls(); }
      else toast.error(r.message || "Delete failed");
    } catch { toast.error("Delete failed"); }
  };

  const bulkAction = async (url, method, body, successMsg) => {
    try {
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      const r   = await res.json();
      if (r.status === 200 || r.success) { toast.success(r.success || successMsg); setSelectionModel([]); fetchHalls(); }
      else toast.error(r.message || "Action failed");
    } catch { toast.error("Action failed"); }
  };

  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: 'Delete Exam Halls', message: `Are you sure you want to delete ${selectionModel.length} hall${selectionModel.length > 1 ? 's' : ''}?` })) return;
    bulkAction(`${API_BASE}/settings/exam-halls/bulk-delete`, "DELETE", { hashes: selectionModel }, "Deleted");
  };

  const handleBulkStatus = (status) => {
    if (!selectionModel.length) return;
    bulkAction(`${API_BASE}/settings/exam-halls/bulk-status`, "PUT", { hashes: selectionModel, status }, `Marked as ${status}`);
  };

  const handleSubmit = async () => {
    if (!formData.exam_center_id) { toast.error("Please select an exam center"); return; }
    if (!formData.name.trim())    { toast.error("Hall name is required"); return; }
    if (!formData.capacity || Number(formData.capacity) <= 0) { toast.error("Valid capacity required"); return; }
    setSaving(true);
    try {
      const isUpdate = !!editingHall;
      const url = isUpdate
        ? `${API_BASE}/settings/exam-halls/${editingHall.hash_id}/update`
        : `${API_BASE}/settings/exam-halls/store`;
      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          exam_center_id: Number(formData.exam_center_id),
          name:           formData.name.trim(),
          floor:          formData.floor.trim() || null,
          capacity:       Number(formData.capacity),
        }),
      });
      const r = await res.json();
      if (r.status === 200 || r.status === 201 || r.success) {
        toast.success(isUpdate ? "Updated" : "Hall created");
        setOpenModal(false);
        fetchHalls();
      } else toast.error(r.message || "Operation failed");
    } catch { toast.error("Operation failed"); }
    finally { setSaving(false); }
  };

  const columns = [
    { field: "sr_no",       headerName: "#",          width: 60 },
    { field: "name",        headerName: "Hall Name",  flex: 1, minWidth: 180 },
    { field: "center_name", headerName: "Exam Center", flex: 1, minWidth: 200 },
    { field: "floor",       headerName: "Floor",      width: 120 },
    { field: "capacity",    headerName: "Capacity",   width: 110,
      renderCell: (p) => <span className="font-semibold text-slate-700">{Number(p.value).toLocaleString()}</span> },
    { field: "actions", headerName: "Actions", width: 75, sortable: false,
      renderCell: (p) => <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}><MoreVertical size={18} /></IconButton> },
  ];

  if (loading && allRows.length === 0)
    return <div className="flex justify-center items-center min-h-screen"><InlineLoader text="Loading exam halls..." variant="ring" size="lg" /></div>;

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
              <div className="p-2 bg-indigo-100 rounded-lg"><DoorOpen size={22} className="text-indigo-700" /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Exam Halls</h1>
                <p className="text-sm text-slate-500">Manage halls and rooms within exam centers</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Hall
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total Halls</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5"><p className="text-sm text-emerald-700 font-medium">Active</p><h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-5"><p className="text-sm text-red-700 font-medium">Inactive</p><h2 className="text-3xl font-bold text-red-900 mt-1">{inactiveCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-5"><p className="text-sm text-violet-700 font-medium">Total Capacity</p><h2 className="text-3xl font-bold text-violet-900 mt-1">{totalCapacity.toLocaleString()}</h2></CardContent>
          </Card>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex gap-3 flex-wrap">
            <TextField
              size="small"
              placeholder="Search name, floor or center…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              sx={{ width: 260 }}
            />
            <TextField
              select
              size="small"
              label="Filter by Center"
              value={filterCenterId}
              onChange={(e) => { setFilterCenterId(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              sx={{ width: 220 }}
            >
              <MenuItem value="">All Centers</MenuItem>
              {centers.map((c) => (
                <MenuItem key={c.id || c.hash_id} value={String(c.id)}>{c.name}</MenuItem>
              ))}
            </TextField>
          </div>

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

        {/* GRID */}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50, 100]}
          loading={loading}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(s) => setSelectionModel(s)}
          sx={gridSx}
        />

        {/* ROW MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>
        </Menu>

        {/* ADD / EDIT MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold">{editingHall ? "Edit Exam Hall" : "Add Exam Hall"}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth select label="Exam Center" margin="normal" size="small"
              value={formData.exam_center_id}
              onChange={(e) => setFormData((p) => ({ ...p, exam_center_id: e.target.value }))}
            >
              <MenuItem value=""><em>Select exam center</em></MenuItem>
              {centers.map((c) => (
                <MenuItem key={c.id || c.hash_id} value={String(c.id)}>{c.name} — {c.city}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth label="Hall Name" margin="normal" size="small" autoFocus
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Hall A, Room 101"
            />
            <TextField
              fullWidth label="Floor (optional)" margin="normal" size="small"
              value={formData.floor}
              onChange={(e) => setFormData((p) => ({ ...p, floor: e.target.value }))}
              placeholder="e.g. Ground Floor, 1st Floor"
            />
            <TextField
              fullWidth label="Capacity (seats)" margin="normal" size="small" type="number"
              inputProps={{ min: 1 }}
              value={formData.capacity}
              onChange={(e) => setFormData((p) => ({ ...p, capacity: e.target.value }))}
              placeholder="e.g. 50"
            />
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button type="button" onClick={() => setOpenModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 text-sm disabled:opacity-60">
              {saving ? "Saving…" : editingHall ? "Update" : "Create"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default ExamHallsManagement;
