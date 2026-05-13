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
import {
  Plus,
  ArrowLeft,
  MoreVertical,
  Filter,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { PageLoader, InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";

const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
  "& .MuiDataGrid-row": { minHeight: "52px !important" },
  "& .MuiDataGrid-checkboxInput svg":             { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput:hover svg":        { color: "#065f46" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":  { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":          { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root": { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":       { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover": { backgroundColor: "#d1fae5" },
};

const DistrictsManagement = () => {
  const navigate = useNavigate();

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    name: '',
    code: '',
    status: ''
  });

  const filterConfig = [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Filter by name'
    },
    {
      name: 'code',
      label: 'Code',
      type: 'text',
      placeholder: 'Filter by code'
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      name: '',
      code: '',
      status: ''
    });
  };

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 15,
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openModal, setOpenModal] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
  });

  /* ===============================
     FETCH DISTRICTS (SERVER PAGINATION)
  =============================== */
  const fetchDistricts = async (page = 0, pageSize = 15) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/settings/districts?page=${page + 1}&per_page=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
            "X-API-KEY": API_KEY,
          },
        }
      );

      const result = await response.json();

      if (result.status === 200) {
        const data = result.data.data || [];

        const formatted = data.map((item) => ({
          id: item.hash_id,
          hash_id: item.hash_id,
          name: item.name,
          code: item.code,
          created_at: item.created_at,
          status: item.status ?? "active",
        }));

        setRows(formatted);
        setTotal(result.data.total);
      } else {
        toast.error("Failed to load districts");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts(paginationModel.page, paginationModel.pageSize);
    // eslint-disable-next-line
  }, [paginationModel.page, paginationModel.pageSize]);

  /* ===============================
     ACTION MENU
  =============================== */
  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleEdit = () => {
    setEditingDistrict(selectedRow);
    setFormData({
      name: selectedRow.name,
      code: String(selectedRow.code),
    });
    setOpenModal(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();

    if (!await confirmDelete({ title: 'Delete District', message: 'Are you sure you want to delete this district?' })) return;

    try {
      const response = await fetch(
        `${API_BASE}/settings/districts/${selectedRow.hash_id}/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "X-API-KEY": API_KEY,
          },
        }
      );

      const result = await response.json();

      if (result.status === 200) {
        toast.success("Deleted successfully");
        fetchDistricts(paginationModel.page, paginationModel.pageSize);
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ===============================
     ADD / UPDATE
  =============================== */
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("District name required");
      return;
    }

    if (!String(formData.code).trim()) {
      toast.error("District code required");
      return;
    }

    setLoading(true);

    try {
      const isUpdate = !!editingDistrict;

      const url = isUpdate
        ? `${API_BASE}/settings/districts/${editingDistrict.hash_id}/update`
        : `${API_BASE}/settings/districts/create`;

      const response = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY,
        },
        body: JSON.stringify({
          name: formData.name,
          code: String(formData.code),
          status: "active",
        }),
      });

      const result = await response.json();

      if (!isUpdate && result.status === 201) {
        toast.success("Created successfully");
      }

      if (isUpdate && result.status === 200) {
        toast.success("Updated successfully");
      }

      setOpenModal(false);
      fetchDistricts(paginationModel.page, paginationModel.pageSize);
    } catch {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     SEARCH FILTER
  =============================== */
  const filteredRows = rows.filter((row) => {
    // Basic search term filter
    const searchMatch = !searchTerm.trim() || 
      row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(row.code)?.includes(searchTerm);
    
    if (!searchMatch) return false;

    // Advanced filters
    if (filters.name && !row.name?.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    if (filters.code && !String(row.code).toLowerCase().includes(filters.code.toLowerCase())) {
      return false;
    }

    if (filters.status && row.status !== filters.status) {
      return false;
    }
    
    return true;
  });

  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res    = await fetch(`${API_BASE}/settings/districts/${row.hash_id || row.id}/update`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "X-API-KEY": API_KEY },
        body: JSON.stringify({ name: row.name, code: String(row.code || ''), status: newStatus }),
      });
      const result = await res.json();
      if (res.ok || result.status === 200 || result.success) {
        toast.success(`District marked as ${newStatus}`);
        fetchDistricts(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Status update failed");
      }
    } catch {
      toast.error("Status update failed");
    }
  };

  /* ===============================
     DATAGRID COLUMNS
  =============================== */
  const columns = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "code", headerName: "Code", width: 150 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Switch
          checked={params.row.status === "active"}
          onChange={() => handleToggleStatus(params.row, params.row.status)}
          inputProps={{ "aria-label": "toggle district status" }}
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
          onClick={(e) => handleMenuOpen(e, params.row)}
        >
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading && rows.length === 0) {
    return  <InlineLoader text="Loading districts..." variant="ring" size="lg" />;
  }

  const activeCount = rows.filter(
  (row) => (row.status ?? "active").toLowerCase() === "active"
  ).length;

  const inactiveCount = rows.filter(
    (row) => (row.status ?? "active").toLowerCase() === "inactive"
  ).length;

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
          <h1 className="text-2xl font-bold text-slate-900">
            Districts Management
          </h1>
        </div>

        <Button
          onClick={() => {
            setEditingDistrict(null);
            setFormData({ name: "", code: "" });
            setOpenModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add District
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* TOTAL */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <CardContent className="p-6">
            <p className="text-sm text-blue-700 font-medium">
              Total Districts
            </p>
            <h2 className="text-3xl font-bold text-blue-900 mt-2">
              {total}
            </h2>
          </CardContent>
        </Card>

        {/* ACTIVE */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
          <CardContent className="p-6">
            <p className="text-sm text-emerald-700 font-medium">
              Active Districts
            </p>
            <h2 className="text-3xl font-bold text-emerald-900 mt-2">
              {activeCount}
            </h2>
          </CardContent>
        </Card>

        {/* INACTIVE */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
          <CardContent className="p-6">
            <p className="text-sm text-red-700 font-medium">
              Inactive Districts
            </p>
            <h2 className="text-3xl font-bold text-red-900 mt-2">
              {inactiveCount}
            </h2>
          </CardContent>
        </Card>

      </div>


      {/* ADVANCED FILTERS */}
      <AdvancedFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterConfig={filterConfig}
        title="Filter Districts"
      />

      {/* DATAGRID */}
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
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "red" }}>
          Delete
        </MenuItem>
      </Menu>

      {/* MODAL */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <DialogTitle>
          {editingDistrict ? "Edit District" : "Add District"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="District Name"
            margin="normal"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
          <TextField
            fullWidth
            label="District Code"
            margin="normal"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {editingDistrict ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  </div>
);
};

export default DistrictsManagement;