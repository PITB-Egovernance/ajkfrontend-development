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
import { Plus, ArrowLeft, MoreVertical, FileText, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import SearchableMultiSelect from "components/ui/SearchableMultiSelect";
import { hasPermission } from "utils/permissions";
import WrittenExamSubjectApi from "api/writtenExamSubjectApi";

const PERM = "settings.written_exam_subjects";

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

const EMPTY_FORM = { designation_ids: [], subject_name: "", subject_marks: "", passing_marks_percentage: "", status: "active" };

const getDesignationId = (item) => {
  if (Array.isArray(item?.designations) && item.designations[0])
    return item.designations[0]?.hash_id ?? item.designations[0]?.id ?? "";
  return item?.designation_id ?? item?.designation?.id ?? item?.designation?.hash_id ?? "";
};
const getDesignationIds = (item) => {
  if (Array.isArray(item?.designations) && item.designations.length)
    return item.designations.map((d) => String(d?.hash_id ?? d?.id ?? "")).filter(Boolean);
  const single = getDesignationId(item);
  return single ? [single] : [];
};
const getDesignationNames = (item) => {
  if (Array.isArray(item?.designations) && item.designations.length)
    return item.designations.map((d) => d?.name ?? "").filter(Boolean);
  const single =
    item?.designation?.name ?? item?.designation_name ??
    (typeof item?.designation === "string" ? item.designation : null) ??
    item?.post ?? "";
  return single ? [single] : [];
};
const getSubjectMarks = (item) => item?.subject_marks ?? item?.total_marks ?? item?.marks ?? "";

const WrittenExamSubjectsManagement = () => {
  const navigate = useNavigate();
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [allRows,    setAllRows]    = useState([]);
  const [designations, setDesignations] = useState([]);   // active designation names
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [totalRows,  setTotalRows]  = useState(0);
  const [filters,    setFilters]    = useState({ designation: "", subject_name: "", status: "" });

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [selectionModel,  setSelectionModel]  = useState([]);
  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal,   setOpenModal]   = useState(false);
  const [editingRow,  setEditingRow]  = useState(null);
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});

  /* ── FETCH ── */
  const fetchAll = async (
    page = paginationModel.page,
    pageSize = paginationModel.pageSize
  ) => {
    setLoading(true);
    try {
      const result = await WrittenExamSubjectApi.getAll(page + 1, pageSize);
      const pagination = result.data ?? {};
      const data = pagination.data ?? result.data ?? [];
      setAllRows(
        (Array.isArray(data) ? data : []).map((item, i) => ({
          id:               item.hash_id || item.id,
          hash_id:          item.hash_id || item.id,
          sr_no:            page * pageSize + i + 1,
          designation_id:   getDesignationId(item),
          designation_ids:  getDesignationIds(item),
          designation:      getDesignationNames(item).join(", "),
          designationNames: getDesignationNames(item),
          subject_name:     item.subject_name,
          subject_marks:    getSubjectMarks(item) !== '' && getSubjectMarks(item) !== null ? Number(getSubjectMarks(item)) : '',
          passing_marks_percentage: item.passing_marks_percentage !== null && item.passing_marks_percentage !== undefined && item.passing_marks_percentage !== '' ? Number(item.passing_marks_percentage) : '',
          status:           item.status ?? "active",
        }))
      );
      setTotalRows(Number(pagination.total) || 0);
    } catch {
      toast.error("Failed to load written exam subjects");
      setAllRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  /* ── FETCH ACTIVE DESIGNATIONS ── */
  const fetchDesignations = async () => {
    try {
      const result = await WrittenExamSubjectApi.getDesignations();
      const data = result.data?.data ?? result.data ?? [];
      setDesignations(
        (Array.isArray(data) ? data : [])
          .filter((d) => String(d?.status ?? "active").toLowerCase() === "active")
          .map((d) => ({
            id: String(d.hash_id ?? d.id ?? ""),
            name: d.name ?? d.designation_name ?? d.title ?? "",
          }))
          .filter((d) => d.id && d.name)
      );
    } catch {
      setDesignations([]);
    }
  };

  useEffect(() => {
    fetchAll(paginationModel.page, paginationModel.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize]);

  useEffect(() => { fetchDesignations(); }, []);

  /* ── FILTER CONFIG ── */
  const filterConfig = [
    { name: "designation",  label: "Designation",  type: "select", options: designations.map((d) => ({ value: d.name, label: d.name })) },
    { name: "subject_name", label: "Subject Name", type: "text",   placeholder: "Filter by name" },
    { name: "status",       label: "Status",       type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters({ designation: "", subject_name: "", status: "" });

  /* ── CLIENT-SIDE FILTER ── */
  const filteredRows = allRows.filter((row) => {
    if (filters.designation  && row.designation !== filters.designation) return false;
    if (filters.subject_name && !row.subject_name?.toLowerCase().includes(filters.subject_name.toLowerCase())) return false;
    if (filters.status       && row.status !== filters.status) return false;
    return true;
  });

  const total         = totalRows;
  const activeCount   = allRows.filter((r) => r.status === "active").length;
  const inactiveCount = allRows.filter((r) => r.status === "inactive").length;

  /* ── MENU ── */
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };
  const findDesignationById = (id) => designations.find((d) => String(d.id) === String(id));
  const findDesignationByName = (name) => designations.find((d) => d.name === name);
  const resolveDesignationId = (row) => row.designation_id || findDesignationByName(row.designation)?.id || "";
  // Dropdown options — prepend the edited row's designation if it is no longer active.
  const editingDesignationId = editingRow ? String(resolveDesignationId(editingRow) || "") : "";
  const designationOptions =
    editingDesignationId && !findDesignationById(editingDesignationId)
      ? [{ id: editingDesignationId, name: editingRow.designation }, ...designations]
      : designations;
  const buildPayload = (row) => ({
    designation_ids: [String(resolveDesignationId(row))],
    subject_name: row.subject_name.trim(),
    subject_marks: Number(row.subject_marks),
    passing_marks_percentage: row.passing_marks_percentage ? Number(row.passing_marks_percentage) : null,
    status: row.status,
  });

  const openAdd = () => {
    setEditingRow(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setOpenModal(true);
  };

  const handleEdit = () => {
    setEditingRow(selectedRow);
    setFormData({
      designation_ids: selectedRow.designation_ids?.length
        ? selectedRow.designation_ids
        : (resolveDesignationId(selectedRow) ? [String(resolveDesignationId(selectedRow))] : []),
      subject_name:  selectedRow.subject_name,
      subject_marks: String(selectedRow.subject_marks),
      passing_marks_percentage: String(selectedRow.passing_marks_percentage ?? ""),
      status:        selectedRow.status ?? "active",
    });
    setFormErrors({});
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── VALIDATION ── */
  const validate = () => {
    const errs = {};
    if (!formData.designation_ids.length) errs.designation_ids = "Select at least one designation";
    if (!formData.subject_name.trim()) errs.subject_name = "Subject name is required";
    if (!formData.subject_marks || isNaN(Number(formData.subject_marks)) || Number(formData.subject_marks) <= 0)
      errs.subject_marks = "Marks must be a positive number";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── SINGLE DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();
    if (!await confirmDelete({ title: "Delete Written Exam Subject", identifier: selectedRow.subject_name })) return;
    try {
      await WrittenExamSubjectApi.delete(selectedRow.hash_id);
      toast.success("Written exam subject deleted successfully");
      setSelectionModel((p) => p.filter((id) => id !== selectedRow.id));
      fetchAll();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── BULK ACTIONS ── */
  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: "Delete Written Exam Subjects", message: `Delete ${selectionModel.length} subject${selectionModel.length > 1 ? "s" : ""}?` })) return;
    try {
      const rows = allRows.filter((r) => selectionModel.includes(r.id));
      await Promise.all(rows.map((r) => WrittenExamSubjectApi.delete(r.hash_id)));
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
          WrittenExamSubjectApi.update(r.hash_id, buildPayload({ ...r, status }))
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
      await WrittenExamSubjectApi.update(row.hash_id, buildPayload({ ...row, status: newStatus }));
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
        designation_ids: formData.designation_ids,
        subject_name: formData.subject_name.trim(),
        subject_marks: Number(formData.subject_marks),
        passing_marks_percentage: formData.passing_marks_percentage ? Number(formData.passing_marks_percentage) : null,
        status: formData.status,
      };
      if (editingRow) {
        await WrittenExamSubjectApi.update(editingRow.hash_id, payload);
        toast.success("Written exam subject updated successfully");
      } else {
        await WrittenExamSubjectApi.create(payload);
        toast.success(
          formData.designation_ids.length > 1
            ? `Subject added for ${formData.designation_ids.length} designations`
            : "Written exam subject added successfully"
        );
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
    { field: "sr_no",        headerName: "#",            width: 65 },
    { field: "subject_name", headerName: "Subject Name", flex: 1   },
    {
      field: "designation",
      headerName: "Designation",
      flex: 2,
      renderCell: (p) => (
        <div className="flex flex-wrap gap-1 items-center py-1">
          {(p.row.designationNames ?? [p.value].filter(Boolean)).map((name) => (
            <span key={name} className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
              {name}
            </span>
          ))}
        </div>
      ),
    },
    { field: "subject_marks", headerName: "Marks", width: 100 },
    { field: "passing_marks_percentage", headerName: "Passing %", width: 110, renderCell: (p) => p.value !== "" && p.value !== null && p.value !== undefined ? `${p.value}%` : "—" },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row)}
          inputProps={{ "aria-label": "toggle written exam subject status" }}
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
        <InlineLoader text="Loading written exam subjects..." variant="ring" size="lg" />
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
                <FileText size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Written Exam Subjects</h1>
                <p className="text-sm text-slate-500">Manage written exam subjects per designation</p>
              </div>
            </div>
          </div>
          {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Subject
          </button>
          )}
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
          title="Filter Written Exam Subjects"
        />

        {/* GRID */}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]}
          paginationMode="server"
          rowCount={totalRows}
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
          {canEdit && <MenuItem onClick={handleEdit}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>}
        </Menu>

        {/* ADD / EDIT MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">
            {editingRow ? "Edit Written Exam Subject" : "Add Written Exam Subject"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Subject Name"
              margin="normal"
              size="small"
              value={formData.subject_name}
              onChange={(e) => {
                setFormData((f) => ({ ...f, subject_name: e.target.value }));
                if (e.target.value.trim()) setFormErrors((errs) => ({ ...errs, subject_name: undefined }));
              }}
              error={!!formErrors.subject_name}
              helperText={formErrors.subject_name}
              placeholder="e.g. General Knowledge"
            />

            <div style={{ marginTop: 16 }}>
              <SearchableMultiSelect
                label="Designations"
                required
                value={formData.designation_ids}
                onChange={(vals) => {
                  setFormData((f) => ({ ...f, designation_ids: vals }));
                  if (vals.length) setFormErrors((errs) => ({ ...errs, designation_ids: undefined }));
                }}
                options={
                  designationOptions.length === 0
                    ? []
                    : designationOptions.map((d) => ({ value: d.id, label: d.name }))
                }
                placeholder="Select designations..."
                error={formErrors.designation_ids}
                hint="Select one or more designations — a record is created for each"
              />
            </div>

            <TextField
              fullWidth
              label="Marks"
              margin="normal"
              size="small"
              type="number"
              inputProps={{ min: 1 }}
              value={formData.subject_marks}
              onChange={(e) => {
                setFormData((f) => ({ ...f, subject_marks: e.target.value }));
                if (e.target.value && Number(e.target.value) > 0) setFormErrors((errs) => ({ ...errs, subject_marks: undefined }));
              }}
              error={!!formErrors.subject_marks}
              helperText={formErrors.subject_marks || "Total marks for this subject"}
              placeholder="e.g. 100"
            />

            <TextField
              fullWidth
              label="Passing Marks Percentage"
              margin="normal"
              size="small"
              type="number"
              inputProps={{ min: 0, max: 100 }}
              value={formData.passing_marks_percentage}
              onChange={(e) => setFormData((f) => ({ ...f, passing_marks_percentage: e.target.value }))}
              helperText="Minimum percentage required to pass (optional)"
              placeholder="e.g. 50"
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

export default WrittenExamSubjectsManagement;
