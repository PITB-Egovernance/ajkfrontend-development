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
import { Plus, ArrowLeft, MoreVertical, BadgeCheck, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import CertificationApi from "api/certificationApi";
import { hasPermission } from "utils/permissions";

const PERM = "settings.certificates";

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

const EMPTY_FORM = { certification_name: "", status: "active" };

const CertificatesManagement = () => {
  const navigate = useNavigate();
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [allRows,    setAllRows]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [filters,    setFilters]    = useState({ certification_name: "", status: "" });

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
      const result = await CertificationApi.getAll();
      const data = result.data?.data ?? result.data ?? [];
      setAllRows(
        (Array.isArray(data) ? data : []).map((item, i) => ({
          id:                   item.hash_id || item.id,
          hash_id:              item.hash_id || item.id,
          sr_no:                i + 1,
          certification_name:   item.certification_name,
          status:               item.status ?? "active",
        }))
      );
    } catch {
      toast.error("Failed to load certifications");
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  /* ── FILTER CONFIG ── */
  const filterConfig = [
    { name: "certification_name", label: "Certification Name", type: "text",   placeholder: "Filter by name" },
    { name: "status",             label: "Status",             type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters({ certification_name: "", status: "" });

  /* ── CLIENT-SIDE FILTER ── */
  const filteredRows = allRows.filter((row) => {
    if (filters.certification_name && !row.certification_name?.toLowerCase().includes(filters.certification_name.toLowerCase())) return false;
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
      certification_name: selectedRow.certification_name,
      status:             selectedRow.status ?? "active",
    });
    setFormErrors({});
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── VALIDATION ── */
  const validate = () => {
    const errs = {};
    if (!formData.certification_name.trim()) errs.certification_name = "Certification name is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── SINGLE DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();
    if (!await confirmDelete({ title: "Delete Certification", identifier: selectedRow.certification_name })) return;
    try {
      await CertificationApi.delete(selectedRow.hash_id);
      toast.success("Certification deleted successfully");
      setSelectionModel((p) => p.filter((id) => id !== selectedRow.id));
      fetchAll();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── BULK ACTIONS ── */
  const handleBulkDelete = async () => {
    if (!selectionModel.length) return;
    if (!await confirmDelete({ title: "Delete Certifications", message: `Delete ${selectionModel.length} certification${selectionModel.length > 1 ? "s" : ""}?` })) return;
    try {
      const rows = allRows.filter((r) => selectionModel.includes(r.id));
      await Promise.all(rows.map((r) => CertificationApi.delete(r.hash_id)));
      toast.success("Deleted selected certifications");
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
          CertificationApi.update(r.hash_id, {
            certification_name: r.certification_name,
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
      await CertificationApi.update(row.hash_id, {
        certification_name: row.certification_name,
        status: newStatus,
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
      const payload = { certification_name: formData.certification_name.trim(), status: formData.status };
      if (editingRow) {
        await CertificationApi.update(editingRow.hash_id, payload);
        toast.success("Certification updated successfully");
      } else {
        await CertificationApi.create(payload);
        toast.success("Certification added successfully");
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
    { field: "sr_no",               headerName: "#",                   width: 65 },
    { field: "certification_name",  headerName: "Certification Name",  flex: 1   },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row)}
          inputProps={{ "aria-label": "toggle certification status" }}
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
        <InlineLoader text="Loading certifications..." variant="ring" size="lg" />
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
                <BadgeCheck size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Certifications</h1>
                <p className="text-sm text-slate-500">Manage certification entries</p>
              </div>
            </div>
          </div>
          {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Certification
          </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700 font-medium">Total Certifications</p>
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
          title="Filter Certifications"
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
          {canEdit && <MenuItem onClick={handleEdit}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>}
        </Menu>

        {/* ADD / EDIT MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
          <DialogTitle className="font-bold">
            {editingRow ? "Edit Certification" : "Add Certification"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Certification Name"
              margin="normal"
              size="small"
              autoFocus
              value={formData.certification_name}
              onChange={(e) => {
                setFormData((f) => ({ ...f, certification_name: e.target.value }));
                if (e.target.value.trim()) setFormErrors((errs) => ({ ...errs, certification_name: undefined }));
              }}
              error={!!formErrors.certification_name}
              helperText={formErrors.certification_name}
              placeholder="e.g. AWS Certified Developer"
            />

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

export default CertificatesManagement;
