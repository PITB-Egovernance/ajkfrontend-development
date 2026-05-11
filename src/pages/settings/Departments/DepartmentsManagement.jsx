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
  Switch,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import { Plus, ArrowLeft, MoreVertical, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { InlineLoader } from "components/ui/Loader";

/* ─────────────────────────────────────────────
   localStorage helpers
───────────────────────────────────────────── */
const LS_KEY = "ajk_departments";

const RESET_KEY = "ajk_departments_v2"; // bump to wipe old dummy data

const loadDepartments = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const saveDepartments = (data) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
};

const init = () => {
  if (!localStorage.getItem(RESET_KEY)) {
    localStorage.removeItem(LS_KEY);
    localStorage.setItem(RESET_KEY, "1");
  }
  if (!loadDepartments()) saveDepartments([]);
};
init();

/* ─────────────────────────────────────────────
   Grid sx
───────────────────────────────────────────── */
const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders":               { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle":           { fontWeight: "bold" },
  "& .MuiDataGrid-row":                         { minHeight: "52px !important" },
  "& .MuiDataGrid-checkboxInput svg":           { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput:hover svg":     { color: "#065f46" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg": { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":       { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root": { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":            { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover":      { backgroundColor: "#d1fae5" },
};

const emptyForm = {
  name:           "",
  type:           "Government",   // default
  contact_person: "",
  contact_number: "",
  status:         "active",
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const DepartmentsManagement = () => {
  const navigate = useNavigate();

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [anchorEl,   setAnchorEl]   = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openModal, setOpenModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [formData,  setFormData]  = useState(emptyForm);
  const [formError, setFormError] = useState("");

  /* ── LOAD ── */
  const loadRows = () => {
    setLoading(true);
    const data = loadDepartments() || [];
    setRows(data.map((d, i) => ({ ...d, sr_no: i + 1 })));
    setLoading(false);
  };

  useEffect(() => { loadRows(); }, []);

  /* ── COUNTS ── */
  const activeCount   = rows.filter((r) => r.status === "active").length;
  const inactiveCount = rows.filter((r) => r.status === "inactive").length;

  /* ── SEARCH FILTER ── */
  const filteredRows = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q ||
      r.name?.toLowerCase().includes(q) ||
      r.contact_person?.toLowerCase().includes(q) ||
      r.contact_number?.includes(q);
  });

  /* ── OPEN MODAL ── */
  const openAdd = () => {
    setEditing(null);
    setFormData(emptyForm);
    setFormError("");
    setOpenModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      name:           row.name           || "",
      type:           row.type           || "Government",
      contact_person: row.contact_person || "",
      contact_number: row.contact_number || "",
      status:         row.status         || "active",
    });
    setFormError("");
    setOpenModal(true);
    setAnchorEl(null);
    setSelectedRow(null);
  };

  /* ── SAVE ── */
  const handleSubmit = () => {
    if (!formData.name.trim()) { setFormError("Department name is required."); return; }

    const all = loadDepartments() || [];
    const duplicate = all.find(
      (d) => d.name.toLowerCase() === formData.name.trim().toLowerCase() && d.id !== editing?.id
    );
    if (duplicate) { setFormError("A department with this name already exists."); return; }

    let updated;
    if (editing) {
      updated = all.map((d) => d.id === editing.id ? { ...d, ...formData, name: formData.name.trim() } : d);
      toast.success("Department updated");
    } else {
      const newDep = { ...formData, name: formData.name.trim(), id: `dep_${Date.now()}` };
      updated = [...all, newDep];
      toast.success("Department added");
    }

    saveDepartments(updated);
    setOpenModal(false);
    loadRows();
  };

  /* ── DELETE ── */
  const handleDelete = () => {
    if (!selectedRow) return;
    if (!window.confirm(`Delete department "${selectedRow.name}"?`)) {
      setAnchorEl(null); return;
    }
    const updated = (loadDepartments() || []).filter((d) => d.id !== selectedRow.id);
    saveDepartments(updated);
    toast.success("Deleted");
    setAnchorEl(null);
    setSelectedRow(null);
    loadRows();
  };

  /* ── TOGGLE STATUS ── */
  const handleToggleStatus = (row) => {
    const newStatus = row.status === "active" ? "inactive" : "active";
    const updated = (loadDepartments() || []).map((d) =>
      d.id === row.id ? { ...d, status: newStatus } : d
    );
    saveDepartments(updated);
    toast.success(`Department marked as ${newStatus}`);
    loadRows();
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no",          headerName: "#",              width: 60 },
    { field: "name",           headerName: "Department Name", flex: 1, minWidth: 200 },
    { field: "contact_person", headerName: "Contact Person",  width: 180,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    { field: "contact_number", headerName: "Contact Number",  width: 160,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row)}
          size="small"
          color={p.value === "active" ? "success" : "error"}
          inputProps={{ "aria-label": "toggle department status" }}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 80,
      sortable: false,
      renderCell: (p) => (
        <IconButton
          size="small"
          onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedRow(p.row); }}
        >
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading) return <InlineLoader text="Loading departments..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button onClick={() => navigate("/dashboard/settings")}
              className="text-sm text-gray-600 flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Building size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
                <p className="text-sm text-slate-500">Manage organizational departments</p>
              </div>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Department
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">Total Departments</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">{rows.length}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">Active</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">{activeCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">Inactive</p>
              <h2 className="text-3xl font-bold text-red-900 mt-2">{inactiveCount}</h2>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH */}
        <div className="mb-6">
          <TextField
            size="small"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
            sx={{ width: 340 }}
          />
        </div>

        {/* GRID */}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]}
          autoHeight
          disableRowSelectionOnClick
          sx={gridSx}
        />

        {/* ACTION MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => { setAnchorEl(null); setSelectedRow(null); }}>
          <MenuItem onClick={() => openEdit(selectedRow)}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>
        </Menu>

        {/* MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle className="font-bold">
            {editing ? "Edit Department" : "Add Department"}
          </DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {formError && (
              <p className="text-red-600 text-sm mt-2 mb-1">{formError}</p>
            )}

            {/* Department Name */}
            <TextField
              fullWidth label="Department Name" margin="normal" size="small" autoFocus
              value={formData.name}
              onChange={(e) => { setFormData((f) => ({ ...f, name: e.target.value })); setFormError(""); }}
              placeholder="e.g. Finance Department"
            />

            {/* Department Type — Government by default, read-only display */}
            <TextField
              select fullWidth label="Department Type" margin="normal" size="small"
              value={formData.type}
              onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))}
            >
              <MenuItem value="Government">Government</MenuItem>
              <MenuItem value="Semi-Government">Semi-Government</MenuItem>
              <MenuItem value="Autonomous">Autonomous</MenuItem>
              <MenuItem value="Private">Private</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>

            {/* Contact Person */}
            <TextField
              fullWidth label="Contact Person" margin="normal" size="small"
              value={formData.contact_person}
              onChange={(e) => setFormData((f) => ({ ...f, contact_person: e.target.value }))}
              placeholder="e.g. Muhammad Ali"
            />

            {/* Contact Number */}
            <TextField
              fullWidth label="Contact Number" margin="normal" size="small"
              value={formData.contact_number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 11) setFormData((f) => ({ ...f, contact_number: val }));
              }}
              inputProps={{ inputMode: "numeric", maxLength: 11 }}
              placeholder="03XXXXXXXXX"
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <button
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg text-sm"
            >
              {editing ? "Update" : "Create"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default DepartmentsManagement;
