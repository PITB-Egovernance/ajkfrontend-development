import React, { useState, useEffect } from "react";
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { IconButton, Menu, MenuItem, Switch } from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import Button from "components/ui/Button";
import { Plus, ArrowLeft, MoreVertical, ShieldCheck, Eye, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import RolesApi from "api/rolesApi";
import { countPermissions } from "config/permissionModules";
import { GRID_SX } from 'utils/gridStyles';

const RolesManagement = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ name: "", status: "" });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const filterConfig = [
    { name: "name", label: "Role Name", type: "text", placeholder: "Filter by role name" },
    { name: "status", label: "Status", type: "select", options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ]},
  ];

  const fetchRoles = async (page = 0, pageSize = 15) => {
    setLoading(true);
    try {
      const params = { page: page + 1, per_page: pageSize };
      const search = (filters.name || searchTerm).trim();
      if (search) params.search = search;
      if (filters.status) params.status = filters.status;
      const result = await RolesApi.getAll(params);
      const payload = result.data ?? {};
      const data = payload.data ?? result.data ?? [];
      const formatted = (Array.isArray(data) ? data : []).map((item) => {
        const isSuperAdmin = item.is_super_admin || item.is_default;
        const permsObj = typeof item.permissions === 'object' && !Array.isArray(item.permissions)
          ? item.permissions : {};
        return {
          id: item.hash_id,
          hash_id: item.hash_id,
          name: item.role_name ?? item.name,
          totalPermissions: isSuperAdmin
            ? 'All Permissions'
            : (item.total_permissions ?? countPermissions(permsObj)),
          employeesCount: item.employees_count ?? 0,
          status: item.status ?? "active",
          isSuperAdmin,
        };
      });
      setRows(formatted);
      setTotal(payload.total ?? formatted.length);
    } catch (error) {
      toast.error(error.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchRoles(paginationModel.page, paginationModel.pageSize), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [paginationModel.page, paginationModel.pageSize, filters.name, filters.status, searchTerm]);

  const filteredRows = rows.filter((row) => {
    if (searchTerm.trim() && !row.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filters.name && !row.name?.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.status && row.status !== filters.status) return false;
    return true;
  });

  const handleDelete = async () => {
    if (!selectedRow) return;
    setAnchorEl(null);
    if (selectedRow.isSuperAdmin) {
      toast.error("Root / Super Admin role cannot be deleted");
      return;
    }
    if (selectedRow.employeesCount > 0) {
      toast.error("This role cannot be deleted because employees are assigned to it");
      return;
    }
    if (!await confirmDelete({ title: "Delete Role", message: `Are you sure you want to delete "${selectedRow.name}"?` })) return;
    try {
      await RolesApi.remove(selectedRow.hash_id);
      toast.success("Role deleted successfully");
      fetchRoles(paginationModel.page, paginationModel.pageSize);
    } catch (error) {
      toast.error(error.message || "Delete failed");
    }
  };

  const handleToggleStatus = async (row) => {
    if (row.isSuperAdmin) {
      toast.error("Root / Super Admin role cannot be inactive");
      return;
    }
    const newStatus = row.status === "active" ? "inactive" : "active";
    if (newStatus === "inactive" && row.employeesCount > 0) {
      toast.error("This role cannot be inactive because employees are assigned to it");
      return;
    }
    if (!await confirmStatus({ newStatus })) return;
    try {
      await RolesApi.updateStatus(row.hash_id, newStatus);
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: newStatus } : r));
      toast.success(`Role marked as ${newStatus}`);
    } catch (error) {
      toast.error(error.message || "Status update failed");
    }
  };

  const activeCount = rows.filter((r) => r.status === "active").length;
  const inactiveCount = rows.filter((r) => r.status !== "active").length;

  const columns = [
    {
      field: "sr_no", headerName: "Sr No", width: 80,
      renderCell: (params) => filteredRows.findIndex((r) => r.id === params.row.id) + 1,
      sortable: false,
    },
    {
      field: "name", headerName: "Role Name", flex: 1, minWidth: 180,
      renderCell: (params) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{params.value}</span>
          {params.row.isSuperAdmin && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">SUPER ADMIN</span>
          )}
        </div>
      ),
    },
    {
      field: "totalPermissions", headerName: "Total Permissions", width: 160,
      renderCell: (params) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
          params.value === 'All Permissions' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {params.value}
        </span>
      ),
    },
    { field: "employeesCount", headerName: "No. of Employees", width: 150 },
    {
      field: "status", headerName: "Status", width: 130,
      renderCell: (params) => (
        <div className="flex items-center h-full gap-2">
          <Switch
            checked={params.value === "active"}
            onChange={() => handleToggleStatus(params.row)}
            disabled={params.row.isSuperAdmin}
            size="small"
            color={params.value === "active" ? "success" : "error"}
          />
        </div>
      ),
    },
    {
      field: "actions", headerName: "Actions", width: 80, sortable: false, filterable: false,
      renderCell: (params) => (
        <IconButton onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setSelectedRow(params.row); }}>
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
      <div className="mx-auto space-y-6" style={{ minWidth: "-webkit-fill-available" }}>

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <button onClick={() => navigate("/dashboard/settings")} className="text-sm text-gray-600 flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Roles &amp; Permissions</h1>
                <p className="text-sm text-slate-500">Manage roles and module-wise access</p>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate("/dashboard/settings/roles/create")}>
            <Plus className="w-4 h-4 mr-2" /> Add New Role
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <AdvancedFilter
          filters={filters}
          onFilterChange={(e) => setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
          onClearFilters={() => setFilters({ name: "", status: "" })}
          filterConfig={filterConfig}
          title="Filter Roles"
        />

        <div className="bg-white rounded-lg shadow-sm p-4">
          <TooltipDataGrid
            rows={filteredRows}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[15, 25, 50]}
            paginationMode="server"
            rowCount={total}
            loading={loading}
            autoHeight
            disableRowSelectionOnClick
            sx={GRID_SX}
            onRowClick={(params) => navigate(`/dashboard/settings/roles/${params.row.hash_id}`)}
          />
        </div>

        {/* ACTION MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
          PaperProps={{ elevation: 0, sx: { filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))', mt: 1.5, minWidth: 180, '& .MuiMenuItem-root': { fontSize: '14px', display: 'flex', gap: '8px', padding: '10px 16px' } } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          <MenuItem onClick={() => { navigate(`/dashboard/settings/roles/${selectedRow?.hash_id}`); setAnchorEl(null); }}>
            <Eye size={14} /> View
          </MenuItem>
          {!selectedRow?.isSuperAdmin && (
            <MenuItem onClick={() => { navigate(`/dashboard/settings/roles/${selectedRow?.hash_id}/edit`); setAnchorEl(null); }}>
              <Pencil size={14} /> Edit
            </MenuItem>
          )}
          {!selectedRow?.isSuperAdmin && (
            <MenuItem onClick={handleDelete} sx={{ '&.MuiMenuItem-root': { color: '#dc2626' } }}>
              <Trash2 size={14} /> Delete
            </MenuItem>
          )}
        </Menu>
      </div>
    </div>
  );
};

export default RolesManagement;
