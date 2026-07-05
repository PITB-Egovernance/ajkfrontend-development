import React, { useState, useEffect, useRef } from "react";
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  TextField,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import { Plus, ArrowLeft, MoreVertical, Stamp, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { hasPermission } from "utils/permissions";
import Config from "config/baseUrl";
import AuthService from "services/authService";

const PERM = "settings.stamps";

const API_BASE = Config.apiUrl;
const API_KEY  = Config.apiKey;
const BASE_URL = Config.apiUrl.replace("/api/v1", "");

// Max upload size for a stamp image — 2 MB.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const resolveImage = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL}/${path}`;
};

const authHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "X-API-KEY": API_KEY,
});

const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders":                     { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle":                 { fontWeight: "bold" },
  "& .MuiDataGrid-row":                               { minHeight: "60px !important" },
  "& .MuiDataGrid-checkboxInput svg":                 { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput:hover svg":           { color: "#065f46" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":     { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":             { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root": { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":                  { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover":            { backgroundColor: "#d1fae5" },
};

const EMPTY_FORM = { imageFile: null, imagePreview: "", status: "active" };

const StampManagement = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [allRows,  setAllRows]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [filters,  setFilters]  = useState({ status: "" });

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editingRow,  setEditingRow]  = useState(null);
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  /* ── FETCH ── */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/stamp`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setAllRows(
          (Array.isArray(data) ? data : []).map((item, i) => ({
            id:      item.hash_id ?? item.id,
            hash_id: item.hash_id ?? item.id,
            sr_no:   i + 1,
            image:   resolveImage(item.image ?? item.image_url),
            status:  item.status ?? "active",
          }))
        );
      } else {
        toast.error(result.message || "Failed to load stamps");
        setAllRows([]);
      }
    } catch {
      toast.error("Failed to load stamps");
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  /* ── FILE INPUT (validate type + 2 MB size) ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      setFormErrors((errs) => ({ ...errs, image: "Only image files are allowed" }));
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must not be larger than 2 MB");
      setFormErrors((errs) => ({ ...errs, image: "Image must not be larger than 2 MB" }));
      e.target.value = "";
      return;
    }

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

  /* ── FILTER ── */
  const filterConfig = [
    { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters({ status: "" });

  const filteredRows = allRows.filter((row) => {
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
    setFormData({
      imageFile:    null,
      imagePreview: selectedRow.image ?? "",
      status:       selectedRow.status ?? "active",
    });
    setFormErrors({});
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── VALIDATION ── */
  const validate = () => {
    const errs = {};
    if (!editingRow && !formData.imageFile) errs.image = "Stamp image is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── SAVE ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      if (formData.imageFile) fd.append("image", formData.imageFile);

      let res;
      if (editingRow) {
        // Update: image is optional, status is editable.
        fd.append("status", formData.status);
        // Method spoofing: send a real POST so PHP parses the multipart body, but
        // tell Laravel to dispatch to the PUT route via _method.
        fd.append("_method", "PUT");
        res = await fetch(`${API_BASE}/settings/stamp/update/${editingRow.hash_id}`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
      } else {
        // Create: image only.
        res = await fetch(`${API_BASE}/settings/stamp/store`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
      }

      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(editingRow ? "Stamp updated successfully" : "Stamp added successfully");
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

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();
    if (!await confirmDelete({ title: "Delete Stamp", message: "Are you sure you want to delete this stamp?" })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/stamp/delete/${selectedRow.hash_id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success("Stamp deleted successfully");
        fetchAll();
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── TOGGLE STATUS ── */
  const handleToggleStatus = async (row) => {
    const newStatus = row.status === "active" ? "inactive" : "active";
    if (!await confirmStatus({ newStatus })) return;
    try {
      const fd = new FormData();
      fd.append("status", newStatus);
      // Method spoofing: PHP only parses a multipart body on POST, not PUT, so a
      // real PUT drops the FormData fields. Send POST + _method=PUT instead.
      fd.append("_method", "PUT");
      const res    = await fetch(`${API_BASE}/settings/stamp/update/${row.hash_id}`, {
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
    { field: "sr_no", headerName: "#", width: 80 },
    {
      field: "image",
      headerName: "Stamp",
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: (p) =>
        p.value ? (
          <img
            src={p.value}
            alt="stamp"
            onClick={() => setPreviewImage(p.value)}
            className="h-10 w-28 object-contain rounded border border-slate-200 bg-slate-50 cursor-pointer hover:opacity-80 transition-opacity"
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
          inputProps={{ "aria-label": "toggle stamp status" }}
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
        <InlineLoader text="Loading stamps..." variant="ring" size="lg" />
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
                <Stamp size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Stamps</h1>
                <p className="text-sm text-slate-500">Manage stamp images used across documents</p>
              </div>
            </div>
          </div>
          {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Stamp
          </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Stamps</p>
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

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Stamps"
        />

        {/* GRID */}
        <TooltipDataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
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
            {editingRow ? "Edit Stamp" : "Add Stamp"}
          </DialogTitle>
          <DialogContent>

            {/* Stamp Image Upload */}
            <div className="mt-2 mb-1">
              <p className="text-xs text-slate-500 mb-1">
                Stamp Image {!editingRow && <span className="text-red-500">*</span>}
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
                      alt="Stamp preview"
                      className="max-h-24 mx-auto object-contain rounded"
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
                    <span className="text-sm font-medium text-slate-500">Click to upload stamp</span>
                    <span className="text-xs">PNG, JPG, JPEG — max 2 MB</span>
                  </div>
                )}
              </div>
              {formErrors.image && (
                <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.image}</p>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>


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

        {/* IMAGE PREVIEW MODAL */}
        <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage(null)} maxWidth="md">
          <DialogTitle className="font-bold flex items-center justify-between">
            Stamp Preview
            <IconButton size="small" onClick={() => setPreviewImage(null)}>
              <X size={18} />
            </IconButton>
          </DialogTitle>
          <DialogContent className="flex items-center justify-center bg-slate-50 p-6">
            {previewImage && (
              <img
                src={previewImage}
                alt="Stamp preview"
                className="max-h-[70vh] max-w-full object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default StampManagement;
