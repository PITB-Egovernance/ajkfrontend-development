import React, { useState, useEffect } from "react";
import TooltipDataGrid from "components/ui/TooltipDataGrid";
import SearchableSelect from "components/ui/SearchableSelect";
import {
  TextField, MenuItem, IconButton, Menu, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, FormControlLabel, Chip,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import { Plus, ArrowLeft, MoreVertical, Newspaper, Upload, X, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import { InlineLoader } from "components/ui/Loader";
import { GRID_SX } from "utils/gridStyles";
import { hasPermission } from "utils/permissions";
import Config from "config/baseUrl";
import AuthService from "services/authService";
import AdvancedFilter from "components/tables/AdvancedFilter";

const PERM = "settings.news";

const API_BASE = Config.apiUrl;
const API_KEY  = Config.apiKey;
const FILE_BASE = Config.apiUrl.replace("/api/v1", "");

// json=false → no Content-Type so the browser sets the multipart boundary itself.
const authHeaders = (json = false) => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "X-API-KEY": API_KEY,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

// Fixed news categories (seeded in news_categories) — names only.
const NEWS_CATEGORIES = [
  "Latest News",
  "Important Notice",
  "Press Release",
  "Advertisement",
  "Result",
  "Interview Schedule",
  "Written Test Schedule",
];

const NEWS_TYPES = [
  { value: "general",       label: "General" },
  { value: "notice",        label: "Notice" },
  { value: "press_release", label: "Press Release" },
  { value: "advertisement", label: "Advertisement" },
  { value: "result",        label: "Result" },
  { value: "schedule",      label: "Schedule" },
  { value: "corrigendum",   label: "Corrigendum" },
  { value: "public_notice", label: "Public Notice" },
];

const DISPLAY_TYPES = [
  { value: "normal",    label: "Normal" },
  { value: "important", label: "Important" },
  { value: "urgent",    label: "Urgent" },
  { value: "new",       label: "New" },
];

const STATUSES = [
  { value: "draft",       label: "Draft",       color: "default" },
  { value: "published",   label: "Published",   color: "success" },
  { value: "unpublished", label: "Unpublished", color: "warning" },
  { value: "archived",    label: "Archived",    color: "error" },
];

const resolveFile = (path) => {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
  return `${FILE_BASE}/${path}`;
};

const EMPTY_FORM = {
  category:           "",     // free-text category name
  title:              "",
  short_description:  "",
  description:        "",
  news_type:          "general",
  display_type:       "normal",
  attachment:         null,   // new single file
  attachmentName:     "",     // existing single attachment path
  attachment_title:   "",
  attachments:        [],     // new multiple files
  existingAttachments: [],    // existing multiple attachment paths (display only)
  external_link:      "",
  publish_date:       "",
  expiry_date:        "",
  is_featured:        false,
  is_marquee:         false,
  show_on_home:       true,
  status:             "draft",
};

const NewsManagement = () => {
  const navigate = useNavigate();
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ title: "", category: "", news_type: "", status: "" });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: "title", label: "Title", type: "text", placeholder: "Search by title..." },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: NEWS_CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    { name: "news_type", label: "Type", type: "select", options: NEWS_TYPES },
    { name: "status", label: "Status", type: "select", options: STATUSES },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ title: "", category: "", news_type: "", status: "" });
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  /* ── FETCH ── */
  const fetchNews = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/news`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setRows(
          (Array.isArray(data) ? data : []).map((item, i) => ({
            id:                item.hash_id ?? item.id,
            hash_id:           item.hash_id ?? item.id,
            sr_no:             i + 1,
            category:          item.category ?? "",
            title:             item.title ?? "-",
            slug:              item.slug ?? "",
            short_description: item.short_description ?? "",
            description:       item.description ?? "",
            news_type:         item.news_type ?? "general",
            display_type:      item.display_type ?? "normal",
            attachment:        item.attachment ?? "",
            attachment_title:  item.attachment_title ?? "",
            attachments:       Array.isArray(item.attachments) ? item.attachments : [],
            external_link:     item.external_link ?? "",
            publish_date:      (item.publish_date ?? "").slice(0, 10),
            expiry_date:       (item.expiry_date ?? "").slice(0, 10),
            is_featured:       !!item.is_featured,
            is_marquee:        !!item.is_marquee,
            show_on_home:      item.show_on_home === undefined ? true : !!item.show_on_home,
            status:            item.status ?? "draft",
          }))
        );
      } else {
        toast.error(result.message || "Failed to load news");
        setRows([]);
      }
    } catch {
      toast.error("Failed to load news");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []); // eslint-disable-line

  const total         = rows.length;
  const publishedCount = rows.filter((r) => r.status === "published").length;
  const draftCount     = rows.filter((r) => r.status === "draft").length;
  const featuredCount  = rows.filter((r) => r.is_featured).length;

  const filtered = rows.filter((r) => {
    if (filters.title.trim() && !r.title?.toLowerCase().includes(filters.title.trim().toLowerCase())) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.news_type && r.news_type !== filters.news_type) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  /* ── MENU ── */
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const buildFormFromRecord = (r) => ({
    ...EMPTY_FORM,
    category:            r.category || "",
    title:               r.title || "",
    short_description:   r.short_description || "",
    description:         r.description || "",
    news_type:           r.news_type || "general",
    display_type:        r.display_type || "normal",
    attachmentName:      r.attachment || "",
    attachment_title:    r.attachment_title || "",
    existingAttachments: Array.isArray(r.attachments) ? r.attachments : [],
    external_link:       r.external_link || "",
    publish_date:        (r.publish_date || "").slice(0, 10),
    expiry_date:         (r.expiry_date || "").slice(0, 10),
    is_featured:         !!r.is_featured,
    is_marquee:          !!r.is_marquee,
    show_on_home:        r.show_on_home === undefined ? true : !!r.show_on_home,
    status:              r.status || "draft",
  });

  const openEdit = async () => {
    const r = selectedRow;
    handleMenuClose();
    setEditing(r);
    setForm(buildFormFromRecord(r)); // seed from list row immediately
    setOpen(true);

    // Pull the full record (GET /settings/news/{hash}) so long fields and the
    // complete attachment set are accurate.
    try {
      const res    = await fetch(`${API_BASE}/settings/news/${r.hash_id}`, { headers: authHeaders() });
      const result = await res.json();
      const item   = result.data?.data ?? result.data ?? null;
      if (item && typeof item === "object") {
        setForm(buildFormFromRecord({ ...r, ...item }));
      }
    } catch { /* keep the row-seeded form */ }
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onSingleFile = (e) => {
    const file = e.target.files[0];
    if (file) setField("attachment", file);
    e.target.value = "";
  };

  const onMultiFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setForm((f) => ({ ...f, attachments: [...f.attachments, ...files] }));
    e.target.value = "";
  };

  const removeNewAttachment = (idx) =>
    setForm((f) => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }));

  /* ── CREATE / UPDATE ── */
  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }

    setSaving(true);
    try {
      const isUpdate = !!editing;
      const fd = new FormData();
      // slug + created_by/updated_by are stamped by the backend — do not send them.
      fd.append("title", form.title.trim());
      if (form.category)         fd.append("category", form.category);
      fd.append("short_description", form.short_description || "");
      fd.append("description", form.description || "");
      fd.append("news_type", form.news_type);
      fd.append("display_type", form.display_type);
      if (form.attachment_title) fd.append("attachment_title", form.attachment_title);
      if (form.external_link)    fd.append("external_link", form.external_link);
      if (form.publish_date)     fd.append("publish_date", form.publish_date);
      if (form.expiry_date)      fd.append("expiry_date", form.expiry_date);
      fd.append("is_featured",  form.is_featured ? 1 : 0);
      fd.append("is_marquee",   form.is_marquee ? 1 : 0);
      fd.append("show_on_home", form.show_on_home ? 1 : 0);
      fd.append("status", form.status);

      // Single primary attachment (new upload replaces the old one).
      if (form.attachment) fd.append("attachment", form.attachment);

      // Multiple attachments: sending attachments[] replaces the whole set, so only
      // send it when the user actually picked new files (otherwise existing stay).
      form.attachments.forEach((file) => fd.append("attachments[]", file));

      // Both create and update use POST so PHP parses the multipart body.
      // Update route is /settings/news/{hash}/update (no PUT method spoofing).
      const url = isUpdate
        ? `${API_BASE}/settings/news/${editing.hash_id}/update`
        : `${API_BASE}/settings/news/store`;

      const res    = await fetch(url, { method: "POST", headers: authHeaders(), body: fd });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? "News updated successfully" : "News created successfully");
        setOpen(false);
        setEditing(null);
        fetchNews();
      } else {
        toast.error(result.message || (isUpdate ? "Update failed" : "Create failed"));
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
    if (!await confirmDelete({ title: "Delete News", identifier: selectedRow.title })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/news/${selectedRow.hash_id}/delete`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success("News deleted successfully");
        fetchNews();
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no", headerName: "#", width: 70 },
    { field: "title", headerName: "Title", flex: 1, minWidth: 220 },
    {
      field: "news_type", headerName: "Type", width: 140,
      renderCell: (p) => NEWS_TYPES.find((t) => t.value === p.value)?.label || p.value,
    },
    {
      field: "display_type", headerName: "Display", width: 120,
      renderCell: (p) => DISPLAY_TYPES.find((t) => t.value === p.value)?.label || p.value,
    },
    { field: "publish_date", headerName: "Publish", width: 120,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    {
      field: "status", headerName: "Status", width: 130,
      renderCell: (p) => {
        const s = STATUSES.find((x) => x.value === p.value);
        return <Chip size="small" label={s?.label || p.value} color={s?.color || "default"} variant="outlined" />;
      },
    },
    ...(canRowActions ? [{
      field: "actions", headerName: "Actions", width: 75, sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ];

  if (loading && rows.length === 0)
    return <InlineLoader text="Loading news..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: "-webkit-fill-available" }}>

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate("/dashboard/settings")}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Newspaper size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">News &amp; Notices</h1>
                <p className="text-sm text-slate-500">Manage news, notices and announcements</p>
              </div>
            </div>
          </div>
          {canAdd && (
            <button onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
              <Plus size={15} /> Add News
            </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5"><p className="text-sm text-emerald-700 font-medium">Published</p><h2 className="text-3xl font-bold text-emerald-900 mt-1">{publishedCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="p-5"><p className="text-sm text-amber-700 font-medium">Drafts</p><h2 className="text-3xl font-bold text-amber-900 mt-1">{draftCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-5"><p className="text-sm text-violet-700 font-medium">Featured</p><h2 className="text-3xl font-bold text-violet-900 mt-1">{featuredCount}</h2></CardContent>
          </Card>
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter News & Notices"
        />

        {/* GRID */}
        <TooltipDataGrid
          rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={GRID_SX}
          loading={loading}
        />

        {/* ROW MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={openEdit}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>}
        </Menu>

        {/* ADD / EDIT MODAL */}
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
          <DialogTitle className="font-bold flex items-center gap-2">
            <Newspaper size={18} className="text-emerald-700" />
            {editing ? "Edit News" : "Add News"}
          </DialogTitle>

          <DialogContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              {/* Title */}
              <TextField fullWidth autoFocus label="Title" margin="dense" size="small"
                value={form.title} onChange={(e) => setField("title", e.target.value)}
                className="md:col-span-2" placeholder="News headline"
                helperText="Slug is auto-generated from the title" />

              {/* Category */}
              <SearchableSelect
                label="Category"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                options={[
                  { value: "", label: "— None —" },
                  ...NEWS_CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
                placeholder="— None —"
              />

              {/* News type */}
              <SearchableSelect
                label="News Type"
                value={form.news_type}
                onChange={(e) => setField("news_type", e.target.value)}
                options={NEWS_TYPES}
                placeholder="— Select News Type —"
              />

              {/* Display type */}
              <SearchableSelect
                label="Display Type"
                value={form.display_type}
                onChange={(e) => setField("display_type", e.target.value)}
                options={DISPLAY_TYPES}
                placeholder="— Select Display Type —"
              />

              {/* Short description */}
              <TextField fullWidth label="Short Description" margin="dense" size="small" multiline minRows={2}
                value={form.short_description} onChange={(e) => setField("short_description", e.target.value)}
                className="md:col-span-2" />

              {/* Description */}
              <TextField fullWidth label="Description" margin="dense" size="small" multiline minRows={4}
                value={form.description} onChange={(e) => setField("description", e.target.value)}
                className="md:col-span-2" />

              {/* Dates */}
              <TextField fullWidth type="date" label="Publish Date" margin="dense" size="small"
                InputLabelProps={{ shrink: true }}
                value={form.publish_date} onChange={(e) => setField("publish_date", e.target.value)} />
              <TextField fullWidth type="date" label="Expiry Date" margin="dense" size="small"
                InputLabelProps={{ shrink: true }}
                value={form.expiry_date} onChange={(e) => setField("expiry_date", e.target.value)} />

              {/* External link */}
              <TextField fullWidth label="External Link" margin="dense" size="small"
                value={form.external_link} onChange={(e) => setField("external_link", e.target.value)}
                className="md:col-span-2" placeholder="https://..." />

              {/* Attachment title */}
              <TextField fullWidth label="Attachment Title" margin="dense" size="small"
                value={form.attachment_title} onChange={(e) => setField("attachment_title", e.target.value)}
                className="md:col-span-2" />

              {/* Status */}
              <SearchableSelect
                label="Status"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                options={STATUSES}
                placeholder="— Select Status —"
              />
            </div>

            {/* Primary attachment (single) */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">Primary Attachment</p>
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 text-sm text-slate-600">
                <Upload size={16} /> Choose file
                <input type="file" className="hidden" onChange={onSingleFile} />
              </label>
              {form.attachment ? (
                <span className="ml-3 text-sm text-slate-700 inline-flex items-center gap-1">
                  <Paperclip size={13} /> {form.attachment.name}
                  <button type="button" onClick={() => setField("attachment", null)}
                    className="text-red-500 ml-1"><X size={13} /></button>
                </span>
              ) : form.attachmentName ? (
                <a href={resolveFile(form.attachmentName)} target="_blank" rel="noreferrer"
                  className="ml-3 text-sm text-emerald-700 underline inline-flex items-center gap-1">
                  <Paperclip size={13} /> Current file
                </a>
              ) : null}
            </div>

            {/* Multiple attachments */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">Attachments (multiple images)</p>
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 text-sm text-slate-600">
                <Upload size={16} /> Add files
                <input type="file" multiple accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={onMultiFiles} />
              </label>

              {/* New files queued for upload */}
              {form.attachments.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {form.attachments.map((file, i) => (
                    <div key={`new-${i}`} className="flex items-center justify-between text-sm bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                      <span className="inline-flex items-center gap-1 truncate text-slate-700">
                        <Paperclip size={13} /> {file.name}
                      </span>
                      <button type="button" onClick={() => removeNewAttachment(i)} className="text-red-500"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Existing attachments (read-only). Uploading new files replaces them all. */}
              {form.existingAttachments.length > 0 && (
                <div className="mt-2">
                  <p className="text-[11px] text-slate-400 mb-1">
                    Current attachments — uploading new files will replace all of these:
                  </p>
                  <div className="flex flex-col gap-1">
                    {form.existingAttachments.map((path, i) => (
                      <a key={`ex-${i}`} href={resolveFile(path)} target="_blank" rel="noreferrer"
                        className="text-sm text-emerald-700 underline inline-flex items-center gap-1 truncate bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        <Paperclip size={13} /> {String(path).split("/").pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="mt-3 flex flex-wrap gap-4">
              <FormControlLabel control={
                <Switch checked={form.is_featured} color="success"
                  onChange={(e) => setField("is_featured", e.target.checked)} />
              } label="Featured" />
              <FormControlLabel control={
                <Switch checked={form.is_marquee} color="success"
                  onChange={(e) => setField("is_marquee", e.target.checked)} />
              } label="Show in Marquee" />
              <FormControlLabel control={
                <Switch checked={form.show_on_home} color="success"
                  onChange={(e) => setField("show_on_home", e.target.checked)} />
              } label="Show on Home" />
            </div>
          </DialogContent>

          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Update News" : "Create News"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default NewsManagement;
