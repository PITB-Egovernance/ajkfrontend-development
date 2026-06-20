  import React, { useState, useEffect } from "react";
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
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
import { Plus, ArrowLeft, MoreVertical, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { GRID_SX, GRID_INITIAL_STATE, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';

const API_BASE = Config.apiUrl;

const getHeaders = (json = true) => {
  const h = {
    Authorization: `Bearer ${AuthService.getToken()}`,
    Accept: 'application/json',
    'X-API-KEY': Config.apiKey,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const DesignationsManagement = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [grades, setGrades] = useState([]);
  const [wings, setWings] = useState([]);

  const [filters, setFilters] = useState({
    name: '',
    grade_id: '',
    wings: '',
    status: ''
  });

  const filterConfig = [
    {
      name: 'name',
      label: 'Designation Name',
      type: 'text',
      placeholder: 'Filter by designation name'
    },
    {
      name: 'grade_id',
      label: 'Grade',
      type: 'select',
      options: grades.map(g => ({ value: g.id || g.hash_id, label: g.name }))
    },
    {
      name: 'wings',
      label: 'Wing',
      type: 'select',
      options: wings.map(w => ({ value: w.hash_id, label: w.name }))
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
      grade_id: '',
      wings: '',
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
  const [editingDesignation, setEditingDesignation] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    grade_id: "",
    wings: "",
    type: "",
    status: "active",
  });

  /* ===============================
     FETCH DESIGNATIONS
  =============================== */
  const fetchDesignations = async (page = 0, pageSize = 15, wingsList = []) => {
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/settings/designations?page=${page + 1}&per_page=${pageSize}`,
        {
          headers: getHeaders(false),
        }
      );

      const result = await response.json();

      if (result.success === true || result.status === 200) {
        const dataArray = result.data?.data || result.data || [];

          const formatted = dataArray.map((item) => {
          // Try to resolve wing name from the API relation, or fallback to wingsList
          let wingName = item.wing?.name || item.wing_name || "";
          if (!wingName && item.wings && wingsList.length > 0) {
            const matchedWing = wingsList.find(
              (w) => w.hash_id === item.wings || String(w.id) === String(item.wings)
            );
            wingName = matchedWing?.name || "";
          }
          return {
            id: item.hash_id,
            hash_id: item.hash_id,
            name: item.name,
            grade_id: item.grade_id,
            grade_name: item.grade?.name || item.grade_name || "",
            wings: item.wings || "",
            wing_name: wingName,
            type: item.type,
            status: item.status ?? "active",
          };
        });

        setRows(formatted);
        setTotal(result.data?.total || formatted.length);
      } else {
        toast.error(result.message || "Failed to load designations");
      }
    } catch (error) {
      toast.error("Failed to load designations");
    } finally {
      setLoading(false);
    }
  };

 const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/grades`, {
        headers: getHeaders(false),
      });

      const result = await response.json();

      // ✅ Handle all possible API structures safely
      let gradeArray = [];

      if (Array.isArray(result)) {
        gradeArray = result;
      } 
      else if (Array.isArray(result.data)) {
        gradeArray = result.data;
      } 
      else if (Array.isArray(result.data?.data)) {
        gradeArray = result.data.data;
      }

      setGrades(gradeArray);

    } catch (error) {
      setGrades([]); // prevent crash
    }
  };

  const fetchWings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/wings?per_page=200`, {
        headers: getHeaders(false),
      });
      const result = await response.json();
      let wingArray = [];
      if (Array.isArray(result)) {
        wingArray = result;
      } else if (Array.isArray(result.data)) {
        wingArray = result.data;
      } else if (Array.isArray(result.data?.data)) {
        wingArray = result.data.data;
      }
      const formatted = wingArray
        .filter((w) => w.status === 'active' || !w.status)
        .map((w) => ({
          id: w.id,
          hash_id: w.hash_id || String(w.id),
          name: w.name,
        }));
      setWings(formatted);
      return formatted;
    } catch (error) {
      setWings([]);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchGrades();
      const wingsList = await fetchWings();
      await fetchDesignations(paginationModel.page, paginationModel.pageSize, wingsList);
    };
    init();
    // eslint-disable-next-line
  }, [paginationModel.page, paginationModel.pageSize]);

  /* ===============================
     STATUS COUNTS
  =============================== */
  const activeCount = rows.filter(
    (row) => (row.status ?? "active").toLowerCase() === "active"
  ).length;

  const inactiveCount = rows.filter(
    (row) => (row.status ?? "active").toLowerCase() === "inactive"
  ).length;

  /* ===============================
     SEARCH FILTER
  =============================== */
  const filteredRows = rows.filter((row) => {
    // Basic search term filter
    const searchMatch = !searchTerm.trim() || 
      row.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!searchMatch) return false;

    // Advanced filters
    if (filters.name && !row.name?.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    if (filters.grade_id && String(row.grade_id) !== String(filters.grade_id)) {
      return false;
    }

    if (filters.wings && row.wings !== filters.wings) {
      return false;
    }

    if (filters.status && row.status?.toLowerCase() !== filters.status.toLowerCase()) {
      return false;
    }
    
    return true;
  });

  /* ===============================
     ADD / UPDATE
  =============================== */
 const handleSubmit = async () => {
  if (!formData.name.trim()) {
    toast.error("Designation name is required");
    return;
  }

  if (!formData.grade_id) {
    toast.error("Grade is required");
    return;
  }

  if (formData.name.trim().toLowerCase() === "secretary" && formData.wings) {
    toast.error("Secretary designation cannot have a wing assigned");
    return;
  }

  setLoading(true);

  try {
    const isUpdate = !!editingDesignation;

    const url = isUpdate
      ? `${API_BASE}/settings/designations/${editingDesignation.hash_id}/update`
      : `${API_BASE}/settings/designations/create`;

    const response = await fetch(url, {
      method: "POST", // ✅ FORCE POST (Laravel standard)
      headers: getHeaders(),
      body: JSON.stringify({
        name: formData.name,
        grade_id: formData.grade_id,
        wings: formData.name.trim().toLowerCase() === "secretary" ? null : (formData.wings || null),
        type: "Internal",
        status: formData.status,
      }),
    });

    const result = await response.json();

    if (result.success === true || result.status === 200) {
      toast.success(
        isUpdate
          ? "Designation updated successfully"
          : "Designation created successfully"
      );

      setOpenModal(false);
      setEditingDesignation(null);
      fetchDesignations(paginationModel.page, paginationModel.pageSize, wings);
    } else {
      toast.error(result.message || (isUpdate ? "Failed to update designation" : "Failed to create designation"));
    }

  } catch (error) {
    toast.error("Server error while saving designation");
  } finally {
    setLoading(false);
  }
};

  /* ===============================
     DELETE
  =============================== */
  const handleDelete = async () => {
    if (!selectedRow) return;
    if (!await confirmDelete({ title: 'Delete Designation', message: 'Are you sure you want to delete this designation?' })) return;

    try {
      const response = await fetch(
        `${API_BASE}/settings/designations/${selectedRow.hash_id}/delete`,
        {
          method: "DELETE",
          headers: getHeaders(false),
        }
      );

      const result = await response.json();

      if (result.success === true || result.status === 200) {
        toast.success("Designation deleted successfully");
        fetchDesignations(paginationModel.page, paginationModel.pageSize, wings);
      } else {
        toast.error(result.message || "Failed to delete designation");
      }
    } catch (error) {
      toast.error("Server error while deleting designation");
    }
  };

  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res    = await fetch(`${API_BASE}/settings/designations/${row.hash_id || row.id}/update`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: row.name, grade_id: row.grade_id, wings: row.wings || null, type: "Internal", status: newStatus }),
      });
      const result = await res.json();
      if (res.ok || result.status === 200 || result.success) {
        toast.success(`Designation marked as ${newStatus}`);
        fetchDesignations(paginationModel.page, paginationModel.pageSize, wings);
      } else {
        toast.error(result.message || "Failed to update designation status");
      }
    } catch {
      toast.error("Server error while updating designation status");
    }
  };

  /* ===============================
     DATAGRID COLUMNS
  =============================== */
  const columns = [
  { field: "name", headerName: "Designation Name", flex: 1 },

  {
    field: "grade_name",
    headerName: "Grade",
    width: 150,
  },

  {
    field: "wing_name",
    headerName: "Wing",
    width: 180,
    valueGetter: (params) => params.row.wing_name || "—",
  },

  {
    field: "type",
    headerName: "Type",
    width: 150,
  },

  {
    field: "status",
    headerName: "Status",
    width: 130,
    renderCell: (params) => (
      <Switch
        checked={params.value === "active"}
        onChange={() => handleToggleStatus(params.row, params.value)}
        inputProps={{ "aria-label": "toggle designation status" }}
        size="small"
        color={params.value === "active" ? "success" : "error"}
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
    return <InlineLoader text="Loading designations..." variant="ring" />;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="text-sm text-gray-600 flex items-center mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-slate-900">
              Designations Management
            </h1>
          </div>

          <Button
            onClick={() => {
              setEditingDesignation(null);
              setFormData({
                name: "",
                grade_id: "",
                wings: "",
                type: "",
                status: "active",
              });
              setOpenModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Designation
          </Button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">
                Total Designations
              </p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">
                {total}
              </h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">
                Active Designations
              </p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">
                {activeCount}
              </h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">
                Inactive Designations
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
          title="Filter Designations"
        />

        {/* TABLE */}
        <TooltipDataGrid
          rows={filteredRows}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={GRID_PAGE_SIZE_OPTIONS}
          initialState={GRID_INITIAL_STATE}
          paginationMode="server"
          rowCount={total}
          loading={loading}
          autoHeight
          sx={GRID_SX}
        />

        {/* MENU */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem
            onClick={() => {
              setEditingDesignation(selectedRow);

              setFormData({
                name: selectedRow.name || "",
                grade_id: selectedRow.grade_id || selectedRow.grade?.hash_id || "",
                wings: selectedRow.wings || "",
                type: selectedRow.type || "",
                status: selectedRow.status || "active",
              });


              setOpenModal(true);
              setAnchorEl(null);
            }}
          >
            Edit
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleDelete();
              setAnchorEl(null);
            }}
            sx={{ color: "red" }}
          >
            Delete
          </MenuItem>
        </Menu>

        {/* MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingDesignation ? "Edit Designation" : "Add Designation"}
          </DialogTitle>

          <DialogContent>

            {/* Designation Name */}
            <TextField
              fullWidth
              label="Designation Name"
              margin="normal"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                if (newName.trim().toLowerCase() === "secretary") {
                  setFormData({ ...formData, name: newName, wings: "" });
                } else {
                  setFormData({ ...formData, name: newName });
                }
              }}
            />

            {/* Grade Dropdown */}
            <TextField
              select
              fullWidth
              label="Grade"
              margin="normal"
              value={formData.grade_id}
              onChange={(e) =>
                setFormData({ ...formData, grade_id: e.target.value })
              }
            >
              {Array.isArray(grades) &&
                grades.map((grade) => (
                  <MenuItem
                    key={grade.id}
                    value={grade.id}
                  >
                    {grade.name}
                  </MenuItem>
              ))}
            </TextField>

            {/* Wing Dropdown — hidden for Secretary designation */}
            {formData.name.trim().toLowerCase() !== "secretary" && (
              <TextField
                select
                fullWidth
                label="Wing"
                margin="normal"
                value={formData.wings}
                onChange={(e) =>
                  setFormData({ ...formData, wings: e.target.value })
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {Array.isArray(wings) &&
                  wings.map((wing) => (
                    <MenuItem
                      key={wing.hash_id}
                      value={wing.hash_id}
                    >
                      {wing.name}
                    </MenuItem>
                ))}
              </TextField>
            )}

            {/* Type Field */}
            

            {/* Status is now managed only via the row Switch toggle in the
                grid — hidden from the edit modal to keep the form focused. */}

          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingDesignation ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default DesignationsManagement;