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
import { Plus, ArrowLeft, MoreVertical, ScrollText, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";

/* ─── Dummy API ──────────────────────────────────────────────────────────────
   Replace these helpers with real fetch() calls when the production endpoint
   is available.
────────────────────────────────────────────────────────────────────────────── */
let _nextId = 6;
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const SEED = [
  { id: "t1", term_name: "Eligibility Criteria",           status: "active"   },
  { id: "t2", term_name: "Age Limit Policy",               status: "active"   },
  { id: "t3", term_name: "Document Submission Policy",     status: "active"   },
  { id: "t4", term_name: "Examination Code of Conduct",    status: "active"   },
  { id: "t5", term_name: "Disqualification Conditions",    status: "inactive" },
];

if (!window.__termsStore) window.__termsStore = [...SEED];
const store = () => window.__termsStore;

const dummyAPI = {
  getAll:     async ()            => { await delay();    return [...store()]; },
  create:     async (payload)     => { await delay(400); const row = { id: `t${_nextId++}`, ...payload, status: "active" }; store().push(row); return row; },
  update:     async (id, patch)   => { await delay(400); const i = store().findIndex((r) => r.id === id); if (i < 0) throw new Error("Not found"); Object.assign(store()[i], patch); return store()[i]; },
  remove:     async (id)          => { await delay(400); const i = store().findIndex((r) => r.id === id); if (i < 0) throw new Error("Not found"); store().splice(i, 1); },
  bulkRemove: async (ids)         => { await delay(400); ids.forEach((id) => { const i = store().findIndex((r) => r.id === id); if (i >= 0) store().splice(i, 1); }); },
  bulkStatus: async (ids, status) => { await delay(400); ids.forEach((id) => { const r = store().find((r) => r.id === id); if (r) r.status = status; }); },
};
/* ─────────────────────────────────────────────────────────────────────────── */

const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
  "& .MuiDataGrid-row": { minHeight: "52px !important" },
  "& .MuiDataGrid-checkboxInput svg":                   { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput:hover svg":              { color: "#065f46" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":        { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":                { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root":    { color: "#064e3b" },
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

const EMPTY_FORM = { term_name: "" };

const TermsAndConditionsManagement = () => {
  const navigate = useNavigate();

  const [allRows,    setAllRows]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [filters,    setFilters]    = useState({ term_name: "", status: "" });

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [selectionModel,  setSelectionModel]  = useState([]);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editingRow,  setEditingRow]  = useState(null);
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});

  /* ── FETCH ── */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await dummyAPI.getAll();
      setAllRows(data.map((item, i) => ({ ...item, sr_no: i + 1 })));
    } catch {
      toast.error("Failed to load terms and conditions");
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  /* ── FILTER CONFIG ── */
  const filterConfig = [
    { name: "term_name", label: "Term Name", type: "text",   placeholder: "Filter by name" },
    { name: "status",    label: "Status",    type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters({ term_name: "", status: "" });

  /* ── CLIENT-SIDE FILTER ── */
  const filteredRows = allRows.filter((row) => {
    if (filters.term_name && !row.term_name?.toLowerCase().includes(filters.term_name.toLowerCase())) return false;
    if (filters.status && row.status !== filters.status) return false;
    return true;
  });

  const total         = allRows.length;
  const activeCount   = allRows.filter((r) => r.status === "active").length;
  const inactiveCount = allRows.filter((r) => r.status === "inactive").length;

  /* ── MENU ── */
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const openAdd = () => {
    setEditingRow(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setOpenModal(true);
  };

  const handleEdit = () => {
    setEditingRow(selectedRow);
    setFormData({ term_name: selectedRow.term_name });
    setFormErrors({});
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── VALIDATION ── */
  const validate = () => {
    const errs = {};
    if (!formData.term_name.trim()) errs.term_name = "Term name is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── SINGLE DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();
    if (!await confirmDelete({ title: "Delete Term", identifier: selectedRow.term_name })) return;
    try {
      await dummyAPI.remove(selectedRow.id);
      toast.success("Term deleted successfully");
      setSelectionModel((p) => p.filter((id) => id !== selectedRow.id));
      fetchAll();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── BULK ACTIONS ── */
  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: "Delete Terms", message: `Delete ${selectionModel.length} term${selectionModel.length > 1 ? "s" : ""}?` })) return;
    try {
      await dummyAPI.bulkRemove(selectionModel);
      toast.success("Deleted selected terms");
      setSelectionModel([]);
      fetchAll();
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const handleBulkStatus = async (status) => {
    if (!selectionModel.length) return;
    try {
      await dummyAPI.bulkStatus(selectionModel, status);
      toast.success(`Marked as ${status}`);
      setSelectionModel([]);
      fetchAll();
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ── TOGGLE STATUS ── */
  const handleToggleStatus = async (row) => {
    const newStatus = row.status === "active" ? "inactive" : "active";
    if (!await confirmStatus({ newStatus })) return;
    try {
      await dummyAPI.update(row.id, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      fetchAll();
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ── SAVE ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { term_name: formData.term_name.trim() };
      if (editingRow) {
        await dummyAPI.update(editingRow.id, payload);
        toast.success("Term updated successfully");
      } else {
        await dummyAPI.create(payload);
        toast.success("Term added successfully");
      }
      setOpenModal(false);
      fetchAll();
    } catch {
      toast.error("Operation failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no",     headerName: "#",          width: 65 },
    { field: "term_name", headerName: "Term Name",  flex: 1   },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row)}
          inputProps={{ "aria-label": "toggle term status" }}
          size="small"
          color={p.value === "active" ? "success" : "error"}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 75,
      sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading && allRows.length === 0)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <InlineLoader text="Loading terms and conditions..." variant="ring" size="lg" />
      </div>
    );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: "-webkit-fill-available" }}>

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700"
            >
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ScrollText size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Terms & Conditions</h1>
                <p className="text-sm text-slate-500">Manage terms and conditions entries</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Term
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Terms</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5">
              <p className="text-sm text-emerald-700 font-medium">Active</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-5">
              <p className="text-sm text-red-700 font-medium">Inactive</p>
              <h2 className="text-3xl font-bold text-red-900 mt-1">{inactiveCount}</h2>
            </CardContent>
          </Card>
        </div>

        {/* TOOLBAR — bulk actions */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          {selectionModel.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-700 mr-1">{selectionModel.length} selected</span>
              <BulkBtn
                onClick={() => handleBulkStatus("active")}
                icon={CheckCircle}
                label="Mark Active"
                className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white"
              />
              <BulkBtn
                onClick={() => handleBulkStatus("inactive")}
                icon={XCircle}
                label="Mark Inactive"
                className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white"
              />
              <BulkBtn
                onClick={handleBulkDelete}
                icon={Trash2}
                label="Delete"
                className="bg-gradient-to-br from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white"
              />
            </div>
          )}
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Terms & Conditions"
        />

        {/* GRID */}
        <DataGrid
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
          sx={gridSx}
        />

        {/* ROW CONTEXT MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>
        </Menu>

        {/* ADD / EDIT MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">
            {editingRow ? "Edit Term" : "Add Term"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Term Name"
              margin="normal"
              size="small"
              autoFocus
              value={formData.term_name}
              onChange={(e) => setFormData((f) => ({ ...f, term_name: e.target.value }))}
              error={!!formErrors.term_name}
              helperText={formErrors.term_name}
              placeholder="e.g. Eligibility Criteria"
            />
          </DialogContent>

          <DialogActions className="px-4 pb-4 gap-2">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 text-sm disabled:opacity-60"
            >
              {saving ? "Saving…" : editingRow ? "Update" : "Create"}
            </button>
          </DialogActions>
        </Dialog>

      </div>
    </div>
  );
};

export default TermsAndConditionsManagement;
