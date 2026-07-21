import React, { useState, useEffect } from "react";
import TooltipDataGrid from "components/ui/TooltipDataGrid";
import {
  TextField, IconButton, Menu, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import { Plus, ArrowLeft, MoreVertical, Boxes } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import { GRID_SX } from "utils/gridStyles";
import { hasPermission } from "utils/permissions";
import Config from "config/baseUrl";
import AuthService from "services/authService";
import AdvancedFilter from "components/tables/AdvancedFilter";

const PERM = "settings.groups";

const API_BASE = Config.apiUrl;
const API_KEY  = Config.apiKey;

const authHeaders = (json = false) => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "X-API-KEY": API_KEY,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

const emptyForm = { group_name: "", status: "active" };

const GroupsManagement = () => {
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
  const [form,    setForm]    = useState(emptyForm);
  const [filters, setFilters] = useState({ group_name: "", status: "" });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: "group_name", label: "Group Name", type: "text", placeholder: "Filter by group name" },
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
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ group_name: "", status: "" });
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  /* ── FETCH ── */
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/group`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setRows(
          (Array.isArray(data) ? data : []).map((item, i) => ({
            id:         item.hash_id ?? item.id,
            hash_id:    item.hash_id ?? item.id,
            sr_no:      i + 1,
            group_name: item.group_name ?? item.name ?? "-",
            status:     item.status ?? "active",
          }))
        );
      } else {
        toast.error(result.message || "Failed to load groups");
        setRows([]);
      }
    } catch {
      toast.error("Failed to load groups");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []); // eslint-disable-line

  const activeCount   = rows.filter((r) => r.status === "active").length;
  const inactiveCount = rows.filter((r) => r.status === "inactive").length;

  const filtered = rows.filter((r) => {
    if (filters.group_name.trim() && !r.group_name?.toLowerCase().includes(filters.group_name.trim().toLowerCase())) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  /* ── MENU ── */
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = () => {
    setEditing(selectedRow);
    setForm({ group_name: selectedRow.group_name, status: selectedRow.status ?? "active" });
    setOpen(true);
    handleMenuClose();
  };

  /* ── CREATE / UPDATE ── */
  const handleSubmit = async () => {
    if (!form.group_name.trim()) { toast.error("Group name is required"); return; }

    setSaving(true);
    try {
      const isUpdate = !!editing;
      const url  = isUpdate
        ? `${API_BASE}/settings/group/update/${editing.hash_id}`
        : `${API_BASE}/settings/group/store`;
      const body = isUpdate
        ? { group_name: form.group_name.trim(), status: form.status }
        : { group_name: form.group_name.trim() };

      const res    = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? "Group updated successfully" : "Group created successfully");
        setOpen(false);
        setEditing(null);
        fetchGroups();
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
    if (!await confirmDelete({ title: "Delete Group", identifier: selectedRow.group_name })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/group/delete/${selectedRow.hash_id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success("Group deleted successfully");
        fetchGroups();
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
      const res    = await fetch(`${API_BASE}/settings/group/update/${row.hash_id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success(`Marked as ${newStatus}`);
        fetchGroups();
      } else {
        toast.error(result.message || "Status update failed");
      }
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no",      headerName: "#",          width: 80 },
    { field: "group_name", headerName: "Group Name", flex: 1, minWidth: 200 },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row)}
          inputProps={{ "aria-label": "toggle group status" }}
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

  if (loading && rows.length === 0) return <InlineLoader text="Loading groups..." variant="ring" size="lg" />;

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
                <Boxes size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
                <p className="text-sm text-slate-500">Manage groups</p>
              </div>
            </div>
          </div>
          {canAdd && (
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Group
          </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total Groups</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{rows.length}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5"><p className="text-sm text-emerald-700 font-medium">Active</p><h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-5"><p className="text-sm text-red-700 font-medium">Inactive</p><h2 className="text-3xl font-bold text-red-900 mt-1">{inactiveCount}</h2></CardContent>
          </Card>
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Groups"
        />

        {/* GRID */}
        <TooltipDataGrid
          rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={GRID_SX}
          loading={loading}
        />

        {/* ROW CONTEXT MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={openEdit}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>}
        </Menu>

        {/* MODAL */}
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold flex items-center gap-2">
            <Boxes size={18} className="text-emerald-700" />
            {editing ? "Edit Group" : "Add Group"}
          </DialogTitle>

          <DialogContent>

            {/* Group Name */}
            <TextField fullWidth autoFocus label="Group Name" margin="normal" size="small"
              value={form.group_name} onChange={(e) => setForm((f) => ({ ...f, group_name: e.target.value }))}
              placeholder="e.g. Computer Science" />
          </DialogContent>

          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Update Group" : "Create Group"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default GroupsManagement;
