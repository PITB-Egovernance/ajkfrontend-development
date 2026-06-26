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
import { Plus, ArrowLeft, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import confirmStatus from 'components/ui/confirmStatus';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { hasPermission } from "utils/permissions";
import { GRID_SX, GRID_INITIAL_STATE, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';

const PERM = "settings.designations";

const API_BASE = Config.apiUrl;

const DESIGNATION_TYPE_OPTIONS = [
  { value: "Internal", label: "Internal" },
  { value: "External", label: "External" },
];

const normalizeDesignationType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "internal") return "Internal";
  if (normalized === "external") return "External";

  return value ? String(value).trim() : "";
};

const getDesignationType = (item) => {
  return item?.type ?? item?.designation_type ?? item?.designationType ?? "";
};

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
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [grades, setGrades] = useState([]);

  const [filters, setFilters] = useState({
    name: '',
    grade_id: '',
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
    type: "",
    status: "active",
  });

  /* ===============================
     FETCH DESIGNATIONS
  =============================== */
  const fetchDesignations = async (page = 0, pageSize = 15) => {
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

        const formatted = dataArray
          .map((item) => {
            const type = normalizeDesignationType(getDesignationType(item));

            return {
              id: item.hash_id,
              hash_id: item.hash_id,
              name: item.name,
              grade_id: item.grade_id,
              grade_name: item.grade?.name || item.grade_name || "",
              type,
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

  useEffect(() => {
    const init = async () => {
      await fetchGrades();
      await fetchDesignations(paginationModel.page, paginationModel.pageSize);
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

  if (!formData.type) {
    toast.error("Designation type is required");
    return;
  }

  setLoading(true);

  console.log("Designation payload", formData)
  try {
    const isUpdate = !!editingDesignation;

    // Prevent duplicate designation names (case-insensitive, regardless of grade).
    // Fetch the full list so duplicates on other pages are also caught.
    try {
      const dupRes = await fetch(`${API_BASE}/settings/designations?per_page=1000`, { headers: getHeaders(false) });
      const dupResult = await dupRes.json();
      const all = dupResult.data?.data || dupResult.data || [];
      const target = formData.name.trim().toLowerCase();
      const duplicate = all.some(
        (d) => d.name?.trim().toLowerCase() === target &&
          (!isUpdate || (d.hash_id !== editingDesignation.hash_id))
      );
      if (duplicate) {
        toast.error("This designation already exists");
        setLoading(false);
        return;
      }
    } catch {
      // if the duplicate check fails, fall through and let the backend validate
    }

    const url = isUpdate
      ? `${API_BASE}/settings/designations/${editingDesignation.hash_id}/update`
      : `${API_BASE}/settings/designations/create`;

    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name: formData.name,
        grade_id: formData.grade_id,
        type: formData.type,
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
      fetchDesignations(paginationModel.page, paginationModel.pageSize);
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
        fetchDesignations(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Failed to delete designation");
      }
    } catch (error) {
      toast.error("Server error while deleting designation");
    }
  };

  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    if (!await confirmStatus({ newStatus })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/designations/${row.hash_id || row.id}/update`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: row.name,
          grade_id: row.grade_id,
          type: row.type || "Internal",
          status: newStatus,
        }),
      });
      const result = await res.json();
      if (res.ok || result.status === 200 || result.success) {
        toast.success(`Designation marked as ${newStatus}`);
        fetchDesignations(paginationModel.page, paginationModel.pageSize);
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
    field: "status",
    headerName: "Status",
    width: 130,
    renderCell: (params) => (
      <Switch
        checked={params.value === "active"}
        onChange={() => handleToggleStatus(params.row, params.value)}
        inputProps={{ "aria-label": "toggle designation status" }}
        size="small"
        disabled={!canEdit}
        color={params.value === "active" ? "success" : "error"}
      />
    ),
  },



  ...(canRowActions ? [{
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
  }] : []),
];

  if (loading && rows.length === 0) {
    return <InlineLoader text="Loading designations..." variant="ring" />;
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: "-webkit-fill-available" }}>

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

          {canAdd && (
            <Button
              onClick={() => {
                setEditingDesignation(null);
                setFormData({
                  name: "",
                  grade_id: "",
                  type: "",
                  status: "active",
                });
                setOpenModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Designation
            </Button>
          )}
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
          {canEdit && (
            <MenuItem
              onClick={() => {
                setEditingDesignation(selectedRow);

                setFormData({
                  name: selectedRow.name || "",
                  grade_id: String(selectedRow.grade_id ?? selectedRow.grade?.id ?? ""),
                  type: normalizeDesignationType(selectedRow.type) || "Internal",
                  status: selectedRow.status || "active",
                });


                setOpenModal(true);
                setAnchorEl(null);
              }}
            >
              Edit
            </MenuItem>
          )}
          {canDelete && (
            <MenuItem
              onClick={() => {
                handleDelete();
                setAnchorEl(null);
              }}
              sx={{ color: "red" }}
            >
              Delete
            </MenuItem>
          )}
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                grades
                  .filter((grade) => (grade.status ?? "active").toLowerCase() === "active")
                  .map((grade) => (
                  <MenuItem
                    key={grade.id}
                    value={String(grade.id)}
                  >
                    {grade.name}
                  </MenuItem>
              ))}
            </TextField>

            {/* Designation Type Dropdown */}
            <TextField
              select
              required
              fullWidth
              label="Designation Type"
              margin="normal"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
            >
              {DESIGNATION_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>


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
