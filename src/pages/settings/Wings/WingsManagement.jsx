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
import Button from "components/ui/Button";
import { Plus, ArrowLeft, MoreVertical, LayoutList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";

const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
  "& .MuiDataGrid-row": { minHeight: "52px !important" },
  "& .MuiDataGrid-checkboxInput svg":                   { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput:hover svg":             { color: "#065f46" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":       { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":               { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root":   { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":                    { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover":              { backgroundColor: "#d1fae5" },
};

const WingsManagement = () => {
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

  const [rows, setRows]                       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [total, setTotal]                     = useState(0);
  const [secretaryId, setSecretaryId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ name: "", code: "", status: "" });

  const filterConfig = [
    { name: "name",   label: "Name",   type: "text",   placeholder: "Filter by name" },
    { name: "code",   label: "Code",   type: "text",   placeholder: "Filter by code" },
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

  const [anchorEl, setAnchorEl]     = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openModal, setOpenModal]         = useState(false);
  const [editingWing, setEditingWing]     = useState(null);
  const [formData, setFormData] = useState({ name: "", status: "active" });

  /* ───────────────────────── FETCH ───────────────────────── */
  const fetchWings = async (page = 0, pageSize = 15) => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/wings?page=${page + 1}&per_page=${pageSize}`, { headers: headers(false) });
      const result = await res.json();

      if (res.ok || result.status === 200 || result.success) {
        const payload = result.data ?? {};
        const data    = payload.data ?? result.data ?? [];
        const total   = payload.total ?? data.length ?? 0;

        const formatted = data.map((item) => ({
          id:          item.hash_id,
          hash_id:     item.hash_id,
          raw_id:      item.id,
          name:        item.name,
          code:        item.code ?? "-",
          parent_id:   item.parent_id ?? "",
          parent_name: item.parent?.name ?? item.parent_name ?? "-",
          status:      item.status ?? "active",
        }));

        setRows(formatted);
        setTotal(total);
      } else {
        toast.error(result.message || "Failed to load wings");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSecretaryId = async () => {
    try {
      const res    = await fetch(`${API_BASE}/settings/designations?per_page=100`, { headers: headers(false) });
      const result = await res.json();
      console.log("Secretary fetch result:", result);
      const raw    = result.data?.data ?? result.data ?? result ?? [];
      const data   = Array.isArray(raw) ? raw : [];
      const secretary = data.find((d) => d.name?.toLowerCase().includes('secretary'));
      if (secretary) {
        const id = secretary.id !== undefined && secretary.id !== null
          ? Number(secretary.id)
          : secretary.hash_id;
        setSecretaryId(id);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchSecretaryId();
    fetchWings(paginationModel.page, paginationModel.pageSize);
    // eslint-disable-next-line
  }, [paginationModel.page, paginationModel.pageSize]);

  /* ───────────────────────── FILTER ───────────────────────── */
  const filteredRows = rows.filter((row) => {
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      const match = row.name?.toLowerCase().includes(t) || String(row.code)?.includes(t);
      if (!match) return false;
    }
    if (filters.name   && !row.name?.toLowerCase().includes(filters.name.toLowerCase()))       return false;
    if (filters.code   && !String(row.code).toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.status && row.status !== filters.status)                                        return false;
    return true;
  });

  /* ───────────────────────── SUBMIT ───────────────────────── */
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Wing / Section name is required");
      return;
    }

    setLoading(true);
    try {
      const isUpdate = !!editingWing;
      const url = isUpdate
        ? `${API_BASE}/settings/wings/${editingWing.hash_id}/update`
        : `${API_BASE}/settings/wings/create`;

      const body = isUpdate
        ? { name: formData.name, status: formData.status }
        : { name: formData.name, ...(secretaryId != null ? { parent_id: secretaryId } : {}) };

      const res    = await fetch(url, { method: isUpdate ? "PUT" : "POST", headers: headers(), body: JSON.stringify(body) });
      const result = await res.json();

      if (res.ok || result.status === 200 || result.status === 201 || result.success) {
        toast.success(isUpdate ? "Updated successfully" : "Created successfully");
        setOpenModal(false);
        setEditingWing(null);
        fetchWings(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || (isUpdate ? "Update failed" : "Create failed"));
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────────────── DELETE ───────────────────────── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    setAnchorEl(null);
    if (!await confirmDelete({ title: "Delete Wing / Section", message: "Are you sure you want to delete this wing / section?" })) return;

    try {
      const res    = await fetch(`${API_BASE}/settings/wings/${selectedRow.hash_id}/delete`, { method: "DELETE", headers: headers(false) });
      const result = await res.json();

      if (res.ok || result.status === 200 || result.success) {
        toast.success("Deleted successfully");
        fetchWings(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ───────────────────────── STATUS TOGGLE ───────────────────────── */
  const handleToggleStatus = async (row, current) => {
    const newStatus = current === "active" ? "inactive" : "active";
    if (!await confirmStatus({ newStatus })) return;
    try {
      const body = { name: row.name, status: newStatus };
      const res    = await fetch(`${API_BASE}/settings/wings/${row.hash_id}/update`, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
      const result = await res.json();

      if (res.ok || result.status === 200 || result.success) {
        toast.success(`Marked as ${newStatus}`);
        fetchWings(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Status update failed");
      }
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ───────────────────────── STATS ───────────────────────── */
  const activeCount   = rows.filter((r) => (r.status ?? "active") === "active").length;
  const inactiveCount = rows.filter((r) => (r.status ?? "active") === "inactive").length;

  /* ───────────────────────── COLUMNS ───────────────────────── */
  const columns = [
    { field: "name",        headerName: "Name",   flex: 1, minWidth: 180 },
    { field: "parent_name", headerName: "Parent", width: 180 },
    {
      field: "status",
      headerName: "Status",
      width: 120,
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
    return <InlineLoader text="Loading wings..." variant="ring" size="lg" />;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: "-webkit-fill-available" }}>

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
            <h1 className="text-2xl font-bold text-slate-900">Wings / Sections</h1>
          </div>

          <Button
            onClick={() => {
              setEditingWing(null);
              setFormData({ name: "", status: "active" });
              setOpenModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Wing / Section
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">Total Wings / Sections</p>
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
          onClearFilters={() => setFilters({ name: "", code: "", status: "" })}
          filterConfig={filterConfig}
          title="Filter Wings / Sections"
        />

        {/* SEARCH */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or code..."
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
          sx={gridSx}
        />

        {/* ACTION MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setEditingWing(selectedRow);
              setFormData({
                name:   selectedRow.name   || "",
                status: selectedRow.status || "active",
              });
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
            {editingWing ? "Edit Wing / Section" : "Add Wing / Section"}
          </DialogTitle>

          <DialogContent>
            {/* Name */}
            <TextField
              fullWidth
              label="Name"
              margin="normal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            {/* Parent — always Secretary, read-only */}
            <TextField
              fullWidth
              label="Parent"
              margin="normal"
              value="Secretary"
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
            />

            {/* Status — only shown when editing */}
            {editingWing && (
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
              {editingWing ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

      </div>
    </div>
  );
};

export default WingsManagement;
