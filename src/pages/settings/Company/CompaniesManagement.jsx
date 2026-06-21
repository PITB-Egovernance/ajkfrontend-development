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
import toast from "react-hot-toast";
import confirmDelete from 'components/ui/ConfirmDelete';
import confirmStatus from 'components/ui/confirmStatus';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";
import { GRID_SX } from 'utils/gridStyles';

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

        }));

        setRows(formatted);
        setTotal(result.data?.total || formatted.length);
      } else {
        toast.error(result.message || "Failed to load companies");
      }
    } catch (error) {
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

      if (result.success === true) {
        toast.success(isUpdate ? "Company updated successfully" : "Company created successfully");
        setOpenModal(false);
        setEditingCompany(null);
        fetchCompanies(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Operation failed");
      }

    } catch (error) {
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

    if (!await confirmDelete({ title: 'Delete Company', message: 'Are you sure you want to delete this company?' })) return;

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

      if (result.success === true) {
        toast.success("Company deleted successfully");
        fetchCompanies(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Delete failed");
      }

    } catch (error) {
      toast.error("Server error");
    }
  };
  /* ===============================
     TOGGLE STATUS
  =============================== */
  const handleToggleStatus = async (row) => {
    const newStatus = row.status === "active" ? "inactive" : "active";
    if (!await confirmStatus({ newStatus })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/company/${row.hash_id || row.id}/update`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": API_KEY },
        body: JSON.stringify({ company_name: row.name, type: row.type || "Other", contact_person: row.contact_person || "", contact_number: row.contact_number || "", email: row.email || "", address: row.address || "", ntn: row.ntn || "", status: newStatus }),
      });
      const result = await res.json();
      if (res.ok || result.success === true || result.status === 200) {
        toast.success(`Company marked as ${newStatus}`);
        fetchCompanies(paginationModel.page, paginationModel.pageSize);
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
    { field: "name", headerName: "Company Name", flex: 1 },
    { field: "contact_person", headerName: "Contact Person", width: 180 },
    { field: "contact_number", headerName: "Phone", width: 150 },
    { field: "ntn", headerName: "NTN", width: 150 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Switch
          checked={params.row.status === "active"}
          onChange={() => handleToggleStatus(params.row)}
          size="small"
          color={params.row.status === "active" ? "success" : "error"}
          inputProps={{ "aria-label": "toggle company status" }}
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
    return <InlineLoader text="Loading companies..." variant="ring" />;
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
          sx={GRID_SX}
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
              <MenuItem value="Government">Government</MenuItem>
              <MenuItem value="Construction">Construction</MenuItem>
              <MenuItem value="IT Services">IT Services</MenuItem>
              <MenuItem value="Consulting">Consulting</MenuItem>
              <MenuItem value="Engineering">Engineering</MenuItem>
              <MenuItem value="Supply & Services">Supply &amp; Services</MenuItem>
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