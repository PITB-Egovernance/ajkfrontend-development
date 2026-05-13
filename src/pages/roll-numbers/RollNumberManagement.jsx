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
  Chip,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import {
  Hash,
  ArrowRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings2,
  Users,
  ClipboardCheck,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";

const API_BASE = Config.apiUrl; // local — switch to Config.productionUrl after deploying backend
const API_KEY  = Config.apiKey;

const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-API-KEY": API_KEY,
});

const gridSx = {
  border: "none",
  "& .MuiDataGrid-columnHeaders":    { backgroundColor: "#f8fafc" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
  "& .MuiDataGrid-row": { minHeight: "56px !important" },
  "& .MuiDataGrid-checkboxInput svg":             { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":  { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":          { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root": { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":       { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover": { backgroundColor: "#d1fae5" },
};

// ── Sub-page: Applicant eligibility table for a selected advertisement ──────
const ApplicantsList = ({ advertisementId, advertisementTitle, onBack }) => {
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [selectionModel, setSelectionModel] = useState([]);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [anchorEl,       setAnchorEl]       = useState(null);
  const [selectedRow,    setSelectedRow]    = useState(null);
  const [rejectModal,    setRejectModal]    = useState(false);
  const [rejectReason,   setRejectReason]   = useState("");
  const [configModal,    setConfigModal]    = useState(false);
  const [configForm,     setConfigForm]     = useState({ prefix: "AJK", starting_number: "1001", format: "sequential" });
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: 500 });
      if (filterStatus) params.set("eligibility_status", filterStatus);
      if (searchTerm)   params.set("search", searchTerm);
      const res    = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/applications?${params}`, { headers: getHeaders() });
      const result = await res.json();
      if (result.success || result.status === 200) {
        setData(result.data);
        if (result.data?.config) {
          const c = result.data.config;
          setConfigForm({ prefix: c.prefix ?? "AJK", starting_number: String(c.starting_number ?? "1001"), format: c.format ?? "sequential" });
        }
      } else {
        toast.error(result.message || "Failed to load");
      }
    } catch { toast.error("Server error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [advertisementId, filterStatus]); // eslint-disable-line

  const rows = (data?.applications?.data ?? []).map((app, i) => ({
    id:                app.id,
    sr_no:             i + 1,
    application_number: app.application_number,
    candidate_name:    app.candidate_name,
    candidate_cnic:    app.candidate_cnic,
    paid:              !!app.paid_at,
    eligibility_status: app.roll_number?.eligibility_status ?? "pending",
    roll_number:       app.roll_number?.roll_number ?? null,
    rejection_reason:  app.roll_number?.rejection_reason ?? null,
  }));

  const filtered = searchTerm.trim()
    ? rows.filter((r) => [r.candidate_name, r.candidate_cnic, r.application_number].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase())))
    : rows;

  const stats = data?.stats ?? {};

  const setEligibility = async (appId, status, reason = null) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roll-numbers/${appId}/eligibility`, {
        method: "PUT", headers: getHeaders(),
        body: JSON.stringify({ eligibility_status: status, rejection_reason: reason, advertisement_id: advertisementId }),
      });
      const r = await res.json();
      if (r.success || r.status === 200) { toast.success("Updated"); fetchData(); }
      else toast.error(r.message || "Failed");
    } catch { toast.error("Server error"); }
    finally { setSaving(false); }
  };

  const bulkSetEligibility = async (status) => {
    if (!selectionModel.length) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/bulk-eligibility`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({ application_ids: selectionModel, eligibility_status: status }),
      });
      const r = await res.json();
      if (r.success || r.status === 200) { toast.success(r.message || "Updated"); setSelectionModel([]); fetchData(); }
      else toast.error(r.message || "Failed");
    } catch { toast.error("Server error"); }
    finally { setSaving(false); }
  };

  const bulkRejectUnpaid = async () => {
    if (!await confirmDelete({ title: 'Reject Unpaid Applications', message: 'Are you sure you want to reject all unpaid applications for this advertisement?', warning: 'This will reject all unpaid candidates.' })) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/bulk-reject-unpaid`, { method: "POST", headers: getHeaders() });
      const r   = await res.json();
      if (r.success || r.status === 200) { toast.success(r.message || "Done"); fetchData(); }
      else toast.error(r.message || "Failed");
    } catch { toast.error("Server error"); }
    finally { setSaving(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/configure`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({ prefix: configForm.prefix, starting_number: Number(configForm.starting_number), format: configForm.format }),
      });
      const r = await res.json();
      if (r.success || r.status === 200) { toast.success("Configuration saved"); setConfigModal(false); fetchData(); }
      else toast.error(r.message || "Failed");
    } catch { toast.error("Server error"); }
    finally { setSaving(false); }
  };

  const generateRollNumbers = async () => {
    if (!data?.config) { toast.error("Save roll number format first"); setConfigModal(true); return; }
    if (!await confirmDelete({ title: 'Generate Roll Numbers', message: 'Generate roll numbers for all eligible candidates?', warning: '' })) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/generate`, { method: "POST", headers: getHeaders() });
      const r   = await res.json();
      if (r.success || r.status === 200) { toast.success(r.message || "Generated"); fetchData(); }
      else toast.error(r.message || "Failed");
    } catch { toast.error("Server error"); }
    finally { setSaving(false); }
  };

  const columns = [
    { field: "sr_no",             headerName: "#",            width: 55 },
    { field: "application_number", headerName: "App No.",     width: 140 },
    { field: "candidate_name",    headerName: "Name",         flex: 1, minWidth: 160 },
    { field: "candidate_cnic",    headerName: "CNIC",         width: 150 },
    { field: "paid",              headerName: "Payment",      width: 100,
      renderCell: (p) => p.value
        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Paid</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Unpaid</span> },
    { field: "eligibility_status", headerName: "Eligibility", width: 120,
      renderCell: (p) => {
        const map = { eligible: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700", pending: "bg-amber-100 text-amber-700" };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[p.value] ?? map.pending}`}>{p.value}</span>;
      }},
    { field: "roll_number",       headerName: "Roll No.",     width: 140,
      renderCell: (p) => p.value ? <span className="font-mono font-bold text-indigo-700">{p.value}</span> : <span className="text-slate-400 text-xs">Not assigned</span> },
    { field: "actions",           headerName: "Actions",      width: 80, sortable: false,
      renderCell: (p) => <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedRow(p.row); }}><MoreVertical size={18} /></IconButton> },
  ];

  if (loading && !data)
    return <div className="flex justify-center items-center py-20"><InlineLoader text="Loading applications..." variant="ring" size="lg" /></div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={onBack} className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              ← Back to Advertisements
            </button>
            <h2 className="text-xl font-bold text-slate-900">{advertisementTitle}</h2>
            <p className="text-sm text-slate-500">Eligibility screening and roll number assignment</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setConfigModal(true)}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50">
              <Settings2 size={14} /> Configure Format
            </button>
            <button onClick={generateRollNumbers} disabled={saving}
              className="px-3 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60">
              <Hash size={14} /> Generate Roll Numbers
            </button>
            <button onClick={() => navigate(`/dashboard/roll-numbers/${advertisementId}/center-allocation`)}
              className="px-3 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              Center Allocation <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total Apps",   value: stats.total ?? 0,       color: "blue" },
            { label: "Shortlisted",  value: stats.shortlisted ?? 0, color: "emerald" },
            { label: "Eligible",     value: stats.eligible ?? 0,    color: "green" },
            { label: "Rejected",     value: stats.rejected ?? 0,    color: "red" },
            { label: "Roll Nos.",    value: stats.generated ?? 0,   color: "indigo" },
            { label: "Published",    value: stats.published ?? 0,   color: "violet" },
          ].map(({ label, value, color }) => (
            <Card key={label} className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border border-${color}-200`}>
              <CardContent className="p-4">
                <p className={`text-xs text-${color}-700 font-medium`}>{label}</p>
                <h3 className={`text-2xl font-bold text-${color}-900 mt-1`}>{value}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center gap-3 mb-4 flex-wrap justify-between">
          <div className="flex gap-3">
            <TextField size="small" placeholder="Search name, CNIC…" value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} sx={{ width: 240 }} />
            <TextField select size="small" label="Filter" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)} sx={{ width: 160 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="eligible">Eligible</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectionModel.length > 0 && (
              <>
                <button onClick={() => bulkSetEligibility("eligible")} disabled={saving}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle size={13} /> Mark Eligible ({selectionModel.length})
                </button>
                <button onClick={() => { setRejectModal(true); }} disabled={saving}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-medium flex items-center gap-1.5">
                  <XCircle size={13} /> Reject ({selectionModel.length})
                </button>
              </>
            )}
            <button onClick={bulkRejectUnpaid} disabled={saving}
              className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1.5">
              <AlertCircle size={13} /> Reject All Unpaid
            </button>
            <button onClick={fetchData}
              className="px-3 py-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-1.5">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* GRID */}
        <DataGrid
          rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]} loading={loading} autoHeight
          checkboxSelection disableRowSelectionOnClick
          rowSelectionModel={selectionModel} onRowSelectionModelChange={setSelectionModel}
          sx={gridSx}
        />

        {/* ROW MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => { setAnchorEl(null); setSelectedRow(null); }}>
          <MenuItem onClick={() => { setEligibility(selectedRow.id, "eligible"); setAnchorEl(null); }}>Mark Eligible</MenuItem>
          <MenuItem onClick={() => { setRejectModal(true); setSelectionModel([selectedRow.id]); setAnchorEl(null); }} sx={{ color: "red" }}>Reject</MenuItem>
        </Menu>

        {/* REJECT MODAL */}
        <Dialog open={rejectModal} onClose={() => setRejectModal(false)} fullWidth maxWidth="sm">
          <DialogTitle>Rejection Reason</DialogTitle>
          <DialogContent>
            <TextField fullWidth multiline rows={3} margin="normal" size="small" label="Reason (optional)"
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. CNIC expired, Domicile mismatch…" />
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setRejectModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm">Cancel</button>
            <button onClick={async () => {
              if (selectionModel.length > 1 || !selectedRow) {
                setSaving(true);
                try {
                  const res = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/bulk-eligibility`, {
                    method: "POST", headers: getHeaders(),
                    body: JSON.stringify({ application_ids: selectionModel, eligibility_status: "rejected", rejection_reason: rejectReason }),
                  });
                  const r = await res.json();
                  if (r.success || r.status === 200) { toast.success("Rejected"); setSelectionModel([]); fetchData(); }
                  else toast.error(r.message || "Failed");
                } catch { toast.error("Server error"); }
                finally { setSaving(false); }
              } else {
                await setEligibility(selectionModel[0], "rejected", rejectReason);
              }
              setRejectModal(false); setRejectReason("");
            }} disabled={saving}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm disabled:opacity-60">
              {saving ? "Rejecting…" : "Confirm Reject"}
            </button>
          </DialogActions>
        </Dialog>

        {/* CONFIG MODAL */}
        <Dialog open={configModal} onClose={() => setConfigModal(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold">Configure Roll Number Format</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="Prefix" margin="normal" size="small"
              value={configForm.prefix} onChange={(e) => setConfigForm((p) => ({ ...p, prefix: e.target.value }))}
              helperText="e.g. AJK → Roll number will be: AJK-001001" />
            <TextField fullWidth label="Starting Number" margin="normal" size="small" type="number"
              inputProps={{ min: 1 }}
              value={configForm.starting_number} onChange={(e) => setConfigForm((p) => ({ ...p, starting_number: e.target.value }))} />
            <TextField select fullWidth label="Format" margin="normal" size="small"
              value={configForm.format} onChange={(e) => setConfigForm((p) => ({ ...p, format: e.target.value }))}>
              <MenuItem value="sequential">Sequential (1001, 1002, 1003…)</MenuItem>
              <MenuItem value="random">Random (shuffled order)</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setConfigModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm">Cancel</button>
            <button onClick={saveConfig} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save Configuration"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

// ── Main page: list advertisements with roll number progress ────────────────
const RollNumberManagement = () => {
  const navigate = useNavigate();
  const [rows,           setRows]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [filterGenerated, setFilterGenerated] = useState(""); // "" | "yes" | "no"
  const [filterPublished, setFilterPublished] = useState(""); // "" | "yes" | "no"
  const [filterHasApps,   setFilterHasApps]   = useState(""); // "" | "yes" | "no"
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [selectedAd,     setSelectedAd]     = useState(null);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/roll-numbers?per_page=200`, { headers: getHeaders() });
      const result = await res.json();
      if (result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setRows(data.map((ad, i) => ({
          id:                 ad.hash_id,
          sr_no:              i + 1,
          title:              ad.adv_number ? `Adv #${ad.adv_number}` : `Advertisement #${i + 1}`,
          total_applications: ad.total_applications ?? 0,
          paid_applications:  ad.paid_applications ?? 0,
          generated:          !!ad.roll_number_config?.generated_at,
          published:          !!ad.roll_number_config?.published_at,
          hash_id:            ad.hash_id,
        })));
      } else {
        toast.error(result.message || "Failed to load");
      }
    } catch { toast.error("Server error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAds(); }, []);

  if (selectedAd) {
    return <ApplicantsList advertisementId={selectedAd.id} advertisementTitle={selectedAd.title} onBack={() => { setSelectedAd(null); fetchAds(); }} />;
  }

  const filteredRows = rows.filter((r) => {
    if (searchTerm.trim() && !r.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterGenerated === "yes" && !r.generated) return false;
    if (filterGenerated === "no"  &&  r.generated) return false;
    if (filterPublished === "yes" && !r.published) return false;
    if (filterPublished === "no"  &&  r.published) return false;
    if (filterHasApps === "yes" && r.total_applications === 0) return false;
    if (filterHasApps === "no"  && r.total_applications  >  0) return false;
    return true;
  });

  const hasFilters = searchTerm.trim() || filterGenerated || filterPublished || filterHasApps;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterGenerated("");
    setFilterPublished("");
    setFilterHasApps("");
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const columns = [
    { field: "sr_no",              headerName: "#",             width: 60 },
    { field: "title",              headerName: "Advertisement", flex: 1, minWidth: 240 },
    { field: "total_applications", headerName: "Applications",  width: 130,
      renderCell: (p) => <span className="font-semibold text-slate-700">{p.value}</span> },
    { field: "paid_applications",  headerName: "Paid",          width: 100,
      renderCell: (p) => <span className="font-semibold text-emerald-700">{p.value}</span> },
    { field: "generated",          headerName: "Roll Nos.",     width: 110,
      renderCell: (p) => p.value
        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">Generated</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Pending</span> },
    { field: "published",          headerName: "Published",     width: 110,
      renderCell: (p) => p.value
        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Published</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Unpublished</span> },
    { field: "actions",            headerName: "Manage",        width: 120, sortable: false,
      renderCell: (p) => (
        <button onClick={() => setSelectedAd(p.row)}
          className="px-3 py-1 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white text-xs font-medium rounded-lg flex items-center gap-1">
          Open <ArrowRight size={12} />
        </button>
      )},
  ];

  if (loading && rows.length === 0)
    return <div className="flex justify-center items-center min-h-screen"><InlineLoader text="Loading advertisements…" variant="ring" size="lg" /></div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg"><Hash size={22} className="text-indigo-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Roll Number Management</h1>
              <p className="text-sm text-slate-500">Eligibility screening, roll number generation and admit card publishing</p>
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5 flex items-center gap-3">
              <ClipboardCheck size={28} className="text-blue-700" />
              <div><p className="text-sm text-blue-700 font-medium">Total Ads</p><h2 className="text-2xl font-bold text-blue-900">{rows.length}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5 flex items-center gap-3">
              <Users size={28} className="text-emerald-700" />
              <div><p className="text-sm text-emerald-700 font-medium">Total Applications</p><h2 className="text-2xl font-bold text-emerald-900">{rows.reduce((s, r) => s + r.total_applications, 0)}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
            <CardContent className="p-5 flex items-center gap-3">
              <Hash size={28} className="text-indigo-700" />
              <div><p className="text-sm text-indigo-700 font-medium">Roll Nos. Generated</p><h2 className="text-2xl font-bold text-indigo-900">{rows.filter((r) => r.generated).length}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-5 flex items-center gap-3">
              <CheckCircle size={28} className="text-violet-700" />
              <div><p className="text-sm text-violet-700 font-medium">Published</p><h2 className="text-2xl font-bold text-violet-900">{rows.filter((r) => r.published).length}</h2></div>
            </CardContent>
          </Card>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <TextField
            size="small"
            placeholder="Search advertisement…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
            sx={{ flex: "1 1 220px", minWidth: 180 }}
          />
          <TextField
            select size="small" label="Applications"
            value={filterHasApps}
            onChange={(e) => { setFilterHasApps(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
            sx={{ minWidth: 155 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">Has Applications</MenuItem>
            <MenuItem value="no">No Applications</MenuItem>
          </TextField>
          <TextField
            select size="small" label="Roll Numbers"
            value={filterGenerated}
            onChange={(e) => { setFilterGenerated(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">Generated</MenuItem>
            <MenuItem value="no">Not Generated</MenuItem>
          </TextField>
          <TextField
            select size="small" label="Slip Status"
            value={filterPublished}
            onChange={(e) => { setFilterPublished(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">Published</MenuItem>
            <MenuItem value="no">Unpublished</MenuItem>
          </TextField>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw size={13} /> Clear
            </button>
          )}
          {hasFilters && (
            <span className="text-xs text-slate-500 self-center">
              {filteredRows.length} of {rows.length} shown
            </span>
          )}
        </div>

        {/* GRID */}
        <DataGrid
          rows={filteredRows} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50, 100]} loading={loading} autoHeight
          disableRowSelectionOnClick sx={gridSx}
        />
      </div>
    </div>
  );
};

export default RollNumberManagement;
