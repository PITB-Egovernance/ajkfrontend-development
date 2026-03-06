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
} from "@mui/material";
import { Card, CardContent } from "Components/ui/Card";
import Button from "Components/ui/Button";
import { Plus, ArrowLeft, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Config from "Config/Baseurl";
import AuthService from "Services/AuthService";
import { InlineLoader } from "Components/ui/Loader";

const DesignationsManagement = () => {
  const navigate = useNavigate();

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 15,
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openModal, setOpenModal] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [grades, setGrades] = useState([]);

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
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
            "X-API-KEY": API_KEY,
          },
        }
      );

      const result = await response.json();

      if (result.success === true || result.status === 200) {
        const dataArray = result.data?.data || result.data || [];

        const formatted = dataArray.map((item) => ({
          id: item.hash_id,
          hash_id: item.hash_id,
          name: item.name,
          grade_id: item.grade_id,
          grade_name: item.grade?.name || item.grade_name || "",
          type: item.type,
          status: item.status ?? "active",
          created_at: item.created_at,
        }));

        setRows(formatted);
        setTotal(result.data?.total || formatted.length);
      } else {
        toast.error(result.message || "Failed to load designations");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load designations");
    } finally {
      setLoading(false);
    }
  };

 const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/grades`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "X-API-KEY": API_KEY,
        },
      });

      const result = await response.json();
      console.log("Grades API:", result);

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
      console.error("Grade fetch error:", error);
      setGrades([]); // prevent crash
    }
  };

  useEffect(() => {
    fetchGrades();
    fetchDesignations(paginationModel.page, paginationModel.pageSize);
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
  const filteredRows = rows.filter((row) =>
    row.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // if (!formData.type) {
  //   toast.error("Type is required");
  //   return;
  // }

  setLoading(true);

  try {
    const isUpdate = !!editingDesignation;

    const url = isUpdate
      ? `${API_BASE}/settings/designations/${editingDesignation.hash_id}/update`
      : `${API_BASE}/settings/designations/create`;

      console.log('Grades', formData.grade_id)
    const response = await fetch(url, {
      method: "POST", // ✅ FORCE POST (Laravel standard)
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify({
        name: formData.name,
        grade_id: formData.grade_id,
        type: "Internal",
        status: formData.status,
      }),
    });

    const result = await response.json();
    console.log("Designation Submit:", result);

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
      toast.error(result.message || "Operation failed");
    }

  } catch (error) {
    console.error("Submit Error:", error);
    toast.error("Server error");
  } finally {
    setLoading(false);
  }
};

  /* ===============================
     DELETE
  =============================== */
  const handleDelete = async () => {
    if (!selectedRow) return;
    if (!window.confirm("Delete this designation?")) return;

    try {
      const response = await fetch(
        `${API_BASE}/settings/designations/${selectedRow.hash_id}/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
            "X-API-KEY": API_KEY,
          },
        }
      );

      const result = await response.json();

      if (result.success === true || result.status === 200) {
        toast.success("Deleted successfully");
        fetchDesignations(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Server error");
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
    field: "type",
    headerName: "Type",
    width: 150,
  },

  {
    field: "status",
    headerName: "Status",
    width: 130,
    renderCell: (params) => (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          params.value === "active"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {params.value}
      </span>
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

        {/* SEARCH */}
        <div className="mb-6">
          <TextField
            fullWidth
            placeholder="Search designations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]}
          paginationMode="server"
          rowCount={total}
          loading={loading}
          autoHeight
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
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
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

            {/* Type Field */}
            

            {/* Status */}
            <TextField
              select
              fullWidth
              label="Status"
              margin="normal"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>

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