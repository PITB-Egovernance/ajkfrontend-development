import React, { useState, useEffect, useRef } from "react";
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
import { Plus, ArrowLeft, MoreVertical, PenTool, Trash2, CheckCircle, XCircle, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { hasPermission } from "utils/permissions";
import Config from "config/baseUrl";
import AuthService from "services/authService";

const PERM = "settings.digital_signatures";

const API_BASE    = Config.apiUrl;
const API_KEY     = Config.apiKey;
const BASE_URL = Config.apiUrl.replace('/api/v1', '');

const resolveImage = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}/${path}`;
};

const authHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "X-API-KEY": API_KEY,
});

const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders":                        { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle":                    { fontWeight: "bold" },
  "& .MuiDataGrid-row":                                  { minHeight: "60px !important" },
  "& .MuiDataGrid-checkboxInput svg":                    { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput:hover svg":              { color: "#065f46" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":        { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":                { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root":    { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":                     { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover":               { backgroundColor: "#d1fae5" },
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

const EMPTY_FORM = { name: "", designation: "", imageFile: null, imagePreview: "", status: "active" };

const DigitalSignatureManagement = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [allRows,          setAllRows]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [designations,     setDesignations]     = useState([]);
  const [employees,        setEmployees]        = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [filters,          setFilters]          = useState({ name: "", designation: "", status: "" });

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
      const res    = await fetch(`${API_BASE}/settings/digital-signature`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setAllRows(
          (Array.isArray(data) ? data : []).map((item, i) => ({
            id:          item.hash_id ?? item.id,
            hash_id:     item.hash_id ?? item.id,
            sr_no:       i + 1,
            name:        item.name        ?? "-",
            designation: item.designation ?? "-",
            image:       resolveImage(item.image ?? item.image_url),
            status:      item.status      ?? "active",
          }))
        );
      } else {
        toast.error(result.message || "Failed to load digital signatures");
        setAllRows([]);
      }
    } catch {
      toast.error("Failed to load digital signatures");
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDesignations = async () => {
    try {
      const res    = await fetch(`${API_BASE}/settings/designations?per_page=100`, { headers: authHeaders() });
      const result = await res.json();
      const data   = result.data?.data ?? result.data ?? [];
      setDesignations(Array.isArray(data) ? data.filter((d) => !d.wings && !['chairman', 'secretary'].includes(d.name?.toLowerCase())) : []);
    } catch {
      setDesignations([]);
    }
  };

  const fetchActiveEmployees = async (designation) => {
    if (!designation) { setEmployees([]); return; }
    setLoadingEmployees(true);
    try {
      const res    = await fetch(`${API_BASE}/employees/active`, { headers: authHeaders() });
      const result = await res.json();
      const data   = result.data?.data ?? result.data ?? [];
      const list   = Array.isArray(data) ? data : [];
      const filtered = list.filter(
        (emp) => emp.designation?.toLowerCase().trim() === designation.toLowerCase().trim()
      );
      setEmployees(filtered);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => { fetchAll(); fetchDesignations(); }, []); // eslint-disable-line

  /* ── FILE INPUT ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((f) => ({ ...f, imageFile: file, imagePreview: ev.target.result }));
      setFormErrors((errs) => ({ ...errs, image: undefined }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setFormData((f) => ({ ...f, imageFile: null, imagePreview: "" }));
  };

  /* ── FILTER CONFIG ── */
  const filterConfig = [
    { name: "name",        label: "Name",        type: "text",   placeholder: "Filter by name" },
    { name: "designation", label: "Designation", type: "text",   placeholder: "Filter by designation" },
    { name: "status",      label: "Status",      type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters({ name: "", designation: "", status: "" });

  /* ── CLIENT-SIDE FILTER ── */
  const filteredRows = allRows.filter((row) => {
    if (filters.name        && !row.name?.toLowerCase().includes(filters.name.toLowerCase()))               return false;
    if (filters.designation && !row.designation?.toLowerCase().includes(filters.designation.toLowerCase())) return false;
    if (filters.status      && row.status !== filters.status)                                               return false;
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
    setEmployees([]);
    setOpenModal(true);
  };

  const handleEdit = () => {
    setEditingRow(selectedRow);
    setFormData({
      name:         selectedRow.name,
      designation:  selectedRow.designation,
      imageFile:    null,
      imagePreview: selectedRow.image ?? "",
      status:       selectedRow.status ?? "active",
    });
    setFormErrors({});
    fetchActiveEmployees(selectedRow.designation);
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── VALIDATION ── */
  const validate = () => {
    const errs = {};
    if (!formData.name.trim())        errs.name        = "Name is required";
    if (!formData.designation.trim()) errs.designation = "Designation is required";
    if (!editingRow && !formData.imageFile) errs.image = "Signature image is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── SAVE ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name",        formData.name.trim());
      fd.append("designation", formData.designation.trim());
      fd.append("status",      formData.status);
      if (formData.imageFile) fd.append("image", formData.imageFile);

      let res;
      if (editingRow) {
        res = await fetch(`${API_BASE}/settings/digital-signature/update/${editingRow.hash_id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: fd,
        });
      } else {
        res = await fetch(`${API_BASE}/settings/digital-signature/store`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
      }

      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(editingRow ? "Signature updated successfully" : "Signature added successfully");
        setOpenModal(false);
        fetchAll();
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── SINGLE DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();
    if (!await confirmDelete({ title: "Delete Signature", identifier: selectedRow.name })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/digital-signature/delete/${selectedRow.hash_id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success("Signature deleted successfully");
        setSelectionModel((p) => p.filter((id) => id !== selectedRow.id));
        fetchAll();
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── BULK ACTIONS ── */
  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: "Delete Signatures", message: `Delete ${selectionModel.length} signature${selectionModel.length > 1 ? "s" : ""}?` })) return;
    try {
      await Promise.all(
        selectionModel.map((id) =>
          fetch(`${API_BASE}/settings/digital-signature/delete/${id}`, { method: "DELETE", headers: authHeaders() })
        )
      );
      toast.success("Deleted selected signatures");
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
        rows.map((row) => {
          const fd = new FormData();
          fd.append("name",        row.name);
          fd.append("designation", row.designation);
          fd.append("status",      status);
          return fetch(`${API_BASE}/settings/digital-signature/update/${row.hash_id}`, {
            method: "PUT",
            headers: authHeaders(),
            body: fd,
          });
        })
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
      const fd = new FormData();
      fd.append("name",        row.name);
      fd.append("designation", row.designation);
      fd.append("status",      newStatus);

      fd.append("_method", "PUT");
      const res    = await fetch(`${API_BASE}/settings/digital-signature/update/${row.hash_id}`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success(`Marked as ${newStatus}`);
        fetchAll();
      } else {
        toast.error(result.message || "Status update failed");
      }
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no",       headerName: "#",           width: 65  },
    { field: "name",        headerName: "Name",        flex: 1    },
    { field: "designation", headerName: "Designation", flex: 1    },
    {
      field: "image",
      headerName: "Signature",
      width: 140,
      sortable: false,
      renderCell: (p) =>
        p.value ? (
          <img
            src={p.value}
            alt="signature"
            className="h-10 w-28 object-contain rounded border border-slate-200 bg-slate-50"
          />
        ) : (
          <span className="text-xs text-slate-400 italic">No image</span>
        ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row)}
          inputProps={{ "aria-label": "toggle signature status" }}
          size="small"
          disabled={!canEdit}
          color={p.value === "active" ? "success" : "error"}
        />
      ),
    },
    ...(canRowActions ? [{
      field: "actions",
      headerName: "Actions",
      width: 75,
      sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ];

  if (loading && allRows.length === 0)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <InlineLoader text="Loading digital signatures..." variant="ring" size="lg" />
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
                <PenTool size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Digital Signatures</h1>
                <p className="text-sm text-slate-500">Manage employee digital signature entries</p>
              </div>
            </div>
          </div>
          {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Signature
          </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Signatures</p>
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
        {selectionModel.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex-wrap mb-4">
            <span className="text-sm font-semibold text-slate-700 mr-1">{selectionModel.length} selected</span>
            <BulkBtn
              onClick={() => handleBulkStatus("active")}
              icon={CheckCircle}
              label="Mark Active"
              className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white"
            />
            <BulkBtn
              onClick={() => handleBulkStatus("inactive")}
              icon={XCircle}
              label="Mark Inactive"
              className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 text-white"
            />
            <BulkBtn
              onClick={handleBulkDelete}
              icon={Trash2}
              label="Delete"
              className="bg-gradient-to-br from-red-700 to-red-800 hover:from-red-600 text-white"
            />
          </div>
        )}

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Signatures"
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
          rowHeight={60}
          sx={gridSx}
        />

        {/* ROW CONTEXT MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={handleEdit}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>}
        </Menu>

        {/* ADD / EDIT MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">
            {editingRow ? "Edit Digital Signature" : "Add Digital Signature"}
          </DialogTitle>
          <DialogContent>

            {/* Designation — first */}
            <TextField
              select
              fullWidth
              label="Designation"
              margin="normal"
              size="small"
              autoFocus
              value={formData.designation}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((f) => ({ ...f, designation: val, name: "" }));
                if (val) setFormErrors((errs) => ({ ...errs, designation: undefined }));
                fetchActiveEmployees(val);
              }}
              error={!!formErrors.designation}
              helperText={formErrors.designation}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">— Select Designation —</option>
              {designations.map((d) => (
                <option key={d.hash_id ?? d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </TextField>

            {/* Name — populated from employees matching the selected designation */}
            <TextField
              select
              fullWidth
              label="Name"
              margin="normal"
              size="small"
              value={formData.name}
              onChange={(e) => {
                setFormData((f) => ({ ...f, name: e.target.value }));
                if (e.target.value) setFormErrors((errs) => ({ ...errs, name: undefined }));
              }}
              error={!!formErrors.name}
              helperText={formErrors.name}
              disabled={!formData.designation || loadingEmployees}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">
                {loadingEmployees
                  ? "Loading employees…"
                  : !formData.designation
                  ? "Select designation first"
                  : employees.length === 0
                  ? "No employees found"
                  : "— Select Name —"}
              </option>
              {employees.map((emp) => {
                const empName =
                  emp.first_name && emp.last_name
                    ? `${emp.first_name} ${emp.last_name}`
                    : emp.username || emp.name || emp.full_name || "-";
                return (
                  <option key={emp.hash_id ?? emp.id} value={empName}>
                    {empName}
                  </option>
                );
              })}
            </TextField>

            {/* Signature Image Upload */}
            <div className="mt-3 mb-1">
              <p className="text-xs text-slate-500 mb-1">
                Signature Image {!editingRow && <span className="text-red-500">*</span>}
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  formErrors.image
                    ? "border-red-400 bg-red-50"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
                }`}
              >
                {formData.imagePreview ? (
                  <>
                    <img
                      src={formData.imagePreview}
                      alt="Signature preview"
                      className="max-h-20 mx-auto object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-1 right-1 p-0.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                    >
                      <X size={14} />
                    </button>
                    <p className="text-xs text-slate-400 mt-2">Click to replace image</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 py-2">
                    <Upload size={24} />
                    <span className="text-sm font-medium text-slate-500">Click to upload signature</span>
                    <span className="text-xs">PNG, JPG, JPEG supported</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />
              {formErrors.image && (
                <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.image}</p>
              )}
            </div>

            {/* Status — only on edit */}
            {editingRow && (
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
            )}

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

export default DigitalSignatureManagement;
