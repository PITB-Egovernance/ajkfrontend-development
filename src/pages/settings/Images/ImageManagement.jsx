import React, { useState, useEffect, useRef } from "react";
import TooltipDataGrid from "components/ui/TooltipDataGrid";
import SearchableSelect from "components/ui/SearchableSelect";
import {
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import { Plus, ArrowLeft, MoreVertical, ImageIcon, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { hasPermission } from "utils/permissions";
import Config from "config/baseUrl";
import AuthService from "services/authService";

const PERM = "settings.images";

const API_BASE = Config.apiUrl;
const API_KEY  = Config.apiKey;
const BASE_URL = Config.apiUrl.replace("/api/v1", "");

// Max upload size for an image asset — 10 MB.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
const ACCEPT_ATTR = "image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg";

const CATEGORIES = [
  { value: "images", label: "Images" },
  //{ value: "gallery", label: "Gallery" },
  { value: "logo",   label: "Logo" },
];

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

const EMPTY_FORM = { imageFile: null, imagePreview: "", category: "", altText: "", title: "" };

const ImageManagement = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [allRows,  setAllRows]  = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [filters,  setFilters]  = useState({ title: "", category: "" });

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editingRow,  setEditingRow]  = useState(null);
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [dragActive,  setDragActive]  = useState(false);

  /* ── FETCH ── */
  const fetchAll = async ({ page = 0, pageSize = 15 } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        per_page: String(pageSize),
      });
      const res    = await fetch(`${API_BASE}/settings/images?${params.toString()}`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const pageData = result.data?.data ?? result.data ?? [];
        const data = Array.isArray(pageData) ? pageData : [];
        const rowOffset = Number(result.data?.from ?? (page * pageSize + 1)) - 1;
        setAllRows(
          data.map((item, i) => ({
            id:         item.hash_id ?? item.id,
            hash_id:    item.hash_id ?? item.id,
            sr_no:      rowOffset + i + 1,
            image:      resolveImage(item.url ?? item.image ?? item.image_url ?? item.path),
            title:      item.title ?? "",
            category:   item.category ?? "",
            alt_text:   item.alt_text ?? "",
            created_at: item.created_at ?? null,
          }))
        );
        setTotalRows(Number(result.data?.total ?? data.length));
      } else {
        toast.error(result.message || "Failed to load images");
        setAllRows([]);
        setTotalRows(0);
      }
    } catch {
      toast.error("Failed to load images");
      setAllRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(paginationModel); }, [paginationModel.page, paginationModel.pageSize]); // eslint-disable-line

  /* ── FILE VALIDATION + PREVIEW ── */
  const applyFile = (file) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, JPEG, PNG, WEBP or SVG images are allowed");
      setFormErrors((errs) => ({ ...errs, image: "Only JPG, JPEG, PNG, WEBP or SVG images are allowed" }));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must not be larger than 10 MB");
      setFormErrors((errs) => ({ ...errs, image: "Image must not be larger than 10 MB" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((f) => ({ ...f, imageFile: file, imagePreview: ev.target.result }));
      setFormErrors((errs) => ({ ...errs, image: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    applyFile(e.target.files[0]);
    e.target.value = "";
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setFormData((f) => ({ ...f, imageFile: null, imagePreview: "" }));
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    applyFile(e.dataTransfer.files?.[0]);
  };

  /* ── FILTER ── */
  const filterConfig = [
    { name: "title", label: "Title", type: "text", placeholder: "Search by title" },
    { name: "category", label: "Category", type: "select", options: CATEGORIES },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters({ title: "", category: "" });

  const filteredRows = allRows.filter((row) => {
    if (filters.title && !row.title.toLowerCase().includes(filters.title.toLowerCase())) return false;
    if (filters.category && row.category !== filters.category) return false;
    return true;
  });

  const total        = totalRows;
  const galleryCount = allRows.filter((r) => r.category === "gallery").length;
  const logoCount    = allRows.filter((r) => r.category === "logo").length;
  const imageCount    = allRows.filter((r) => r.category === "images").length;

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
      category:     selectedRow.category ?? "",
      altText:      selectedRow.alt_text ?? "",
      title:        selectedRow.title ?? "",
    });
    setFormErrors({});
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── VALIDATION ── */
  const validate = () => {
    const errs = {};
    if (!editingRow && !formData.imageFile) errs.image = "Image is required";
    if (!formData.category) errs.category = "Category is required";
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
      fd.append("category", formData.category);
      fd.append("alt_text", formData.altText || "");
      fd.append("title", formData.title || "");

      let res;
      if (editingRow) {
        res = await fetch(`${API_BASE}/settings/images/update/${editingRow.hash_id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: fd,
        });
      } else {
        res = await fetch(`${API_BASE}/settings/images/store`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
      }

      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(editingRow ? "Image updated successfully" : "Image added successfully");
        setOpenModal(false);
        fetchAll(paginationModel);
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
    if (!await confirmDelete({ title: "Delete Image", identifier: selectedRow.title || "this image" })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/images/delete/${selectedRow.hash_id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success("Image deleted successfully");
        fetchAll(paginationModel);
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no", headerName: "#", width: 70, sortable: false },
    {
      field: "image",
      headerName: "Thumbnail",
      width: 140,
      sortable: false,
      renderCell: (p) =>
        p.value ? (
          <img
            src={p.value}
            alt={p.row.alt_text || p.row.title || "image"}
            onClick={() => setPreviewImage(p.value)}
            className="h-10 w-28 object-contain rounded border border-slate-200 bg-slate-50 cursor-pointer hover:opacity-80 transition-opacity"
          />
        ) : (
          <span className="text-xs text-slate-400 italic">No image</span>
        ),
    },
    {
      field: "category",
      headerName: "Category",
      width: 130,
      renderCell: (p) => CATEGORIES.find((c) => c.value === p.value)?.label || p.value || "—",
    },
    {
      field: "title",
      headerName: "Title",
      flex: 1,
      minWidth: 180,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span>,
    },
    {
      field: "alt_text",
      headerName: "Alt Text",
      flex: 1,
      minWidth: 180,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span>,
    },
    {
      field: "created_at",
      headerName: "Created Date",
      width: 140,
      renderCell: (p) => (p.value ? new Date(p.value).toLocaleDateString() : <span className="text-slate-400 text-xs">—</span>),
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
        <InlineLoader text="Loading images..." variant="ring" size="lg" />
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
                <ImageIcon size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Image Management</h1>
                <p className="text-sm text-slate-500">Manage image assets used across the system</p>
              </div>
            </div>
          </div>
          {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Image
          </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Images</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5">
              <p className="text-sm text-emerald-700 font-medium">Image</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-1">{imageCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-5">
              <p className="text-sm text-violet-700 font-medium">Logo</p>
              <h2 className="text-3xl font-bold text-violet-900 mt-1">{logoCount}</h2>
            </CardContent>
          </Card>
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Images"
        />

        {/* GRID */}
        <TooltipDataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalRows}
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
            {editingRow ? "Edit Image" : "Add Image"}
          </DialogTitle>
          <DialogContent>

            {/* Image Upload */}
            <div className="mt-2 mb-1">
              <p className="text-xs text-slate-500 mb-1">
                Image {!editingRow && <span className="text-red-500">*</span>}
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  formErrors.image
                    ? "border-red-400 bg-red-50"
                    : dragActive
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
                }`}
              >
                {formData.imagePreview ? (
                  <>
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
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
                    <span className="text-sm font-medium text-slate-500">Click or drag &amp; drop to upload</span>
                    <span className="text-xs">JPG, JPEG, PNG, WEBP, SVG — max 10 MB</span>
                  </div>
                )}
              </div>
              {formErrors.image && (
                <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.image}</p>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Category */}
            <div className="mt-3">
              <SearchableSelect
                label="Category"
                required
                value={formData.category}
                onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                options={CATEGORIES}
                placeholder="— Select Category —"
                error={formErrors.category}
              />
            </div>

            {/* Title */}
            <TextField
              fullWidth
              label="Title"
              margin="normal"
              size="small"
              value={formData.title}
              onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              placeholder="Image title or caption"
            />

            {/* Alt Text */}
            <TextField
              fullWidth
              label="Alt Text"
              margin="normal"
              size="small"
              value={formData.altText}
              onChange={(e) => setFormData((f) => ({ ...f, altText: e.target.value }))}
              placeholder="Alternative text for accessibility"
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

        {/* IMAGE PREVIEW MODAL */}
        <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage(null)} maxWidth="md">
          <DialogTitle className="font-bold flex items-center justify-between">
            Image Preview
            <IconButton size="small" onClick={() => setPreviewImage(null)}>
              <X size={18} />
            </IconButton>
          </DialogTitle>
          <DialogContent className="flex items-center justify-center bg-slate-50 p-6">
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[70vh] max-w-full object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default ImageManagement;
