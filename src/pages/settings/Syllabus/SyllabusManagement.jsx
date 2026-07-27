import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { Plus, ArrowLeft, MoreVertical, BookOpen, Upload, X, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { hasPermission } from "utils/permissions";
import Config from "config/baseUrl";
import AuthService from "services/authService";

const PERM = "settings.syllabus";

const API_BASE = Config.apiUrl;
const API_KEY  = Config.apiKey;
const BASE_URL = Config.apiUrl.replace("/api/v1", "");

// Max upload size for a syllabus PDF — 10 MB.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const resolveFile = (path) => {
  if (!path) return null;
  if (String(path).startsWith("http")) return path;
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

const EMPTY_FORM = {
  job_hash_id:     "",
  case_number:     "",
  designation:     "",
  department:      "",
  file:            null,
  existingFileUrl: "",
};

const SyllabusManagement = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [allRows,  setAllRows]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [filters,  setFilters]  = useState({ case_number: "", designation: "", department: "" });

  const [caseOptions, setCaseOptions] = useState([]); // [{ value, label, case_number, designation, department }]
  const [caseOptionsLoading, setCaseOptionsLoading] = useState(false);

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editingRow,  setEditingRow]  = useState(null);
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [dragActive,  setDragActive]  = useState(false);

  /* ── FETCH SYLLABUS LIST ── */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/syllabus`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setAllRows(
          (Array.isArray(data) ? data : []).map((item, i) => ({
            id:               item.hash_id ?? item.id,
            hash_id:          item.hash_id ?? item.id,
            sr_no:            i + 1,
            job_hash_id:      item.job_detail_hash_id ?? item.job_hash_id ?? "",
            case_number:      item.case_number ?? "",
            designation:      item.designation ?? "",
            department:       item.department ?? "",
            file:             resolveFile(item.url ?? item.file ?? item.file_url ?? item.path),
            created_at:       item.created_at ?? null,
          }))
        );
      } else {
        toast.error(result.message || "Failed to load syllabus records");
        setAllRows([]);
      }
    } catch {
      toast.error("Failed to load syllabus records");
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  /* ── FETCH JOB DETAILS (Case Number dropdown source) ── */
  const fetchJobDetails = async () => {
    setCaseOptionsLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/job-details-list`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setCaseOptions(
          (Array.isArray(data) ? data : []).map((item) => {
            const jobId  = item.job_detail_hash_id ?? item.hash_id ?? item.id;
            // The live API doesn't always return a dedicated case_number field —
            // fall back to the job id so a case number is always selectable and
            // never blocks submission with a blank value.
            const caseNo = item.case_number ?? item.caseNumber ?? jobId ?? "";
            return {
              value:       jobId,
              label:       caseNo,
              case_number: caseNo,
              designation: item.designation ?? "",
              department:  item.department ?? "",
            };
          })
        );
      } else {
        toast.error(result.message || "Failed to load job details");
        setCaseOptions([]);
      }
    } catch {
      toast.error("Failed to load job details");
      setCaseOptions([]);
    } finally {
      setCaseOptionsLoading(false);
    }
  };

  const caseOptionsMap = useMemo(() => {
    const map = {};
    caseOptions.forEach((o) => { map[o.value] = o; });
    return map;
  }, [caseOptions]);

  // Guarantee the dropdown always has an option matching the currently-loaded
  // case number, even if that job no longer appears in the live case list
  // (e.g. editing an older record) — otherwise the select would render blank.
  const caseSelectOptions = useMemo(() => {
    if (formData.case_number && !caseOptionsMap[formData.job_hash_id]) {
      return [{ value: formData.job_hash_id || "__current__", label: formData.case_number }, ...caseOptions];
    }
    return caseOptions;
  }, [caseOptions, caseOptionsMap, formData.case_number, formData.job_hash_id]);

  /* ── CASE NUMBER SELECT → AUTO-FILL DESIGNATION / DEPARTMENT ── */
  const handleCaseNumberChange = (e) => {
    const value = e.target.value;
    const opt = caseOptionsMap[value];
    setFormData((f) => ({
      ...f,
      job_hash_id: value,
      case_number: opt ? opt.case_number : f.case_number,
      designation: opt ? opt.designation : f.designation,
      department:  opt ? opt.department : f.department,
    }));
    setFormErrors((errs) => ({ ...errs, case_number: undefined }));
  };

  /* ── FILE VALIDATION ── */
  const applyFile = (file) => {
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Only PDF files are allowed");
      setFormErrors((errs) => ({ ...errs, file: "Only PDF files are allowed" }));
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      toast.error("File must not be larger than 10 MB");
      setFormErrors((errs) => ({ ...errs, file: "File must not be larger than 10 MB" }));
      return;
    }

    setFormData((f) => ({ ...f, file }));
    setFormErrors((errs) => ({ ...errs, file: undefined }));
  };

  const handleFileChange = (e) => {
    applyFile(e.target.files[0]);
    e.target.value = "";
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setFormData((f) => ({ ...f, file: null, existingFileUrl: "" }));
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    applyFile(e.dataTransfer.files?.[0]);
  };

  /* ── FILTER ── */
  const departmentOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => r.department).filter(Boolean));
    return [...set].map((d) => ({ value: d, label: d }));
  }, [allRows]);

  const filterConfig = [
    { name: "case_number", label: "Case Number", type: "text", placeholder: "Search by case number" },
    { name: "designation", label: "Designation", type: "text", placeholder: "Search by designation" },
    { name: "department",  label: "Department",  type: "select", options: departmentOptions },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters({ case_number: "", designation: "", department: "" });

  const filteredRows = allRows.filter((row) => {
    if (filters.case_number && !row.case_number.toLowerCase().includes(filters.case_number.toLowerCase())) return false;
    if (filters.designation && !row.designation.toLowerCase().includes(filters.designation.toLowerCase())) return false;
    if (filters.department && row.department !== filters.department) return false;
    return true;
  });

  const total = allRows.length;
  const departmentsCovered = new Set(allRows.map((r) => r.department).filter(Boolean)).size;
  const recentCount = allRows.filter((r) => {
    if (!r.created_at) return false;
    const days = (Date.now() - new Date(r.created_at).getTime()) / 86400000;
    return days <= 30;
  }).length;

  /* ── MENU ── */
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const openAdd = () => {
    setEditingRow(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setOpenModal(true);
    fetchJobDetails(); // Step 1 — load all Job Details as soon as the form opens
  };

  const handleEdit = () => {
    setEditingRow(selectedRow);
    setFormData({
      job_hash_id:     selectedRow.job_hash_id || "",
      case_number:     selectedRow.case_number ?? "",
      designation:     selectedRow.designation ?? "",
      department:      selectedRow.department ?? "",
      file:            null,
      existingFileUrl: selectedRow.file ?? "",
    });
    setFormErrors({});
    setOpenModal(true);
    handleMenuClose();
    fetchJobDetails(); // reload Job Details so the Case Number can be pre-selected
  };

  /* ── VALIDATION ── */
  const validate = () => {
    const errs = {};
    if (!formData.job_hash_id) errs.case_number = "Case number is required";
    if (!editingRow && !formData.file) errs.file = "Syllabus PDF is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── SAVE ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      if (formData.job_hash_id && formData.job_hash_id !== "__current__") {
        fd.append("job_detail_hash_id", formData.job_hash_id);
      }
      fd.append("case_number", formData.case_number);
      fd.append("designation", formData.designation || "");
      fd.append("department", formData.department || "");
      if (formData.file) fd.append("file", formData.file);

      let res;
      if (editingRow) {
        res = await fetch(`${API_BASE}/settings/syllabus/${editingRow.hash_id}/update`, {
          method: "PUT",
          headers: authHeaders(),
          body: fd,
        });
      } else {
        res = await fetch(`${API_BASE}/settings/syllabus/store`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
      }

      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(editingRow ? "Syllabus updated successfully" : "Syllabus added successfully");
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
    if (!await confirmDelete({ title: "Delete Syllabus", identifier: selectedRow.case_number || "this syllabus" })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/syllabus/${selectedRow.hash_id}/delete`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success("Syllabus deleted successfully");
        fetchAll();
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
    { field: "case_number", headerName: "Case Number", width: 160 },
    { field: "designation", headerName: "Designation", flex: 1, minWidth: 180 },
    { field: "department",  headerName: "Department",  flex: 1, minWidth: 180 },
    {
      field: "file",
      headerName: "File",
      width: 110,
      sortable: false,
      renderCell: (p) =>
        p.value ? (
          <a
            href={p.value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-sm underline"
          >
            <FileText size={14} /> View
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">No file</span>
        ),
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
        <InlineLoader text="Loading syllabus records..." variant="ring" size="lg" />
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
                <h1 className="text-2xl font-bold text-slate-900">Syllabus Management</h1>
                <p className="text-sm text-slate-500">Manage syllabus documents linked to case numbers</p>
              </div>
            </div>
          </div>
          {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Syllabus
          </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Syllabus</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5">
              <p className="text-sm text-emerald-700 font-medium">Departments Covered</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-1">{departmentsCovered}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-5">
              <p className="text-sm text-violet-700 font-medium">Added in Last 30 Days</p>
              <h2 className="text-3xl font-bold text-violet-900 mt-1">{recentCount}</h2>
            </CardContent>
          </Card>
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Syllabus Records"
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
            {editingRow ? "Edit Syllabus" : "Add Syllabus"}
          </DialogTitle>
          <DialogContent>

            {/* Case Number */}
            <div className="mt-2">
              <SearchableSelect
                label="Case Number"
                required
                value={formData.job_hash_id}
                onChange={handleCaseNumberChange}
                options={caseSelectOptions}
                placeholder={caseOptionsLoading ? "Loading case numbers…" : "— Select Case Number —"}
                disabled={caseOptionsLoading}
                error={formErrors.case_number}
                hint="Designation and Department auto-fill from the selected case"
              />
            </div>

            {/* Designation (auto-filled) */}
            <TextField
              fullWidth
              label="Designation"
              margin="normal"
              size="small"
              value={formData.designation}
              disabled
              placeholder="Auto-filled from case number"
            />

            {/* Department (auto-filled) */}
            <TextField
              fullWidth
              label="Department"
              margin="normal"
              size="small"
              value={formData.department}
              disabled
              placeholder="Auto-filled from case number"
            />

            {/* Syllabus File Upload */}
            <div className="mt-3 mb-1">
              <p className="text-xs text-slate-500 mb-1">
                Syllabus File (PDF) {!editingRow && <span className="text-red-500">*</span>}
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
                  formErrors.file
                    ? "border-red-400 bg-red-50"
                    : dragActive
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
                }`}
              >
                {formData.file ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-slate-700">
                      <FileText size={24} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium truncate max-w-[220px]">{formData.file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute top-1 right-1 p-0.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                    >
                      <X size={14} />
                    </button>
                    <p className="text-xs text-slate-400 mt-2">Click to replace file</p>
                  </>
                ) : formData.existingFileUrl ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-slate-700">
                      <FileText size={24} className="text-emerald-600 flex-shrink-0" />
                      <a
                        href={formData.existingFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-medium text-emerald-700 underline"
                      >
                        View current file
                      </a>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Click to replace file</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 py-2">
                    <Upload size={24} />
                    <span className="text-sm font-medium text-slate-500">Click or drag &amp; drop to upload</span>
                    <span className="text-xs">PDF only — max 10 MB</span>
                  </div>
                )}
              </div>
              {formErrors.file && (
                <p className="text-xs text-red-500 mt-1 ml-1">{formErrors.file}</p>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf,.pdf"
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

      </div>
    </div>
  );
};

export default SyllabusManagement;
