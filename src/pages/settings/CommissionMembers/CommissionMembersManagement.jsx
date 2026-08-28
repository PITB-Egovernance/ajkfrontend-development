import React, { useState, useMemo, useRef, useEffect } from "react";
import TooltipDataGrid from "components/ui/TooltipDataGrid";
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
import { Avatar, AvatarImage, AvatarFallback } from "components/ui/avatar";
import {
  Plus,
  ArrowLeft,
  MoreVertical,
  Upload,
  X,
  User,
  Users as UsersIcon,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { InlineLoader } from "components/ui/Loader";
import Config from "config/baseUrl";
import AuthService from "services/authService";

const API_BASE = Config.apiUrl;
const API_KEY = Config.apiKey;
const FILE_BASE = Config.apiUrl.replace("/api/v1", "");

// json=false → no Content-Type so the browser sets the multipart boundary itself.
const authHeaders = (json = false) => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "X-API-KEY": API_KEY,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

const resolveImage = (path) => {
  if (!path) return null;
  const value = String(path);
  if (value.startsWith("http") || value.startsWith("blob:")) return value;
  return `${FILE_BASE}/${value}`;
};

const getInitials = (name) => {
  if (!name) return "CM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const TITLE_PRESETS = ["Chairman", "Member"];

const EMPTY_FORM = {
  name: "",
  title: "Member",
  status: "active",
};

const CommissionMembersManagement = () => {
  const navigate = useNavigate();

  // Live data from the backend API
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Advanced Filters State
  const [filters, setFilters] = useState({
    name: "",
    title: "",
    status: "",
  });

  const filterConfig = [
    {
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "Filter by member name",
    },
    {
      name: "title",
      label: "Title",
      type: "text",
      placeholder: "Filter by title (e.g. Chairman, Member)",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ name: "", title: "", status: "" });
  };

  // Action Menu State
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Modal State for Add & Edit
  const [openModal, setOpenModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Modal State for Image Preview Box
  const [previewImageMember, setPreviewImageMember] = useState(null);

  // Form State - strictly EXACTLY 4 fields: name, title, image, status
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  /* ===============================
     FETCH COMMISSION MEMBERS
  =============================== */
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/commission-members`, {
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setRows(
          (Array.isArray(data) ? data : []).map((item) => ({
            id: item.hash_id ?? item.id,
            hash_id: item.hash_id ?? item.id,
            name: item.name ?? "",
            title: item.title ?? "",
            image: resolveImage(item.image),
            status: item.status ?? "active",
          }))
        );
      } else {
        toast.error(result.message || "Failed to load commission members");
        setRows([]);
      }
    } catch {
      toast.error("Failed to load commission members");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []); // eslint-disable-line

  // Filter logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const nameMatch =
        !filters.name ||
        row.name.toLowerCase().includes(filters.name.trim().toLowerCase());
      const titleMatch =
        !filters.title ||
        row.title.toLowerCase().includes(filters.title.trim().toLowerCase());
      const statusMatch =
        !filters.status ||
        row.status.toLowerCase() === filters.status.trim().toLowerCase();

      return nameMatch && titleMatch && statusMatch;
    });
  }, [rows, filters]);

  // Statistics Calculation
  const totalCount = rows.length;
  const activeCount = rows.filter((r) => r.status === "active").length;
  const inactiveCount = rows.filter((r) => r.status === "inactive").length;

  /* ===============================
     ACTION MENU HANDLERS
  =============================== */
  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setFormErrors({});
    setOpenModal(true);
  };

  const handleOpenEdit = () => {
    if (!selectedRow) return;
    const memberToEdit = selectedRow;
    handleMenuClose();

    setEditingMember(memberToEdit);
    setFormData({
      name: memberToEdit.name || "",
      title: memberToEdit.title || "Member",
      status: memberToEdit.status || "active",
    });
    setImageFile(null);
    setImagePreview(memberToEdit.image || null);
    setFormErrors({});
    setOpenModal(true);
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    const targetMember = selectedRow;
    handleMenuClose();

    const confirmed = await confirmDelete({
      title: "Delete Commission Member?",
      message: `Are you sure you want to delete "${targetMember.name}"?`,
      warning: "This action cannot be undone.",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API_BASE}/settings/commission-members/${targetMember.hash_id}/delete`,
        { method: "DELETE", headers: authHeaders() }
      );
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success(`Member "${targetMember.name}" deleted successfully`);
        fetchMembers();
      } else {
        toast.error(result.message || "Failed to delete member");
      }
    } catch {
      toast.error("Failed to delete member");
    }
  };

  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const confirmed = await confirmStatus({ newStatus });
    if (!confirmed) return;

    try {
      const fd = new FormData();
      fd.append("status", newStatus);

      const res = await fetch(
        `${API_BASE}/settings/commission-members/${row.hash_id}/update`,
        { method: "POST", headers: authHeaders(), body: fd }
      );
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success(`Member "${row.name}" status set to ${newStatus}`);
        fetchMembers();
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  /* ===============================
     FORM INPUT & VALIDATION HANDLERS
  =============================== */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        image: "Please select a valid image file (JPEG, PNG, WEBP, GIF)",
      }));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxSize) {
      setFormErrors((prev) => ({
        ...prev,
        image: "Image size must be less than 5MB",
      }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, image: null }));
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageFile(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFormErrors((prev) => ({ ...prev, image: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Member name is required";
    }
    if (!formData.title.trim()) {
      errors.title = "Member title is required";
    }
    if (!formData.status) {
      errors.status = "Status is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const isUpdate = !!editingMember;
      const fd = new FormData();
      fd.append("name", formData.name.trim());
      fd.append("title", formData.title.trim());
      // Status defaults to active on create (enforced by the backend); only
      // sent explicitly when editing an existing member.
      if (isUpdate) fd.append("status", formData.status);
      if (imageFile) fd.append("image", imageFile);

      const url = isUpdate
        ? `${API_BASE}/settings/commission-members/${editingMember.hash_id}/update`
        : `${API_BASE}/settings/commission-members/store`;

      const res = await fetch(url, { method: "POST", headers: authHeaders(), body: fd });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? "Member updated successfully" : "Member added successfully");
        setOpenModal(false);
        fetchMembers();
      } else {
        toast.error(result.message || (isUpdate ? "Update failed" : "Create failed"));
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSaving(false);
    }
  };

  /* ===============================
     DATAGRID COLUMNS
  =============================== */
  const columns = [
    {
      field: "image",
      headerName: "Image",
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center justify-center h-full">
          <button
            type="button"
            onClick={() => setPreviewImageMember(params.row)}
            className="focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full transition-transform hover:scale-110"
            title="Click to view image preview"
          >
            <Avatar className="w-10 h-10 border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-500">
              {params.row.image ? (
                <AvatarImage
                  src={params.row.image}
                  alt={params.row.name}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="bg-emerald-100 text-emerald-900 font-bold text-xs">
                  {getInitials(params.row.name)}
                </AvatarFallback>
              )}
            </Avatar>
          </button>
        </div>
      ),

    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 220,
      renderCell: (params) => (
        <span className="font-semibold text-slate-900">{params.row.name}</span>
      ),
    },
    {
      field: "title",
      headerName: "Title",
      width: 180,
      renderCell: (params) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {params.row.title}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={params.row.status === "active"}
            onChange={() => handleToggleStatus(params.row, params.row.status)}
            inputProps={{ "aria-label": "toggle member status" }}
            size="small"
            color={params.row.status === "active" ? "success" : "error"}
          />
          {/* <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              params.row.status === "active"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            ● {params.row.status === "active" ? "Active" : "Inactive"}
          </span> */}
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <IconButton onClick={(e) => handleMenuOpen(e, params.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading && rows.length === 0) {
    return <InlineLoader text="Loading commission members..." variant="ring" size="lg" />;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div
        className="mx-auto bg-white rounded-xl shadow-sm p-6"
        style={{ minWidth: "-webkit-fill-available" }}
      >
        {/* PAGE HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="text-sm text-gray-600 flex items-center mb-2 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Commission Members
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage AJK Public Service Commission Members and Chairman listings.
            </p>
          </div>

          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Commission Member
          </Button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* TOTAL MEMBERS */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">
                Total Members
              </p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">
                {totalCount}
              </h2>
            </CardContent>
          </Card>

          {/* ACTIVE MEMBERS */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">
                Active Members
              </p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">
                {activeCount}
              </h2>
            </CardContent>
          </Card>

          {/* INACTIVE MEMBERS */}
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">
                Inactive Members
              </p>
              <h2 className="text-3xl font-bold text-red-900 mt-2">
                {inactiveCount}
              </h2>
            </CardContent>
          </Card>
        </div>

        {/* ADVANCED FILTER BAR */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Commission Members"
        />

        {/* DATA GRID TABLE */}
        <div className="mt-4">
          {filteredRows.length > 0 ? (
            <TooltipDataGrid
              rows={filteredRows}
              columns={columns}
              autoHeight
              disableSelectionOnClick
              loading={loading}
              pageSize={15}
              rowsPerPageOptions={[10, 15, 25, 50]}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm flex flex-col items-center justify-center my-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                <UsersIcon className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                No Commission Members Found
              </h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">
                There are no members matching your search or filter.
              </p>
              <Button onClick={handleOpenAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Commission Member
              </Button>
            </div>
          )}
        </div>

        {/* ACTION ROW MENU */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          elevation={2}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem onClick={handleOpenEdit} className="text-sm text-slate-700">
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete} className="text-sm text-red-600 font-medium">
            Delete
          </MenuItem>
        </Menu>

        {/* REUSABLE ADD & EDIT MODAL */}
        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between py-4 px-6">
            <span className="flex items-center gap-2 text-lg font-bold">
              <User className="w-5 h-5 text-emerald-300" />
              {editingMember ? "Edit Commission Member" : "Add Commission Member"}
            </span>
            <IconButton
              onClick={() => setOpenModal(false)}
              className="text-white hover:bg-emerald-900/50"
              size="small"
            >
              <X className="w-5 h-5 text-white" />
            </IconButton>
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <DialogContent className="p-6 space-y-5">
              {/* IMAGE UPLOAD FIELD */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                <span className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">
                  Profile Image
                </span>
                <div className="relative mb-3">
                  <Avatar className="w-24 h-24 border-2 border-emerald-500 shadow-md">
                    {imagePreview ? (
                      <AvatarImage
                        src={imagePreview}
                        alt={formData.name || "Preview"}
                        className="object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-900 text-2xl font-bold">
                        {getInitials(formData.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    id="commission-member-image-upload"
                  />
                  <label
                    htmlFor="commission-member-image-upload"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {imagePreview ? "Replace Image" : "Upload Image"}
                  </label>
                </div>
                {formErrors.image && (
                  <p className="text-xs text-red-500 font-medium mt-2">
                    {formErrors.image}
                  </p>
                )}
              </div>

              {/* NAME FIELD */}
              <div>
                <TextField
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter member name"
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  error={Boolean(formErrors.name)}
                  helperText={formErrors.name}
                />
              </div>

              {/* TITLE FIELD */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-md font-bold font-large text-slate-600">
                    Quick Title Presets:
                  </span>
                  <div className="flex gap-1.5 font-bold font-large text-md">
                    {TITLE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, title: preset }))
                        }
                        className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                          formData.title === preset
                            ? "bg-emerald-100 border-emerald-400 text-emerald-900 font-medium"
                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div><br/>
                <TextField
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Chairman or Member"
                  fullWidth
                  variant="outlined"
                  size="small"
                  required
                  error={Boolean(formErrors.title)}
                  helperText={formErrors.title}
                />
              </div>

              {/* STATUS FIELD */}
              {/* <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, status: "active" }))
                    }
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                      formData.status === "active"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Active
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, status: "inactive" }))
                    }
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                      formData.status === "inactive"
                        ? "bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-400/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    Inactive
                  </button>
                </div>
                {formErrors.status && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    {formErrors.status}
                  </p>
                )}
              </div> */}
            </DialogContent>

            <DialogActions className="p-4 border-t border-slate-100 bg-slate-50">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpenModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingMember ? "Update Member" : "Add Member"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* IMAGE PREVIEW BOX MODAL */}
        <Dialog
          open={Boolean(previewImageMember)}
          onClose={() => setPreviewImageMember(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle className="bg-slate-900 text-white flex items-center justify-between py-3.5 px-5">
            <div className="flex flex-col">
              <span className="font-bold text-base text-white">
                {previewImageMember?.name}
              </span>
              <span className="text-xs text-slate-300 font-normal">
                {previewImageMember?.title}
              </span>
            </div>
            <IconButton
              onClick={() => setPreviewImageMember(null)}
              className="text-white hover:bg-slate-800"
              size="small"
            >
              <X className="w-5 h-5 text-white" />
            </IconButton>
          </DialogTitle>
          <DialogContent className="p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[300px]">
            {previewImageMember?.image ? (
              <img
                src={previewImageMember.image}
                alt={previewImageMember.name}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <Avatar className="w-32 h-32 border-4 border-slate-800 shadow-2xl mb-4">
                  <AvatarFallback className="bg-emerald-900 text-emerald-100 text-4xl font-bold">
                    {getInitials(previewImageMember?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-slate-400">
                  No Image Uploaded
                </span>
              </div>
            )}
          </DialogContent>
          <DialogActions className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-5">
            <span className="text-xs text-slate-400">
              Status:{" "}
              <span
                className={`font-semibold ${
                  previewImageMember?.status === "active"
                    ? "text-emerald-400"
                    : "text-slate-400"
                }`}
              >
                {previewImageMember?.status === "active" ? "Active" : "Inactive"}
              </span>
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreviewImageMember(null)}
              className="text-xs px-4 py-1.5"
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};


export default CommissionMembersManagement;
