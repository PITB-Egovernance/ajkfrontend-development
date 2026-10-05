import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Tooltip,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import Button from "components/ui/Button";
import { Avatar, AvatarImage, AvatarFallback } from "components/ui/avatar";
import { ArrowLeft, MoreVertical, Upload, X, User } from "lucide-react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { InlineLoader } from "components/ui/Loader";
import Config from "config/baseUrl";
import { authHeaders as apiAuthHeaders, fileUrl } from "utils/apiUtils";
import RichTextEditor from "components/ui/RichTextEditor";
import alertDialog from "components/ui/alertDialog";
import PhotoCropModal from "components/ui/PhotoCropModal";
import { isRichTextEmpty } from "utils/richText";

const API_BASE = Config.apiUrl;
// json=false → no Content-Type so the browser sets the multipart boundary itself.
const authHeaders = (json = false) => apiAuthHeaders(json);

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const getInitials = (name, fallback) => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** First validation message of an API error response. */
const firstApiError = (result) => {
  const first = result?.errors && Object.values(result.errors)[0];
  return (Array.isArray(first) ? first[0] : first) || result?.message;
};

/** Plain text of a rich-text message, for the table cell. */
const messageText = (html) => {
  const doc = new DOMParser().parseFromString(
    String(html || "").replace(/<\/(p|div|li|h[1-6]|blockquote)>|<br\s*\/?\s*>/gi, " "),
    "text/html"
  );
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

const EMPTY_FORM = {
  name: "",
  title: "Member",
  status: "active",
  message: "",
  message_title: "",
  message_status: "active",
};

/**
 * A main-website listing (Commission Members, Secretary and Officials) with one entry for a
 * single post (Chairman, Secretary). The post entry is not added by hand: its name is the post's
 * active holder from Employees, and editing it only sets the photo — plus, with `withMessage`,
 * that holder's message for the main website. It cannot be deleted or toggled here.
 *
 * @param {object} props
 * @param {string} props.endpoint      API path under /settings, e.g. "commission-members"
 * @param {string} props.heading       Page heading
 * @param {string} props.subtitle      Text under the heading
 * @param {string} props.itemLabel     One entry, e.g. "Commission Member"
 * @param {string} props.initials      Avatar fallback when there is no name
 * @param {React.ComponentType} props.icon  Empty-state icon
 * @param {string[]} props.titlePresets     Quick title buttons for other entries
 * @param {string} props.postTitle     Title of the post entry, e.g. "Chairman"
 * @param {boolean} [props.withMessage] Edit the post holder's website message on the post entry
 */
const PostListingManagement = ({
  endpoint,
  heading,
  subtitle,
  itemLabel,
  initials,
  icon: EmptyIcon,
  titlePresets,
  postTitle,
  withMessage = false,
}) => {
  const navigate = useNavigate();
  const apiPath = `${API_BASE}/settings/${endpoint}`;
  const uploadId = `${endpoint}-image-upload`;
  const isPostTitle = (title) => String(title || "").trim().toLowerCase() === postTitle.toLowerCase();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({ name: "", title: "", status: "" });

  const filterConfig = [
    { name: "name", label: "Name", type: "text", placeholder: "Filter by name" },
    {
      name: "title",
      label: "Title",
      type: "text",
      placeholder: `Filter by title (e.g. ${[postTitle, ...titlePresets].join(", ")})`,
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

  const handleClearFilters = () => setFilters({ name: "", title: "", status: "" });

  // Action menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Add / edit dialog
  const [openModal, setOpenModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [previewImageMember, setPreviewImageMember] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  // Image picked but not cropped yet (the crop modal is open while it is set).
  const [cropFile, setCropFile] = useState(null);
  const fileInputRef = useRef(null);

  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: "1000" });
      if (filters.name.trim()) params.set("name", filters.name.trim());
      if (filters.title.trim()) params.set("title", filters.title.trim());
      if (filters.status.trim()) params.set("status", filters.status.trim());

      const res = await fetch(`${apiPath}?${params.toString()}`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = Array.isArray(result.data?.data) ? result.data.data : [];
        setRows(
          data.map((item) => ({
            id: item.hash_id ?? item.id,
            hash_id: item.hash_id ?? item.id,
            name: item.name ?? "",
            title: item.title ?? "",
            image: fileUrl(item.image),
            status: item.status ?? "active",
            is_post_entry: Boolean(item.is_post_entry),
            message: item.message ?? "",
            message_title: item.message_title ?? "",
            message_status: item.message_status ?? "active",
          }))
        );
        setTotalCount(Number(result.data?.total ?? data.length));
        setActiveCount(Number(result.data?.status_counts?.active ?? 0));
        setInactiveCount(Number(result.data?.status_counts?.inactive ?? 0));
      } else {
        toast.error(result.message || `Failed to load ${heading.toLowerCase()}`);
        setRows([]);
      }
    } catch {
      toast.error(`Failed to load ${heading.toLowerCase()}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.name, filters.title, filters.status]);

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
      ...EMPTY_FORM,
      name: memberToEdit.name || "",
      title: memberToEdit.title || "Member",
      status: memberToEdit.status || "active",
      message: memberToEdit.message || "",
      message_title: memberToEdit.message_title || "",
      message_status: memberToEdit.message_status || "active",
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
      title: `Delete ${itemLabel}?`,
      message: `Are you sure you want to delete "${targetMember.name}"?`,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`${apiPath}/${targetMember.hash_id}/delete`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success(`"${targetMember.name}" deleted successfully`);
        fetchRows();
      } else if (res.status === 422) {
        await alertDialog({ title: "Not deleted", message: firstApiError(result) });
      } else {
        toast.error(result.message || `Failed to delete ${itemLabel.toLowerCase()}`);
      }
    } catch {
      toast.error(`Failed to delete ${itemLabel.toLowerCase()}`);
    }
  };

  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const confirmed = await confirmStatus({ newStatus });
    if (!confirmed) return;

    try {
      const fd = new FormData();
      fd.append("status", newStatus);

      const res = await fetch(`${apiPath}/${row.hash_id}/update`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success(`"${row.name}" status set to ${newStatus}`);
        fetchRows();
      } else {
        toast.error(result.message || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

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

    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      setFormErrors((prev) => ({ ...prev, image: "Please select a valid image file (JPEG, PNG, WEBP, GIF)" }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFormErrors((prev) => ({ ...prev, image: "Image size must be less than 5MB" }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, image: null }));
    setCropFile(file);
    e.target.value = "";
  };

  const handleCropConfirm = (cropped) => {
    setImageFile(cropped);
    setImagePreview(URL.createObjectURL(cropped));
    setCropFile(null);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFormErrors((prev) => ({ ...prev, image: null }));
  };

  const editingPostEntry = Boolean(editingMember?.is_post_entry);

  const validateForm = () => {
    const errors = {};
    if (editingPostEntry) {
      if (withMessage && isRichTextEmpty(formData.message)) {
        errors.message = `Please write the message from the ${postTitle}`;
      }
    } else {
      if (!formData.name.trim()) errors.name = "Name is required";
      if (!formData.title.trim()) {
        errors.title = "Title is required";
      } else if (isPostTitle(formData.title)) {
        errors.title = `The ${postTitle} entry comes from the Employees module. Edit the existing ${postTitle} entry instead.`;
      }
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
      if (editingPostEntry) {
        // Name and status follow the post's active holder in Employees; only photo (and message) change here.
        if (withMessage) {
          fd.append("message", formData.message);
          fd.append("message_title", formData.message_title.trim());
          fd.append("message_status", formData.message_status);
        }
      } else {
        fd.append("name", formData.name.trim());
        fd.append("title", formData.title.trim());
        // Status defaults to active on create (enforced by the backend).
        if (isUpdate) fd.append("status", formData.status);
      }
      if (imageFile) fd.append("image", imageFile);

      const url = isUpdate ? `${apiPath}/${editingMember.hash_id}/update` : `${apiPath}/store`;
      const res = await fetch(url, { method: "POST", headers: authHeaders(), body: fd });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? `${itemLabel} updated successfully` : `${itemLabel} added successfully`);
        setOpenModal(false);
        fetchRows();
      } else if (res.status === 422) {
        await alertDialog({ title: isUpdate ? "Not updated" : "Not added", message: firstApiError(result) });
      } else {
        toast.error(result.message || (isUpdate ? "Update failed" : "Create failed"));
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const contentWidths = useMemo(() => {
    const context = document.createElement("canvas").getContext("2d");
    const measureColumn = (field, header, font, padding) => {
      if (!context) return 220;
      context.font = "500 14px Roboto, Helvetica, Arial, sans-serif";
      const headerWidth = context.measureText(header).width + 60;
      context.font = font;
      return Math.ceil(
        Math.max(headerWidth, ...rows.map((row) => context.measureText(String(row[field] || "")).width + padding))
      );
    };
    return {
      name: measureColumn("name", "Name", "600 14px Roboto, Helvetica, Arial, sans-serif", 32),
      title: measureColumn("title", "Title", "500 12px Roboto, Helvetica, Arial, sans-serif", 48),
    };
  }, [rows]);

  // Every column flexes so the table fills the available width; minWidth keeps content readable.
  const columns = [
    {
      field: "image",
      headerName: "Image",
      flex: 0.5,
      minWidth: 90,
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
                <AvatarImage src={params.row.image} alt={params.row.name} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-emerald-100 text-emerald-900 font-bold text-xs">
                  {getInitials(params.row.name, initials)}
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
      flex: 1.5,
      minWidth: contentWidths.name,
      renderCell: (params) => (
        <span className="font-semibold text-slate-900 whitespace-nowrap">{params.row.name}</span>
      ),
    },
    {
      field: "title",
      headerName: "Title",
      flex: 1.5,
      minWidth: contentWidths.title,
      renderCell: (params) => (
        <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {params.row.title}
        </span>
      ),
    },
    ...(withMessage
      ? [
          {
            field: "message",
            headerName: "Message",
            flex: 2,
            minWidth: 160,
            sortable: false,
            renderCell: (params) => {
              const text = messageText(params.row.message);
              if (!text) return <span className="text-slate-400">—</span>;
              return (
                <Tooltip
                  title={<div style={{ maxHeight: "50vh", overflowY: "auto", overflowWrap: "anywhere" }}>{text}</div>}
                  arrow
                  placement="top"
                >
                  <span
                    style={{
                      display: "block",
                      width: "100%",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {text}
                  </span>
                </Tooltip>
              );
            },
          },
        ]
      : []),
    {
      field: "status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 140,
      renderCell: (params) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={params.row.status === "active"}
            onChange={() => handleToggleStatus(params.row, params.row.status)}
            disabled={params.row.is_post_entry}
            title={params.row.is_post_entry ? `Follows the active ${postTitle} in Employees` : undefined}
            inputProps={{ "aria-label": "toggle status" }}
            size="small"
            color={params.row.status === "active" ? "success" : "error"}
          />
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.5,
      minWidth: 90,
      sortable: false,
      renderCell: (params) => (
        <IconButton onClick={(e) => handleMenuOpen(e, params.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading && rows.length === 0) {
    return <InlineLoader text={`Loading ${heading.toLowerCase()}...`} variant="ring" size="lg" />;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: "-webkit-fill-available" }}>
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
            <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          </div>

          <Button onClick={handleOpenAdd}>Add {itemLabel}</Button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">Total Members</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">{totalCount}</h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">Active Members</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">{activeCount}</h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">Inactive Members</p>
              <h2 className="text-3xl font-bold text-red-900 mt-2">{inactiveCount}</h2>
            </CardContent>
          </Card>
        </div>

        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title={`Filter ${heading}`}
        />

        {/* DATA GRID TABLE */}
        <div className="mt-4">
          {rows.length > 0 ? (
            <TooltipDataGrid
              rows={rows}
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
                <EmptyIcon className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No {heading} Found</h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">
                There are no members matching your search or filter.
              </p>
              <Button onClick={handleOpenAdd}>Add {itemLabel}</Button>
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
          {!selectedRow?.is_post_entry && (
            <MenuItem onClick={handleDelete} className="text-sm text-red-600 font-medium">
              Delete
            </MenuItem>
          )}
        </Menu>

        {/* ADD & EDIT DIALOG */}
        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          fullWidth
          maxWidth={editingPostEntry && withMessage ? "md" : "sm"}
        >
          <DialogTitle className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between py-4 px-6">
            <span className="flex items-center gap-2 text-lg font-bold">
              <User className="w-5 h-5 text-emerald-300" />
              {editingPostEntry ? `Edit ${postTitle}` : `${editingMember ? "Edit" : "Add"} ${itemLabel}`}
            </span>
            <IconButton onClick={() => setOpenModal(false)} className="text-white hover:bg-emerald-900/50" size="small">
              <X className="w-5 h-5 text-white" />
            </IconButton>
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <DialogContent className="p-6 space-y-5">
              {/* IMAGE UPLOAD (cropped to a square before upload) */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                <span className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">
                  Profile Image
                </span>
                <div className="relative mb-3">
                  <Avatar className="w-24 h-24 border-2 border-emerald-500 shadow-md">
                    {imagePreview ? (
                      <AvatarImage src={imagePreview} alt={formData.name || "Preview"} className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 text-emerald-900 text-2xl font-bold">
                        {getInitials(formData.name, initials)}
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
                    id={uploadId}
                  />
                  <label
                    htmlFor={uploadId}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {imagePreview ? "Replace Image" : "Upload Image"}
                  </label>
                </div>
                {formErrors.image && <p className="text-xs text-red-500 font-medium mt-2">{formErrors.image}</p>}
              </div>

              {editingPostEntry ? (
                <>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{postTitle}</p>
                    <p className="text-base font-bold text-emerald-950">{formData.name}</p>
                    <p className="text-xs text-emerald-800 mt-1">
                      Name comes from the active {postTitle} in the Employees module. To change the {postTitle}, make
                      the current one Inactive in Employees and assign the post to the new person.
                    </p>
                  </div>

                  {withMessage && (
                    <>
                      <div>
                        <TextField
                          label="Message heading (optional)"
                          name="message_title"
                          value={formData.message_title}
                          onChange={handleInputChange}
                          placeholder={`e.g. Message from the ${postTitle}`}
                          fullWidth
                          variant="outlined"
                          size="small"
                          inputProps={{ maxLength: 255 }}
                        />
                      </div>

                      <div>
                        <span className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Message for the main website <span className="text-red-500">*</span>
                        </span>
                        <RichTextEditor
                          value={formData.message}
                          onChange={(html) => {
                            setFormData((prev) => ({ ...prev, message: html }));
                            if (formErrors.message) setFormErrors((prev) => ({ ...prev, message: null }));
                          }}
                          placeholder={`Write the message from the ${postTitle}...`}
                          minHeight={240}
                          disabled={saving}
                        />
                        {formErrors.message && (
                          <p className="text-xs text-red-500 font-medium mt-1">{formErrors.message}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Show message on main website</p>
                          <p className="text-xs text-slate-500">When off, the website shows no {postTitle} message.</p>
                        </div>
                        <Switch
                          checked={formData.message_status === "active"}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, message_status: e.target.checked ? "active" : "inactive" }))
                          }
                          color="success"
                          inputProps={{ "aria-label": "show message on main website" }}
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <TextField
                      label="Name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter name"
                      fullWidth
                      variant="outlined"
                      size="small"
                      required
                      error={Boolean(formErrors.name)}
                      helperText={formErrors.name}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-md font-bold font-large text-slate-600">Quick Title Presets:</span>
                      <div className="flex gap-1.5 font-bold font-large text-md">
                        {titlePresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, title: preset }))}
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
                    </div>
                    <br />
                    <TextField
                      label="Title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder={`e.g. ${titlePresets.join(" or ")}`}
                      fullWidth
                      variant="outlined"
                      size="small"
                      required
                      error={Boolean(formErrors.title)}
                      helperText={formErrors.title}
                    />
                  </div>
                </>
              )}
            </DialogContent>

            <DialogActions className="p-4 border-t border-slate-100 bg-slate-50">
              <Button type="button" variant="secondary" onClick={() => setOpenModal(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingPostEntry
                    ? `Save ${postTitle}`
                    : editingMember
                      ? `Update ${itemLabel}`
                      : `Add ${itemLabel}`}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <PhotoCropModal
          file={cropFile}
          title="Crop Profile Image"
          onClose={() => setCropFile(null)}
          onConfirm={handleCropConfirm}
        />

        {/* IMAGE PREVIEW */}
        <Dialog open={Boolean(previewImageMember)} onClose={() => setPreviewImageMember(null)} maxWidth="sm" fullWidth>
          <DialogTitle className="bg-slate-900 text-white flex items-center justify-between py-3.5 px-5">
            <div className="flex flex-col">
              <span className="font-bold text-base text-white">{previewImageMember?.name}</span>
              <span className="text-xs text-slate-300 font-normal">{previewImageMember?.title}</span>
            </div>
            <IconButton onClick={() => setPreviewImageMember(null)} className="text-white hover:bg-slate-800" size="small">
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
                    {getInitials(previewImageMember?.name, initials)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-slate-400">No Image Uploaded</span>
              </div>
            )}
          </DialogContent>
          <DialogActions className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center px-5">
            <span className="text-xs text-slate-400">
              Status:{" "}
              <span
                className={`font-semibold ${
                  previewImageMember?.status === "active" ? "text-emerald-400" : "text-slate-400"
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

export default PostListingManagement;
