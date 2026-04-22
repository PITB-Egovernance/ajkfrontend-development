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
  DialogActions
} from "@mui/material";
import { Card, CardContent } from "Components/ui/Card";
import Button from "Components/ui/Button";
import {
  Plus,
  ArrowLeft,
  MoreVertical,
  Map
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Config from "Config/Baseurl";
import AuthService from "Services/AuthService";
import { PageLoader, InlineLoader } from "Components/ui/Loader";

const ExamCitiesManagement = () => {
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
  const [editingCity, setEditingCity] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
  });

  /* ===============================
     FETCH EXAM CITIES
  =============================== */
  const fetchExamCities = async (page = 0, pageSize = 15) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/settings/exam-cities?page=${page + 1}&per_page=${pageSize}`,
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

        const formatted = data.map((item, index) => ({
          id: item.hash_id || item.id,
          sr_no: page * pageSize + index + 1,
          hash_id: item.hash_id,
          name: item.name,
          created_at: item.created_at,
          status: item.status ?? "active",
        }));

        setRows(formatted);
        setTotal(result.data.total || formatted.length);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamCities(paginationModel.page, paginationModel.pageSize);
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
    setEditingCity(selectedRow);
    setFormData({
      name: selectedRow.name,
    });
    setOpenModal(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();

    if (!window.confirm("Delete this exam city?")) return;

    try {
      const response = await fetch(
        `${API_BASE}/settings/exam-cities/${selectedRow.hash_id}/delete`,
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
        fetchExamCities(paginationModel.page, paginationModel.pageSize);
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
      toast.error("City name required");
      return;
    }

    setLoading(true);

    try {
      const isUpdate = !!editingCity;

      const url = isUpdate
        ? `${API_BASE}/settings/exam-cities/${editingCity.hash_id}/update`
        : `${API_BASE}/settings/exam-cities/create`;

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
      fetchExamCities(paginationModel.page, paginationModel.pageSize);
    } catch {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     SEARCH FILTER
  =============================== */
  const filteredRows = rows.filter(
    (row) =>
      row.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ===============================
     DATAGRID COLUMNS
  =============================== */
  const columns = [
    { field: "sr_no", headerName: "Sr No", width: 100 },
    { field: "name", headerName: "Exam City Name", flex: 1 },
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
    return <InlineLoader text="Loading exam cities..." variant="ring" size="lg" />;
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
              Exam Cities Management
            </h1>
          </div>

          <Button
            onClick={() => {
              setEditingCity(null);
              setFormData({ name: "" });
              setOpenModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exam City
          </Button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">
                Total Cities
              </p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">
                {total}
              </h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">
                Active Cities
              </p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">
                {activeCount}
              </h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">
                Inactive Cities
              </p>
              <h2 className="text-3xl font-bold text-red-900 mt-2">
                {inactiveCount}
              </h2>
            </CardContent>
          </Card>

        </div>

        {/* SEARCH */}
        <div className="mb-4">
          <TextField
            fullWidth
            placeholder="Search exam cities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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
            {editingCity ? "Edit Exam City" : "Add Exam City"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Exam City Name"
              margin="normal"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingCity ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default ExamCitiesManagement;
