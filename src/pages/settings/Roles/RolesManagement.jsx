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
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import Button from "components/ui/Button";
import { Plus, ArrowLeft, MoreVertical, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { getPermissionModules } from "config/sidebarMenu";

const PERMISSIONS = getPermissionModules();

const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
  "& .MuiDataGrid-row": { minHeight: "60px !important" },
  "& .MuiDataGrid-checkboxInput svg":                  { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput:hover svg":            { color: "#065f46" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":      { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":              { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root":  { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":                   { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover":             { backgroundColor: "#d1fae5" },
};

const parsePermissions = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return value.split(",").map((s) => s.trim()).filter(Boolean); }
  }
  return [];
};

const RolesManagement = () => {
  const navigate = useNavigate();

  const API_BASE = Config.apiUrl;
  const TOKEN    = AuthService.getToken();
  const API_KEY  = Config.apiKey;

  const headers = (json = true) => ({
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
    "X-API-KEY": API_KEY,
    ...(json ? { "Content-Type": "application/json" } : {}),
  });

  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters]       = useState({ name: "", status: "" });

  const filterConfig = [
    { name: "name",   label: "Role Name", type: "text",   placeholder: "Filter by role name" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active",   label: "Active"   },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [anchorEl, setAnchorEl]       = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openModal, setOpenModal]   = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData]     = useState({ name: "", permissions: [], status: "active" });
  const [formErrors, setFormErrors] = useState({});

  /* ───────────── FETCH ───────────── */
  const fetchRoles = async (page = 0, pageSize = 15) => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/roles?page=${page + 1}&per_page=${pageSize}`, { headers: headers(false) });
      const result = await res.json();

      if (res.ok || result.status === 200 || result.success) {
        const payload = result.data ?? {};
        const data    = payload.data ?? result.data ?? [];
        const tot     = payload.total ?? data.length ?? 0;

        const formatted = data.map((item) => ({
          id:          item.hash_id,
          hash_id:     item.hash_id,
          name:        item.role_name ?? item.name,
          permissions: parsePermissions(item.permissions),
          status:      item.status ?? "active",
        }));

        setRows(formatted);
        setTotal(tot);
      } else {
        toast.error(result.message || "Failed to load roles");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles(paginationModel.page, paginationModel.pageSize);
    // eslint-disable-next-line
  }, [paginationModel.page, paginationModel.pageSize]);

  /* ───────────── FILTER ───────────── */
  const filteredRows = rows.filter((row) => {
    if (searchTerm.trim()) {
      if (!row.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    if (filters.name   && !row.name?.toLowerCase().includes(filters.name.toLowerCase()))   return false;
    if (filters.status && row.status !== filters.status)                                   return false;
    return true;
  });

  /* ───────────── SUBMIT ───────────── */
  const handleSubmit = async () => {
    const errs = {};
    if (!formData.name.trim())          errs.name        = "Role name is required";
    if (!formData.permissions.length)   errs.permissions = "At least one permission is required";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setLoading(true);
    try {
      const isUpdate = !!editingRole;
      const url = isUpdate
        ? `${API_BASE}/settings/roles/update/${editingRole.hash_id}`
        : `${API_BASE}/settings/roles/store`;

      const body = isUpdate
        ? { role_name: formData.name, permissions: formData.permissions, status: formData.status }
        : { role_name: formData.name, permissions: formData.permissions };

      const res    = await fetch(url, { method: isUpdate ? "PUT" : "POST", headers: headers(), body: JSON.stringify(body) });
      const result = await res.json();

      if (res.ok || result.status === 200 || result.status === 201 || result.success) {
        toast.success(isUpdate ? "Updated successfully" : "Created successfully");
        setOpenModal(false);
        setEditingRole(null);
        fetchRoles(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || (isUpdate ? "Update failed" : "Create failed"));
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ───────────── DELETE ───────────── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    setAnchorEl(null);
    if (!await confirmDelete({ title: "Delete Role", message: "Are you sure you want to delete this role?" })) return;

    try {
      const res    = await fetch(`${API_BASE}/settings/roles/${selectedRow.hash_id}/delete`, { method: "DELETE", headers: headers(false) });
      const result = await res.json();

      if (res.ok || result.status === 200 || result.success) {
        toast.success("Deleted successfully");
        fetchRoles(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ───────────── STATUS TOGGLE ───────────── */
  const handleToggleStatus = async (row, current) => {
    const newStatus = current === "active" ? "inactive" : "active";
    try {
      const body = { role_name: row.name, permissions: row.permissions, status: newStatus };
      const res    = await fetch(`${API_BASE}/settings/roles/update/${row.hash_id}`, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
      const result = await res.json();

      if (res.ok || result.status === 200 || result.success) {
        toast.success(`Marked as ${newStatus}`);
        fetchRoles(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Status update failed");
      }
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ───────────── STATS ───────────── */
  const activeCount   = rows.filter((r) => (r.status ?? "active") === "active").length;
  const inactiveCount = rows.filter((r) => (r.status ?? "active") === "inactive").length;

  /* ───────────── COLUMNS ───────────── */
  const columns = [
    { field: "name", headerName: "Role Name", flex: 1, minWidth: 160 },
    {
      field: "permissions",
      headerName: "Permissions",
      flex: 2,
      minWidth: 260,
      renderCell: (params) => {
        const perms = Array.isArray(params.value) ? params.value : [];
        if (perms.length === 0) return <span className="text-slate-400 text-xs">No permissions</span>;
        return (
          <div className="flex flex-wrap items-center gap-1 py-2">
            {perms.map((key) => {
              const label = PERMISSIONS.find((p) => p.key === key)?.label ?? key;
              return (
                <span key={key} className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {label}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Switch
          checked={params.row.status === "active"}
          onChange={() => handleToggleStatus(params.row, params.row.status)}
          size="small"
          color={params.row.status === "active" ? "success" : "error"}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => {
            setAnchorEl(e.currentTarget);
            setSelectedRow(params.row);
          }}
        >
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading && rows.length === 0) {
    return <InlineLoader text="Loading roles..." variant="ring" size="lg" />;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="text-sm text-gray-600 flex items-center mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Roles &amp; Permissions</h1>
                <p className="text-sm text-slate-500">Manage roles and their module access</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              setEditingRole(null);
              setFormData({ name: "", permissions: [], status: "active" });
              setFormErrors({});
              setOpenModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Role
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">Total Roles</p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">{total}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">Active</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">{activeCount}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">Inactive</p>
              <h2 className="text-3xl font-bold text-red-900 mt-2">{inactiveCount}</h2>
            </CardContent>
          </Card>
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={(e) => {
            const { name, value } = e.target;
            setFilters((prev) => ({ ...prev, [name]: value }));
          }}
          onClearFilters={() => setFilters({ name: "", status: "" })}
          filterConfig={filterConfig}
          title="Filter Roles"
        />

        {/* SEARCH */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by role name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>

        {/* TABLE */}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]}
          paginationMode="server"
          rowCount={total}
          loading={loading}
          autoHeight
          getRowHeight={() => "auto"}
          sx={gridSx}
        />

        {/* ACTION MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setEditingRole(selectedRow);
              setFormData({
                name:        selectedRow.name        || "",
                permissions: selectedRow.permissions || [],
                status:      selectedRow.status      || "active",
              });
              setFormErrors({});
              setOpenModal(true);
              setAnchorEl(null);
            }}
          >
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: "red" }}>
            Delete
          </MenuItem>
        </Menu>

        {/* MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingRole ? "Edit Role" : "Add Role"}
          </DialogTitle>

          <DialogContent>
            {/* Role Name */}
            <TextField
              fullWidth
              label="Role Name"
              margin="normal"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (e.target.value.trim()) setFormErrors((prev) => ({ ...prev, name: undefined }));
              }}
              error={!!formErrors.name}
              helperText={formErrors.name}
            />

            {/* Permissions — multi-select from sidebar modules */}
            <FormControl fullWidth margin="normal" error={!!formErrors.permissions}>
              <InputLabel id="permissions-label" shrink>Permissions</InputLabel>
              <Select
                labelId="permissions-label"
                multiple
                value={formData.permissions}
                onChange={(e) => {
                  setFormData({ ...formData, permissions: e.target.value });
                  if (e.target.value.length) setFormErrors((prev) => ({ ...prev, permissions: undefined }));
                }}
                input={<OutlinedInput notched label="Permissions" />}
                renderValue={(selected) =>
                  selected
                    .map((key) => PERMISSIONS.find((p) => p.key === key)?.label ?? key)
                    .join(", ")
                }
                MenuProps={{ PaperProps: { style: { maxHeight: 380 } } }}
              >
                {PERMISSIONS.map((p) => (
                  <MenuItem key={p.key} value={p.key} dense>
                    <Checkbox
                      checked={formData.permissions.includes(p.key)}
                      size="small"
                      sx={{ color: "#064e3b", "&.Mui-checked": { color: "#064e3b" } }}
                    />
                    <ListItemText primary={p.label} />
                  </MenuItem>
                ))}
              </Select>
              {formErrors.permissions && (
                <p className="text-xs text-red-500 mt-1 mx-3">{formErrors.permissions}</p>
              )}
            </FormControl>

            {/* Status — only on edit */}
            {editingRole && (
              <TextField
                select
                fullWidth
                label="Status"
                margin="normal"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </TextField>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingRole ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

      </div>
    </div>
  );
};

export default RolesManagement;
