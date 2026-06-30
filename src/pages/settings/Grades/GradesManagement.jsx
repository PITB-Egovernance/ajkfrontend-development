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
import AdvancedFilter from "components/tables/AdvancedFilter";
import { GRID_SX } from 'utils/gridStyles';
import { hasPermission } from "utils/permissions";

const PERM = "settings.grades";
const FILTER_FETCH_PAGE_SIZE = 100;

const GradesManagement = () => {
  const navigate = useNavigate();
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  // Use productionUrl explicitly — avoids stale apiUrl in cached bundles
  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    name: '',
    status: ''
  });

  const filterConfig = [
    {
      name: 'name',
      label: 'Grade Name',
      type: 'text',
      placeholder: 'Filter by grade name'
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
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({
      name: '',
      status: ''
    });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 15,
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openModal, setOpenModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    status: "active",
  });

  const activeCount = rows.filter(
    (row) => (row.status ?? "active").toLowerCase() === "active"
  ).length;

  const inactiveCount = rows.filter(
    (row) => (row.status ?? "active").toLowerCase() === "inactive"
  ).length;

  const headers = () => ({
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
    "X-API-KEY": API_KEY,
  });

  const formatGradeRows = (items) => items.map((item) => ({
    id: item.hash_id || item.id,
    hash_id: item.hash_id || item.id,
    name: item.name,
    status: item.status ?? "active",
  }));

  const matchesFilters = (row) => {
    const name = filters.name.trim().toLowerCase();
    const status = filters.status.trim().toLowerCase();

    if (name && !String(row.name || '').toLowerCase().includes(name)) return false;
    if (status && String(row.status || '').toLowerCase() !== status) return false;

    return true;
  };

  const fetchGradePage = async (page, pageSize) => {
    const response = await fetch(
      `${API_BASE}/settings/grades?page=${page}&per_page=${pageSize}`,
      { headers: headers() }
    );
    const result = await response.json();

    if (!(response.ok || result.status === 200 || result.success === true)) {
      throw new Error(result.message || "Failed to load grades");
    }

    const payload = result.data ?? {};
    const data = payload.data ?? result.data ?? [];

    return {
      data: Array.isArray(data) ? data : [],
      total: Number(payload.total ?? 0),
      lastPage: Number(payload.last_page ?? 0),
    };
  };

  const fetchFilteredGrades = async (page, pageSize) => {
    const firstPage = await fetchGradePage(1, FILTER_FETCH_PAGE_SIZE);
    const totalRows = firstPage.total || firstPage.data.length;
    const lastPage = firstPage.lastPage || Math.max(1, Math.ceil(totalRows / FILTER_FETCH_PAGE_SIZE));

    const remainingPages = lastPage > 1
      ? await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) =>
            fetchGradePage(i + 2, FILTER_FETCH_PAGE_SIZE)
          )
        )
      : [];

    const allRows = [firstPage, ...remainingPages].flatMap((pageResult) => pageResult.data);
    const filteredRows = formatGradeRows(allRows).filter(matchesFilters);
    const startIndex = page * pageSize;

    setRows(filteredRows.slice(startIndex, startIndex + pageSize));
    setTotal(filteredRows.length);
  };

  /* ================= FETCH ================= */
  const fetchGrades = async (page = 0, pageSize = 15) => {
    setLoading(true);
    try {
      const hasActiveFilters = Object.values(filters).some((value) => String(value || '').trim());
      if (hasActiveFilters) {
        await fetchFilteredGrades(page, pageSize);
        return;
      }

      const response = await fetch(
        `${API_BASE}/settings/grades?page=${page + 1}&per_page=${pageSize}`,
        { headers: headers() }
      );

      const result = await response.json();
      // console.log('Result', result)
      if (result.status === 200 || result.success === true) {
        const dataArray = result.data?.data || result.data || [];

        const formatted = formatGradeRows(Array.isArray(dataArray) ? dataArray : []);

        setRows(formatted);
        setTotal(result.data?.total || formatted.length);
      } else {
        toast.error(result.message || "Failed to load grades");
      }
    } catch {
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades(paginationModel.page, paginationModel.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, filters.name, filters.status]);

  // ── Workaround for live backend unique-name bug ──────────────────────────
  // The live UpdateGradeRequest ignores null instead of the grade's own ID,
  // so submitting the same name fails the unique check. When the name hasn't
  // changed we do a two-step update: rename to a temp unique name first, then
  // rename back with the desired status. Both steps have a unique name → pass.
  const LIVE = "https://api-admin-ajkpsc.punjab.gov.pk/api/v1";
  const gradeHeaders = () => ({
    Authorization:  `Bearer ${AuthService.getToken()}`,
    "Content-Type": "application/json",
    Accept:         "application/json",
    "X-API-KEY":    "9kX7pL2mQ8rT5vY3nZ6bJ1hF4gD0eA9cU8iO2sV7tE5rW",
  });

  const updateGradeOnLive = async (hashId, finalName, finalStatus, originalName) => {
    const url      = `${LIVE}/settings/grades/${hashId}/update`;
    const nameUnchanged = finalName.trim() === (originalName || "").trim();

    if (nameUnchanged) {
      // Step 1: rename to guaranteed-unique temp name
      const tempName = `${finalName.trim()}_${Date.now()}`;
      const r1 = await fetch(url, {
        method: "PUT", headers: gradeHeaders(),
        body: JSON.stringify({ name: tempName, status: finalStatus }),
      });
      if (!r1.ok) {
        const e = await r1.json();
        throw new Error(e.message || "Step-1 rename failed");
      }
      // Step 2: rename back to original with desired status (now truly unique)
      const r2 = await fetch(url, {
        method: "PUT", headers: gradeHeaders(),
        body: JSON.stringify({ name: finalName.trim(), status: finalStatus }),
      });
      if (!r2.ok) {
        const e = await r2.json();
        throw new Error(e.message || "Step-2 restore failed");
      }
      return await r2.json();
    }

    // Name changed → single step (new name is unique)
    const res    = await fetch(url, {
      method: "PUT", headers: gradeHeaders(),
      body: JSON.stringify({ name: finalName.trim(), status: finalStatus }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Update failed");
    return result;
  };

  /* ================= ADD / UPDATE ================= */
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Grade name is required");
      return;
    }

    setLoading(true);

    try {
      const isUpdate = !!editingGrade;

      if (isUpdate) {
        await updateGradeOnLive(
          editingGrade.hash_id || editingGrade.id,
          formData.name,
          formData.status || 'active',
          editingGrade.name,   // original name for comparison
        );
        toast.success("Grade updated successfully");
        setOpenModal(false);
        setEditingGrade(null);
        fetchGrades(paginationModel.page, paginationModel.pageSize);
      } else {
        // Create — no unique issue, just POST
        const res    = await fetch(`${LIVE}/settings/grades/create`, {
          method: "POST", headers: gradeHeaders(),
          body: JSON.stringify({ name: formData.name.trim(), status: formData.status || 'active' }),
        });
        const result = await res.json();
        if (res.ok || result.status === 201 || result.success) {
          toast.success("Grade created successfully");
          setOpenModal(false);
          fetchGrades(paginationModel.page, paginationModel.pageSize);
        } else {
          toast.error(result.message || "Failed to create grade");
        }
      }
    } catch (err) {
      toast.error(err.message || "Server error while saving grade");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!selectedRow) return;
    if (!await confirmDelete({ title: 'Delete Grade', message: 'Are you sure you want to delete this grade?' })) return;

    try {
      const response = await fetch(
        `${API_BASE}/settings/grades/${selectedRow.hash_id}/delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "X-API-KEY": API_KEY,
          },
        }
      );

      const result = await response.json();

      if (result.status === 200 || result.success === true) {
        toast.success("Grade deleted successfully");
        fetchGrades(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.message || "Failed to delete grade");
      }
    } catch {
      toast.error("Server error while deleting grade");
    }
  };

  const handleToggleStatus = async (row, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    if (!await confirmStatus({ newStatus })) return;
    try {
      // Use two-step workaround: name stays same → triggers unique bug on live backend
      await updateGradeOnLive(
        row.hash_id || row.id,
        row.name,
        newStatus,
        row.name,   // same name → triggers two-step update
      );
      toast.success(`Grade marked as ${newStatus}`);
      fetchGrades(paginationModel.page, paginationModel.pageSize);
    } catch (err) {
      toast.error(err.message || "Failed to update grade status");
    }
  };

  /* ================= COLUMNS ================= */
  const columns = [
    { field: "name", headerName: "Grade", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Switch
          checked={params.value === "active"}
          onChange={() => handleToggleStatus(params.row, params.value)}
          inputProps={{ "aria-label": "toggle grade status" }}
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
    return <InlineLoader text="Loading grades..." variant="ring" />;
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
            <h1 className="text-2xl font-bold">Grades Management</h1>
          </div>

          {canAdd && (
            <Button
              onClick={() => {
                setEditingGrade(null);
                setFormData({ name: "", status: "active" });
                setOpenModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Grade
            </Button>
          )}
        </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                    <CardContent className="p-6">
                      <p className="text-sm text-blue-700 font-medium">
                        Total Grades
                      </p>
                      <h2 className="text-3xl font-bold text-blue-900 mt-2">
                        {total}
                      </h2>
                    </CardContent>
                  </Card>
        
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                    <CardContent className="p-6">
                      <p className="text-sm text-emerald-700 font-medium">
                        Active Grades
                      </p>
                      <h2 className="text-3xl font-bold text-emerald-900 mt-2">
                        {activeCount}
                      </h2>
                    </CardContent>
                  </Card>
        
                  <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
                    <CardContent className="p-6">
                      <p className="text-sm text-red-700 font-medium">
                        Inactive Grades
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
          title="Filter Grades"
        />

        {/* TABLE */}
        <TooltipDataGrid
          rows={rows}
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
          {canEdit && (
            <MenuItem
              onClick={() => {
                setEditingGrade(selectedRow);
                setFormData({
                  name: selectedRow.name,
                  status: selectedRow.status,
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
        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingGrade ? "Edit Grade" : "Add Grade"}
          </DialogTitle>

          <DialogContent>
            <TextField
              fullWidth
              label="Grade Name"
              margin="normal"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            {/* Status is now managed only via the row Switch toggle in the
                grid — hidden from the edit modal to keep the form focused. */}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingGrade ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Dialog>

      </div>
    </div>
  );
};

export default GradesManagement;
