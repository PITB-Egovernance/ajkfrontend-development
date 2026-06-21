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
import { Plus, ArrowLeft, MoreVertical, BookOpen, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import SubjectApi from "api/subjectApi";

const GROUPS = ["Group A", "Group B", "Group C", "Group D", "Group E", "Group F", "Group G"];

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

const EMPTY_FORM = { subject_name: "", total_marks: "", subject_group: "", status: "active" };

const SubjectManagement = () => {
  const navigate = useNavigate();

  const [allRows,    setAllRows]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [filters,    setFilters]    = useState({ subject_name: "", subject_group: "", status: "" });

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
      const result = await SubjectApi.getAll();
      const data = result.data?.data ?? result.data ?? [];
      setAllRows(
        (Array.isArray(data) ? data : []).map((item, i) => ({
          id:            item.hash_id || item.id,
          hash_id:       item.hash_id || item.id,
          sr_no:         i + 1,
          subject_name:  item.subject_name,
          subject_group: item.subject_group,
          total_marks:   item.total_marks,
          status:        item.status ?? "active",
        }))
      );
    } catch {
      toast.error("Failed to load subject data");
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  /* ── FILTER CONFIG ── */
  const filterConfig = [
    { name: "subject_name",  label: "Subject Name", type: "text",   placeholder: "Filter by name" },
    { name: "subject_group", label: "Group",        type: "select", options: GROUPS.map((g) => ({ value: g, label: g })) },
    { name: "status",        label: "Status",       type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters({ subject_name: "", subject_group: "", status: "" });

  /* ── CLIENT-SIDE FILTER ── */
  const filteredRows = allRows.filter((row) => {
    if (filters.subject_name  && !row.subject_name?.toLowerCase().includes(filters.subject_name.toLowerCase())) return false;
    if (filters.subject_group && row.subject_group !== filters.subject_group) return false;
    if (filters.status        && row.status        !== filters.status)        return false;
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
    setFormData({
      subject_name:  selectedRow.subject_name,
      total_marks:   String(selectedRow.total_marks),
      subject_group: selectedRow.subject_group,
      status:        selectedRow.status ?? "active",
    });
    setFormErrors({});
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── VALIDATION ── */
  const validate = () => {
    const errs = {};
    if (!formData.subject_name.trim()) errs.subject_name = "Subject name is required";
    if (!formData.total_marks || isNaN(Number(formData.total_marks)) || Number(formData.total_marks) <= 0)
      errs.total_marks = "Marks must be a positive number";
    if (!formData.subject_group) errs.subject_group = "Group is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── SINGLE DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();
    if (!await confirmDelete({ title: "Delete Subject", identifier: selectedRow.subject_name })) return;
    try {
      await SubjectApi.delete(selectedRow.hash_id);
      toast.success("Subject deleted successfully");
      setSelectionModel((p) => p.filter((id) => id !== selectedRow.id));
      fetchAll();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── BULK ACTIONS ── */
  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: "Delete Subjects", message: `Delete ${selectionModel.length} subject${selectionModel.length > 1 ? "s" : ""}?` })) return;
    try {
      const rows = allRows.filter((r) => selectionModel.includes(r.id));
      await Promise.all(rows.map((r) => SubjectApi.delete(r.hash_id)));
      toast.success("Deleted selected subjects");
      setSelectionModel([]);
      fetchAll();
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const handleBulkStatus = async (status) => {
    if (!selectionModel.length) return;
    try {
      const rows = allRows.filter((r) => selectionModel.includes(r.id));
      await Promise.all(
        rows.map((r) =>
          SubjectApi.update(r.hash_id, {
            subject_name:  r.subject_name,
            subject_group: r.subject_group,
            total_marks:   r.total_marks,
            status,
          })
        )
      );
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
      await SubjectApi.update(row.hash_id, {
        subject_name:  row.subject_name,
        subject_group: row.subject_group,
        total_marks:   row.total_marks,
        status:        newStatus,
      });
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
      const payload = {
        subject_name:  formData.subject_name.trim(),
        subject_group: formData.subject_group,
        total_marks:   Number(formData.total_marks),
        status:        formData.status,
      };
      if (editingRow) {
        await SubjectApi.update(editingRow.hash_id, payload);
        toast.success("Subject updated successfully");
      } else {
        await SubjectApi.create(payload);
        toast.success("Subject added successfully");
      }
      setOpenModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no",         headerName: "#",            width: 65  },
    { field: "subject_name",  headerName: "Subject Name", flex: 1    },
    { field: "subject_group", headerName: "Group",        width: 130 },
    { field: "total_marks",   headerName: "Marks",        width: 100 },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row)}
          inputProps={{ "aria-label": "toggle subject status" }}
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
        <InlineLoader text="Loading subject data..." variant="ring" size="lg" />
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
                <BookOpen size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
                <p className="text-sm text-slate-500">Manage subject entries</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Subject
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Subjects</p>
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
          title="Filter Subjects"
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
            {editingRow ? "Edit Subject" : "Add Subject"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Subject Name"
              margin="normal"
              size="small"
              autoFocus
              value={formData.subject_name}
              onChange={(e) => {
                setFormData((f) => ({ ...f, subject_name: e.target.value }));
                if (e.target.value.trim()) setFormErrors((errs) => ({ ...errs, subject_name: undefined }));
              }}
              error={!!formErrors.subject_name}
              helperText={formErrors.subject_name}
              placeholder="e.g. Mathematics"
            />

            <TextField
              fullWidth
              label="Marks"
              margin="normal"
              size="small"
              type="number"
              inputProps={{ min: 1 }}
              value={formData.total_marks}
              onChange={(e) => {
                setFormData((f) => ({ ...f, total_marks: e.target.value }));
                if (e.target.value && Number(e.target.value) > 0) setFormErrors((errs) => ({ ...errs, total_marks: undefined }));
              }}
              error={!!formErrors.total_marks}
              helperText={formErrors.total_marks || "Total marks for this subject"}
              placeholder="e.g. 100"
            />

            <TextField
              select
              fullWidth
              label="Group"
              margin="normal"
              size="small"
              value={formData.subject_group}
              onChange={(e) => {
                setFormData((f) => ({ ...f, subject_group: e.target.value }));
                if (e.target.value) setFormErrors((errs) => ({ ...errs, subject_group: undefined }));
              }}
              error={!!formErrors.subject_group}
              helperText={formErrors.subject_group || "Select the subject group"}
            >
              <MenuItem value="">— Select Group —</MenuItem>
              {GROUPS.map((g) => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Status"
              margin="normal"
              size="small"
              value={formData.status}
              onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
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

export default SubjectManagement;
