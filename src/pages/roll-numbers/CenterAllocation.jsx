import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Shuffle,
  Save,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
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
  "& .MuiDataGrid-row": { minHeight: "52px !important" },
  "& .MuiDataGrid-checkboxInput svg":             { color: "#064e3b" },
  "& .MuiDataGrid-checkboxInput.Mui-checked svg":  { color: "#064e3b" },
  "& .MuiCheckbox-root .MuiSvgIcon-root":          { color: "#064e3b" },
  "& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root": { color: "#064e3b" },
  "& .MuiDataGrid-row.Mui-selected":       { backgroundColor: "#ecfdf5" },
  "& .MuiDataGrid-row.Mui-selected:hover": { backgroundColor: "#d1fae5" },
};

const CenterAllocation = () => {
  const navigate = useNavigate();
  const { advertisementId } = useParams();

  const [applications,   setApplications]   = useState([]);
  const [centers,        setCenters]        = useState([]);
  const [halls,          setHalls]          = useState({});
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [adTitle,        setAdTitle]        = useState("");
  const [searchTerm,     setSearchTerm]     = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const [autoAllocModal,  setAutoAllocModal]  = useState(false);
  const [selectedCenters, setSelectedCenters] = useState([]);

  const [manualModal,     setManualModal]     = useState(false);
  const [manualTarget,    setManualTarget]    = useState(null);
  const [manualForm,      setManualForm]      = useState({ exam_center_id: "", exam_hall_id: "", seat_number: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, centerRes] = await Promise.all([
        fetch(`${API_BASE}/roll-numbers/${advertisementId}/applications?per_page=500`, { headers: getHeaders() }),
        fetch(`${API_BASE}/settings/exam-centers?per_page=500`, { headers: getHeaders() }),
      ]);
      const [appResult, centerResult] = await Promise.all([appRes.json(), centerRes.json()]);

      if (appResult.success || appResult.status === 200) {
        const ad = appResult.data?.advertisement;
        setAdTitle(
          ad?.adv_number ? `Adv #${ad.adv_number}` : `Advertisement #${advertisementId}`
        );
        const apps = appResult.data?.applications?.data ?? [];
        setApplications(apps.filter((a) => a.roll_number?.eligibility_status === "eligible" && a.roll_number?.roll_number));
      }

      if (centerResult.success || centerResult.status === 200) {
        setCenters(centerResult.data?.data ?? centerResult.data ?? []);
      }
    } catch { toast.error("Server error"); }
    finally { setLoading(false); }
  };

  const fetchHallsForCenter = async (centerId) => {
    if (halls[centerId]) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/exam-halls/by-center/${centerId}`, { headers: getHeaders() });
      const result = await res.json();
      if (result.success || result.status === 200) {
        setHalls((prev) => ({ ...prev, [centerId]: result.data ?? [] }));
      }
    } catch {}
  };

  useEffect(() => { fetchData(); }, [advertisementId]); // eslint-disable-line

  useEffect(() => {
    if (manualForm.exam_center_id) fetchHallsForCenter(manualForm.exam_center_id);
  }, [manualForm.exam_center_id]); // eslint-disable-line

  const rows = applications.map((app, i) => ({
    id:           app.id,
    sr_no:        i + 1,
    roll_number:  app.roll_number?.roll_number ?? "—",
    candidate_name: app.candidate_name,
    candidate_cnic: app.candidate_cnic,
    center_name:  app.roll_number?.exam_center?.name ?? null,
    hall_name:    app.roll_number?.exam_hall?.name ?? null,
    seat_number:  app.roll_number?.seat_number ?? null,
    roll_id:      app.roll_number?.id ?? null,
    exam_center_id: app.roll_number?.exam_center_id ?? null,
    exam_hall_id:   app.roll_number?.exam_hall_id ?? null,
  }));

  const filteredRows = searchTerm.trim()
    ? rows.filter((r) => [r.candidate_name, r.candidate_cnic, r.roll_number].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase())))
    : rows;

  const allocated   = rows.filter((r) => r.center_name).length;
  const unallocated = rows.length - allocated;

  const runAutoAllocate = async () => {
    if (!selectedCenters.length) { toast.error("Select at least one exam center"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roll-numbers/${advertisementId}/allocate`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({ center_ids: selectedCenters.map(Number) }),
      });
      const r = await res.json();
      if (r.success || r.status === 200) {
        toast.success(r.message || "Allocation complete");
        setAutoAllocModal(false);
        setSelectedCenters([]);
        fetchData();
      } else toast.error(r.message || "Failed");
    } catch { toast.error("Server error"); }
    finally { setSaving(false); }
  };

  const openManualModal = (row) => {
    setManualTarget(row);
    setManualForm({
      exam_center_id: String(row.exam_center_id ?? ""),
      exam_hall_id:   String(row.exam_hall_id ?? ""),
      seat_number:    row.seat_number ?? "",
    });
    setManualModal(true);
  };

  const saveManual = async () => {
    if (!manualForm.exam_center_id) { toast.error("Select an exam center"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/roll-numbers/adjust/${manualTarget.roll_id}`, {
        method: "PUT", headers: getHeaders(),
        body: JSON.stringify({
          exam_center_id: Number(manualForm.exam_center_id),
          exam_hall_id:   manualForm.exam_hall_id ? Number(manualForm.exam_hall_id) : null,
          seat_number:    manualForm.seat_number || null,
        }),
      });
      const r = await res.json();
      if (r.success || r.status === 200) {
        toast.success("Assignment updated");
        setManualModal(false);
        fetchData();
      } else toast.error(r.message || "Failed");
    } catch { toast.error("Server error"); }
    finally { setSaving(false); }
  };

  const columns = [
    { field: "sr_no",         headerName: "#",           width: 60 },
    { field: "roll_number",   headerName: "Roll No.",    width: 150,
      renderCell: (p) => <span className="font-mono font-bold text-indigo-700">{p.value}</span> },
    { field: "candidate_name", headerName: "Name",       flex: 1, minWidth: 160 },
    { field: "candidate_cnic", headerName: "CNIC",       width: 150 },
    { field: "center_name",   headerName: "Exam Center", width: 200,
      renderCell: (p) => p.value
        ? <span className="text-emerald-700 font-medium">{p.value}</span>
        : <span className="text-amber-600 text-xs font-medium">Not assigned</span> },
    { field: "hall_name",     headerName: "Hall",        width: 140,
      renderCell: (p) => p.value ?? <span className="text-slate-400 text-xs">—</span> },
    { field: "seat_number",   headerName: "Seat",        width: 90,
      renderCell: (p) => p.value ?? <span className="text-slate-400 text-xs">—</span> },
    { field: "actions",       headerName: "Adjust",      width: 90, sortable: false,
      renderCell: (p) => (
        <button onClick={() => openManualModal(p.row)} disabled={!p.row.roll_id}
          className="px-2 py-1 text-xs border border-slate-300 text-slate-700 rounded hover:bg-slate-50 disabled:opacity-40">
          Adjust
        </button>
      )},
  ];

  if (loading)
    return <div className="flex justify-center items-center min-h-screen"><InlineLoader text="Loading candidates…" variant="ring" size="lg" /></div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={() => navigate("/dashboard/roll-numbers")}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Roll Numbers
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><MapPin size={22} className="text-emerald-700" /></div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Center Allocation</h1>
                <p className="text-sm text-slate-500">{adTitle}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAutoAllocModal(true)}
              className="px-4 py-2 border border-emerald-700 text-emerald-800 hover:bg-emerald-50 rounded-lg text-sm font-medium flex items-center gap-2">
              <Shuffle size={14} /> Auto-Allocate
            </button>
            <button onClick={() => navigate(`/dashboard/roll-numbers/${advertisementId}/slip-generation`)}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              Slip Generation <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">Eligible Candidates</p>
            <h2 className="text-2xl font-bold text-blue-900">{rows.length}</h2>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-700 font-medium">Allocated</p>
            <h2 className="text-2xl font-bold text-emerald-900">{allocated}</h2>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700 font-medium">Unallocated</p>
            <h2 className="text-2xl font-bold text-amber-900">{unallocated}</h2>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-4">
          <TextField size="small" placeholder="Search name, CNIC, roll number…"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ width: 320 }} />
        </div>

        {/* GRID */}
        <DataGrid
          rows={filteredRows} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[25, 50, 100]} autoHeight disableRowSelectionOnClick sx={gridSx}
        />

        {/* AUTO-ALLOCATE MODAL */}
        <Dialog open={autoAllocModal} onClose={() => setAutoAllocModal(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold">Auto-Allocate Exam Centers</DialogTitle>
          <DialogContent>
            <p className="text-sm text-slate-600 mb-4">
              Select one or more exam centers. Candidates will be distributed evenly across the selected centers in roll number order.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {centers.filter((c) => c.status === "active" || !c.status).map((center) => (
                <FormControlLabel
                  key={center.id || center.hash_id}
                  control={
                    <Checkbox
                      checked={selectedCenters.includes(String(center.id))}
                      onChange={(e) => {
                        const id = String(center.id);
                        setSelectedCenters((prev) => e.target.checked ? [...prev, id] : prev.filter((x) => x !== id));
                      }}
                      size="small"
                      sx={{ color: "#064e3b", "&.Mui-checked": { color: "#064e3b" } }}
                    />
                  }
                  label={
                    <span className="text-sm text-slate-700">
                      {center.name} <span className="text-slate-400">— {center.city} (cap: {Number(center.capacity).toLocaleString()})</span>
                    </span>
                  }
                />
              ))}
            </div>
            {selectedCenters.length > 0 && (
              <p className="text-sm text-emerald-700 mt-3 font-medium">
                {selectedCenters.length} center(s) selected — ~{Math.ceil(rows.length / selectedCenters.length)} candidates each
              </p>
            )}
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setAutoAllocModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm">Cancel</button>
            <button onClick={runAutoAllocate} disabled={saving || !selectedCenters.length}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg text-sm disabled:opacity-60 flex items-center gap-2">
              <Shuffle size={13} /> {saving ? "Allocating…" : "Run Allocation"}
            </button>
          </DialogActions>
        </Dialog>

        {/* MANUAL ADJUST MODAL */}
        <Dialog open={manualModal} onClose={() => setManualModal(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold">
            Adjust Assignment — <span className="text-indigo-700">{manualTarget?.roll_number}</span>
          </DialogTitle>
          <DialogContent>
            <p className="text-sm text-slate-600 mb-2">{manualTarget?.candidate_name}</p>
            <TextField select fullWidth label="Exam Center" margin="normal" size="small"
              value={manualForm.exam_center_id}
              onChange={(e) => setManualForm((p) => ({ ...p, exam_center_id: e.target.value, exam_hall_id: "" }))}>
              <MenuItem value=""><em>Select center</em></MenuItem>
              {centers.map((c) => (
                <MenuItem key={c.id || c.hash_id} value={String(c.id)}>{c.name} — {c.city}</MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth label="Hall (optional)" margin="normal" size="small"
              value={manualForm.exam_hall_id}
              onChange={(e) => setManualForm((p) => ({ ...p, exam_hall_id: e.target.value }))}
              disabled={!manualForm.exam_center_id}>
              <MenuItem value="">No specific hall</MenuItem>
              {(halls[manualForm.exam_center_id] ?? []).map((h) => (
                <MenuItem key={h.id} value={String(h.id)}>{h.name}{h.floor ? ` (${h.floor})` : ""}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="Seat Number (optional)" margin="normal" size="small"
              value={manualForm.seat_number}
              onChange={(e) => setManualForm((p) => ({ ...p, seat_number: e.target.value }))}
              placeholder="e.g. A-12" />
          </DialogContent>
          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setManualModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm">Cancel</button>
            <button onClick={saveManual} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg text-sm disabled:opacity-60 flex items-center gap-2">
              <Save size={13} /> {saving ? "Saving…" : "Save Assignment"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default CenterAllocation;
