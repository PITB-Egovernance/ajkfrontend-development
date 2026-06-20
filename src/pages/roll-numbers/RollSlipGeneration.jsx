import React, { useState, useEffect } from "react";
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { TextField, MenuItem } from "@mui/material";
import {
  ArrowLeft,
  Send,
  Hash,
  Users,
  Building2,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "components/ui/Card";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { InlineLoader } from "components/ui/Loader";

const API_BASE = Config.apiUrl; // local — switch to Config.apiUrl after deploying backend
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
  "& .MuiDataGrid-row": { minHeight: "52px !important" },
};

const RollSlipGeneration = () => {
  const navigate = useNavigate();
  const { advertisementId } = useParams();

  const [applications,   setApplications]   = useState([]);
  const [adTitle,        setAdTitle]        = useState("");
  const [stats,          setStats]          = useState({});
  const [loading,        setLoading]        = useState(true);
  const [publishing,     setPublishing]     = useState(false);
  const [filterCenter,   setFilterCenter]   = useState("");
  const [searchTerm,     setSearchTerm]     = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [published,      setPublished]      = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/applications?per_page=1000`, { headers: getHeaders() });
      const result = await res.json();
      if (result.success || result.status === 200) {
        const ad = result.data?.advertisement;
        setAdTitle(ad?.title ?? `Advertisement #${advertisementId}`);
        setStats(result.data?.stats ?? {});
        const apps = result.data?.applications?.data ?? [];
        const eligible = apps.filter((a) => a.roll_number?.eligibility_status === "eligible" && a.roll_number?.roll_number);
        setApplications(eligible);

        const allPublished = eligible.length > 0 && eligible.every((a) => !!a.roll_number?.published_at);
        setPublished(allPublished);
      } else {
        toast.error(result.message || "Failed to load");
      }
    } catch { toast.error("Server error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [advertisementId]); // eslint-disable-line

  const rows = applications.map((app, i) => ({
    id:            app.id,
    sr_no:         i + 1,
    roll_number:   app.roll_number?.roll_number ?? "—",
    candidate_name: app.candidate_name,
    candidate_cnic: app.candidate_cnic,
    center_name:   app.roll_number?.exam_center?.name ?? "Not assigned",
    center_city:   app.roll_number?.exam_center?.city ?? "—",
    hall_name:     app.roll_number?.exam_hall?.name ?? "—",
    seat_number:   app.roll_number?.seat_number ?? "—",
    published_at:  app.roll_number?.published_at ?? null,
  }));

  const uniqueCenters = [...new Map(rows.filter((r) => r.center_name !== "Not assigned").map((r) => [r.center_name, { name: r.center_name, city: r.center_city }])).values()];

  const filteredRows = rows.filter((r) => {
    const matchSearch = !searchTerm.trim() || [r.candidate_name, r.candidate_cnic, r.roll_number].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCenter = !filterCenter || r.center_name === filterCenter;
    return matchSearch && matchCenter;
  });

  const handlePublish = async () => {
    const unallocated = rows.filter((r) => r.center_name === "Not assigned").length;
    if (unallocated > 0) {
      if (!await confirmDelete({ title: 'Publish Admit Cards', message: `${unallocated} candidate(s) have no exam center assigned. Publish anyway?`, warning: '' })) return;
    } else {
      if (!await confirmDelete({ title: 'Publish Admit Cards', message: `Publish admit cards for all ${rows.length} eligible candidates? Candidates will be able to download their slips.`, warning: '' })) return;
    }
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/publish`, { method: "POST", headers: getHeaders() });
      const r   = await res.json();
      if (r.success || r.status === 200) {
        toast.success(r.message || "Admit cards published successfully!");
        fetchData();
      } else toast.error(r.message || "Failed to publish");
    } catch { toast.error("Server error"); }
    finally { setPublishing(false); }
  };

  const columns = [
    { field: "sr_no",          headerName: "#",           width: 60 },
    { field: "roll_number",    headerName: "Roll No.",    width: 160,
      renderCell: (p) => <span className="font-mono font-bold text-indigo-700 text-sm">{p.value}</span> },
    { field: "candidate_name", headerName: "Name",        flex: 1, minWidth: 160 },
    { field: "candidate_cnic", headerName: "CNIC",        width: 150 },
    { field: "center_name",    headerName: "Exam Center", width: 200,
      renderCell: (p) => p.value === "Not assigned"
        ? <span className="text-amber-600 text-xs font-medium">Not assigned</span>
        : <span className="text-slate-700">{p.value}</span> },
    { field: "hall_name",      headerName: "Hall",        width: 130 },
    { field: "seat_number",    headerName: "Seat",        width: 80 },
    { field: "published_at",   headerName: "Status",      width: 110,
      renderCell: (p) => p.value
        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Published</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span> },
  ];

  if (loading)
    return <div className="flex justify-center items-center min-h-screen"><InlineLoader text="Loading slip data…" variant="ring" size="lg" /></div>;

  const allocatedCount   = rows.filter((r) => r.center_name !== "Not assigned").length;
  const unallocatedCount = rows.length - allocatedCount;
  const publishedCount   = rows.filter((r) => r.published_at).length;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={() => navigate(`/dashboard/roll-numbers/${advertisementId}/center-allocation`)}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Center Allocation
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg"><Send size={22} className="text-violet-700" /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Roll Slip Generation &amp; Publishing</h1>
                <p className="text-sm text-slate-500">{adTitle}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {published ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-700 text-sm font-medium">
                <CheckCircle2 size={16} /> All Slips Published
              </div>
            ) : (
              <button onClick={handlePublish} disabled={publishing || rows.length === 0}
                className="px-5 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60">
                <Send size={14} /> {publishing ? "Publishing…" : "Publish Admit Cards"}
              </button>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5 flex items-center gap-3">
              <Users size={26} className="text-blue-700" />
              <div><p className="text-xs text-blue-700 font-medium">Eligible Candidates</p><h2 className="text-2xl font-bold text-blue-900">{rows.length}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5 flex items-center gap-3">
              <Building2 size={26} className="text-emerald-700" />
              <div><p className="text-xs text-emerald-700 font-medium">Center Allocated</p><h2 className="text-2xl font-bold text-emerald-900">{allocatedCount}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="p-5 flex items-center gap-3">
              <Hash size={26} className="text-amber-700" />
              <div><p className="text-xs text-amber-700 font-medium">Unallocated</p><h2 className="text-2xl font-bold text-amber-900">{unallocatedCount}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-5 flex items-center gap-3">
              <CheckCircle2 size={26} className="text-violet-700" />
              <div><p className="text-xs text-violet-700 font-medium">Published</p><h2 className="text-2xl font-bold text-violet-900">{publishedCount}</h2></div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER BREAKDOWN */}
        {uniqueCenters.length > 0 && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Candidates per Center</h3>
            <div className="flex flex-wrap gap-3">
              {uniqueCenters.map((c) => {
                const count = rows.filter((r) => r.center_name === c.name).length;
                return (
                  <div key={c.name} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <Building2 size={14} className="text-emerald-700" />
                    <span className="text-sm font-medium text-slate-700">{c.name}</span>
                    <span className="text-xs text-slate-500">({c.city})</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PUBLISH CHECKLIST */}
        {!published && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">Pre-publish checklist</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              {[
                { ok: stats.eligible > 0,       text: `Eligible candidates screened (${stats.eligible ?? 0})` },
                { ok: stats.generated > 0,      text: `Roll numbers generated (${stats.generated ?? 0})` },
                { ok: allocatedCount > 0,        text: `Exam centers assigned (${allocatedCount} allocated)` },
                { ok: unallocatedCount === 0,    text: unallocatedCount === 0 ? "All candidates have center assigned" : `${unallocatedCount} candidates still unassigned` },
              ].map(({ ok, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <span className={ok ? "text-emerald-600" : "text-amber-600"}>{ok ? "✓" : "⚠"}</span> {text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <TextField size="small" placeholder="Search name, CNIC, roll number…"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ width: 280 }} />
          {uniqueCenters.length > 1 && (
            <TextField select size="small" label="Filter by Center"
              value={filterCenter} onChange={(e) => setFilterCenter(e.target.value)} sx={{ width: 220 }}>
              <MenuItem value="">All Centers</MenuItem>
              {uniqueCenters.map((c) => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>)}
            </TextField>
          )}
        </div>

        {/* GRID */}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Eye size={48} className="mb-3 opacity-30" />
            <p className="text-lg font-medium">No eligible candidates with roll numbers yet</p>
            <p className="text-sm mt-1">Complete eligibility screening and generate roll numbers first</p>
            <button onClick={() => navigate("/dashboard/roll-numbers")}
              className="mt-4 px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg text-sm font-medium">
              Go to Roll Number Management
            </button>
          </div>
        ) : (
          <TooltipDataGrid
            rows={filteredRows} columns={columns} getRowId={(r) => r.id}
            paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[25, 50, 100]} autoHeight disableRowSelectionOnClick sx={gridSx}
          />
        )}
      </div>
    </div>
  );
};

export default RollSlipGeneration;
