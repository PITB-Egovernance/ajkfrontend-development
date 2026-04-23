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
import { Card, CardContent } from "components/ui/Card";
import Button from "components/ui/Button";
import { Plus, ArrowLeft, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { PageLoader, InlineLoader } from "components/ui/Loader";

const CompaniesManagement = () => {
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
  const [editingCompany, setEditingCompany] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    company_type: "",
    contact_person: "",
    contact_number: "",
    email: "",
    address: "",
    ntn: "",
    status: "active",
  });

  /* ===============================
     FETCH COMPANIES
  =============================== */
  const fetchCompanies = async (page = 0, pageSize = 15) => {
    setLoading(true);

    try {
      const url = `${API_BASE}/settings/company?page=${page + 1}&per_page=${pageSize}`;
      console.log("Fetching:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/json",
          "X-API-KEY": API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("API Response:", result.data.data);

      if (result.success == true) {
        const dataArray =
          result.data?.data || [];

        const formatted = dataArray.map((item) => ({
          id: item.hash_id,
          hash_id: item.hash_id,
          name: item.company_name,
          type: item.type, // ✅ added
          contact_person: item.contact_person,
          contact_number: item.contact_number,
          ntn: item.ntn,
          email: item.email,
          address: item.address,
          status: item.status ?? "active",
          created_at: item.created_at,
        }));

        setRows(formatted);
        setTotal(result.data?.total || formatted.length);
      } else {
        toast.error(result.message || "Failed to load companies");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(paginationModel.page, paginationModel.pageSize);
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
  const filteredRows = rows.filter(
    (row) =>
      row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.ntn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ===============================
     ADD / UPDATE COMPANY
  =============================== */
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setLoading(true);

    try {
      const isUpdate = !!editingCompany;

      const url = isUpdate
        ? `${API_BASE}/settings/company/${editingCompany.hash_id}/update`
        : `${API_BASE}/settings/company/create`;

      const response = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",// Your API uses POST for both
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-KEY": API_KEY,
        },
        body: JSON.stringify({
          company_name: formData.name,
          type: formData.company_type,
          contact_person: formData.contact_person,
          contact_number: formData.contact_number,
          email: formData.email,
          address: formData.address,
          ntn: formData.ntn,
          status: formData.status,
        }),
      });

      const result = await response.json();
      console.log("Submit Response:", result);

      if (result.success === true) {
        toast.success(result.message || "Operation successful");
        setOpenModal(false);
        setEditingCompany(null);
        fetchCompanies(paginationModel.page, paginationModel.pageSize);
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

    if (!window.confirm("Delete this company?")) return;

    try {
      const response = await fetch(
        `${API_BASE}/settings/company/${selectedRow.hash_id}/delete`,
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
      console.log("Delete Response:", result);

      if (result.success === true) {
        toast.success(result.message || "Deleted successfully");
        fetchCompanies(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Delete failed");
      }

    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Server error");
    }
  };
  /* ===============================
     DATAGRID COLUMNS
  =============================== */
  const columns = [
    { field: "name", headerName: "Company Name", flex: 1 },
    { field: "contact_person", headerName: "Contact Person", width: 180 },
    { field: "contact_number", headerName: "Phone", width: 150 },
    { field: "ntn", headerName: "NTN", width: 150 },
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
    return <InlineLoader text="Loading companies..." variant="ring" />;
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
              Companies Management
            </h1>
          </div>

          <Button
            onClick={() => {
              setEditingCompany(null);
              setFormData({
                name: "",
                contact_person: "",
                contact_number: "",
                email: "",
                address: "",
                ntn: "",
                status: "active",
              });
              setOpenModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm text-blue-700 font-medium">
                Total Companies
              </p>
              <h2 className="text-3xl font-bold text-blue-900 mt-2">
                {total}
              </h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">
                Active Companies
              </p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">
                {activeCount}
              </h2>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-6">
              <p className="text-sm text-red-700 font-medium">
                Inactive Companies
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
            placeholder="Search companies..."
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

        {/* ACTION MENU */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
         <MenuItem
            onClick={() => {
              setEditingCompany(selectedRow);
              setFormData({
                name: selectedRow.name || "",
                company_type: selectedRow.type || "",   // ✅ FIXED HERE
                contact_person: selectedRow.contact_person || "",
                contact_number: selectedRow.contact_number || "",
                email: selectedRow.email || "",
                address: selectedRow.address || "",
                ntn: selectedRow.ntn || "",
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
            {editingCompany ? "Edit Company" : "Add Company"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Company Name"
              margin="normal"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <TextField
              select
              fullWidth
              label="Company Type"
              margin="normal"
              value={formData.company_type}
              onChange={(e) =>
                setFormData({ ...formData, company_type: e.target.value })
              }
            >
              <MenuItem value="Construction">Construction</MenuItem>
              <MenuItem value="IT Services">IT Services</MenuItem>
              <MenuItem value="Consulting">Consulting</MenuItem>
              <MenuItem value="Engineering">Engineering</MenuItem>
              <MenuItem value="Supply & Services">Supply & Services</MenuItem>
              <MenuItem value="Maintenance">Maintenance</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Contact Person"
              margin="normal"
              value={formData.contact_person}
              onChange={(e) =>
                setFormData({ ...formData, contact_person: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Contact Number"
              margin="normal"
              value={formData.contact_number}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // allow only numbers
                if (value.length <= 11) {
                  setFormData({ ...formData, contact_number: value });
                }
              }}
              inputProps={{
                maxLength: 11,
                inputMode: "numeric",
              }}
            />
            <TextField
              fullWidth
              label="NTN"
              margin="normal"
              value={formData.ntn}
              onChange={(e) =>
                setFormData({ ...formData, ntn: e.target.value })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingCompany ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default CompaniesManagement;