import React, { useState, useEffect } from "react";
import TooltipDataGrid from "components/ui/TooltipDataGrid";
import {
  TextField, IconButton, Menu, MenuItem, DialogTitle,
  DialogContent, DialogActions, Switch, CircularProgress,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import { Plus, ArrowLeft, MoreVertical, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import FormDialog from "components/ui/FormDialog";
import { InlineLoader } from "components/ui/Loader";
import { GRID_SX } from "utils/gridStyles";
import { hasPermission } from "utils/permissions";
import { handleApiError, getErrorMessage } from "utils/apiErrors";
import Config from "config/baseUrl";
import AdvancedFilter from "components/tables/AdvancedFilter";
import { authHeaders as apiAuthHeaders } from 'utils/apiUtils';

const PERM = "settings.service_years";

const API_BASE = Config.apiUrl;

const authHeaders = (json = false) => apiAuthHeaders(json);

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Always the full split — "57 years, 0 months and 0 days" — so a zero month/day is still shown
// (the backend's `text` leaves zero parts out).
const breakdown = (d) =>
  d ? `${plural(d.years, "year")}, ${plural(d.months, "month")} and ${plural(d.days, "day")}` : "";

// A complete YYYY-MM-DD with a 4-digit year — anything else (half-typed, 5-6 digit year) is not sent.
const isCompleteDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");

const emptyForm = { title: "", start_date: "" };

const ServiceYearManagement = () => {
  const navigate = useNavigate();
  const canAdd = hasPermission(`${PERM}.add`);
  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ title: "", status: "" });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  // Live preview of the service years for the date picked in the form (calculated by the backend).
  const [calc, setCalc] = useState({ loading: false, data: null, error: "" });

  const filterConfig = [
    { name: "title", label: "Title", type: "text", placeholder: "Filter by title" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ title: "", status: "" });
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  /* ── FETCH (server-side pagination + filters) ── */
  const fetchServiceYears = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        per_page: String(paginationModel.pageSize),
        page: String(paginationModel.page + 1),
      });
      if (filters.title.trim()) params.set("name", filters.title.trim());
      if (filters.status.trim()) params.set("status", filters.status.trim());

      const res = await fetch(`${API_BASE}/settings/service-years?${params.toString()}`, { headers: authHeaders() });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) throw Object.assign(new Error(result.message), { status: res.status, errors: result.errors });

      const data = result.data?.data ?? [];
      setRows(
        (Array.isArray(data) ? data : []).map((item, i) => ({
          id: item.hash_id ?? item.id,
          hash_id: item.hash_id ?? item.id,
          sr_no: paginationModel.page * paginationModel.pageSize + i + 1,
          title: item.title ?? "-",
          start_date: (item.start_date ?? "").slice(0, 10),
          remarks: item.remarks ?? "",
          status: item.status ?? "active",
          service_years: item.service_years,
          service_duration: item.service_duration,
          as_of: item.as_of,
        }))
      );
      setTotal(Number(result.data?.total ?? data.length));
      setActiveCount(Number(result.data?.status_counts?.active ?? 0));
      setInactiveCount(Number(result.data?.status_counts?.inactive ?? 0));
    } catch (err) {
      handleApiError(err, { fallback: "Could not load the service years." });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, filters.title, filters.status]);

  /* ── LIVE CALCULATION: the moment a date is selected, ask the backend for the service years ── */
  useEffect(() => {
    if (!open) return undefined;
    if (!isCompleteDate(form.start_date)) {
      setCalc({ loading: false, data: null, error: "" });
      return undefined;
    }

    const controller = new AbortController();
    setCalc((c) => ({ ...c, loading: true, error: "" }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/settings/service-years/calculate?date=${encodeURIComponent(form.start_date)}`,
          { headers: authHeaders(), signal: controller.signal }
        );
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(result.message), { status: res.status, errors: result.errors });
        setCalc({ loading: false, data: result.data, error: "" });
      } catch (err) {
        if (err.name === "AbortError") return;
        setCalc({ loading: false, data: null, error: getErrorMessage(err, "Could not calculate the service years.") });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.start_date, open]);

  /* ── MENU ── */
  const handleMenuOpen = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setCalc({ loading: false, data: null, error: "" });
    setOpen(true);
  };

  const openEdit = () => {
    setEditing(selectedRow);
    setForm({
      title: selectedRow.title,
      start_date: selectedRow.start_date,
    });
    setOpen(true);
    handleMenuClose();
  };

  /* ── CREATE / UPDATE ── */
  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!isCompleteDate(form.start_date)) { toast.error("Please select the date"); return; }

    setSaving(true);
    try {
      const isUpdate = !!editing;
      const url = isUpdate
        ? `${API_BASE}/settings/service-years/update/${editing.hash_id}`
        : `${API_BASE}/settings/service-years/store`;

      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          title: form.title.trim(),
          start_date: form.start_date,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(result.message), { status: res.status, errors: result.errors });

      toast.success(isUpdate ? "Service year updated successfully" : "Service year created successfully");
      setOpen(false);
      setEditing(null);
      fetchServiceYears();
    } catch (err) {
      handleApiError(err, { fallback: "The service year could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();
    if (!await confirmDelete({ title: "Delete Service Year", identifier: selectedRow.title })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/service-years/delete/${selectedRow.hash_id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(result.message), { status: res.status, errors: result.errors });

      toast.success("Service year deleted successfully");
      fetchServiceYears();
    } catch (err) {
      handleApiError(err, { fallback: "The service year could not be deleted." });
    }
  };

  /* ── TOGGLE STATUS ── */
  const handleToggleStatus = async (row) => {
    const newStatus = row.status === "active" ? "inactive" : "active";
    if (!await confirmStatus({ newStatus })) return;
    try {
      const res = await fetch(`${API_BASE}/settings/service-years/update/${row.hash_id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(result.message), { status: res.status, errors: result.errors });

      toast.success(`Marked as ${newStatus}`);
      fetchServiceYears();
    } catch (err) {
      handleApiError(err, { fallback: "The status could not be updated." });
    }
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no", headerName: "#", width: 70 },
    { field: "title", headerName: "Title", flex: 1, minWidth: 220 },
    {
      field: "start_date",
      headerName: "Date",
      width: 130,
      renderCell: (p) => formatDate(p.value),
    },
    {
      field: "service_years",
      headerName: "Service Years (till today)",
      flex: 1,
      minWidth: 260,
      sortable: false,
      renderCell: (p) => (
        <div className="leading-tight py-1">
          <span className="text-base font-bold text-emerald-800">
            {p.value ?? "—"} {p.value === 1 ? "year" : "years"}
          </span>
          <div className="text-xs text-slate-500">{breakdown(p.row.service_duration)}</div>
        </div>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (p) => (
        <Switch
          checked={p.value === "active"}
          onChange={() => handleToggleStatus(p.row)}
          inputProps={{ "aria-label": "toggle service year status" }}
          size="small"
          disabled={!canEdit}
          color={p.value === "active" ? "success" : "error"}
        />
      ),
    },
    ...(canRowActions ? [{
      field: "actions",
      headerName: "Actions",
      width: 75,
      sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ];

  if (loading && rows.length === 0) return <InlineLoader text="Loading service years..." variant="ring" size="lg" />;

  const calcData = calc.data;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="form-fill-width bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate("/dashboard/settings")}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CalendarClock size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Service Year</h1>
                <p className="text-sm text-slate-500">
                  Save a date and see how many years of service it makes up to today ({formatDate(todayIso())})
                </p>
              </div>
            </div>
          </div>
          {canAdd && (
            <button onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Service Year
            </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5"><p className="text-sm text-emerald-700 font-medium">Active</p><h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-5"><p className="text-sm text-red-700 font-medium">Inactive</p><h2 className="text-3xl font-bold text-red-900 mt-1">{inactiveCount}</h2></CardContent>
          </Card>
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Service Years"
        />

        {/* GRID */}
        <TooltipDataGrid
          rows={rows} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          paginationMode="server" rowCount={total}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={GRID_SX}
          rowHeight={60}
          loading={loading}
        />

        {/* ROW CONTEXT MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={openEdit}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>}
        </Menu>

        {/* ADD / EDIT FORM — two fields (title + date), so it opens as a popup */}
        <FormDialog fieldCount={2} open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold flex items-center gap-2">
            <CalendarClock size={18} className="text-emerald-700" />
            {editing ? "Edit Service Year" : "Add Service Year"}
          </DialogTitle>

          <DialogContent>
            <TextField fullWidth autoFocus label="Title" margin="dense" size="small"
              value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Commission established" />

            <TextField fullWidth type="date" label="Date" margin="dense" size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: "1900-01-01", max: todayIso() }}
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              helperText="The actual date is saved. Service years are calculated from it." />

            {/* CALCULATED SERVICE YEARS — appears as soon as a date is selected */}
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Service years as of today ({formatDate(calcData?.as_of || todayIso())})
              </p>

              {!form.start_date && (
                <p className="mt-1 text-sm text-slate-500">Select a date to see the service years.</p>
              )}

              {form.start_date && calc.loading && !calcData && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <CircularProgress size={16} /> Calculating…
                </div>
              )}

              {calc.error && <p className="mt-1 text-sm font-medium text-red-600">{calc.error}</p>}

              {calcData && !calc.error && (
                <div className={`mt-1 ${calc.loading ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-4xl font-extrabold text-emerald-900">{calcData.service_years}</span>
                    <span className="text-lg font-semibold text-emerald-800">
                      {calcData.service_years === 1 ? "year" : "years"} of service
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold">Total: </span>
                    {breakdown(calcData)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    From {formatDate(calcData.start_date)} · {calcData.total_days.toLocaleString()} days in total
                  </p>
                </div>
              )}
            </div>
          </DialogContent>

          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Update Service Year" : "Create Service Year"}
            </button>
          </DialogActions>
        </FormDialog>
      </div>
    </div>
  );
};

export default ServiceYearManagement;
