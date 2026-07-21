import React, { useState, useEffect } from "react";
import TooltipDataGrid from "components/ui/TooltipDataGrid";
import SearchableSelect from "components/ui/SearchableSelect";
import {
  MenuItem, IconButton, Menu, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch,
} from "@mui/material";
import { Card, CardContent } from "components/ui/Card";
import { Plus, ArrowLeft, MoreVertical, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import confirmStatus from "components/ui/confirmStatus";
import { InlineLoader } from "components/ui/Loader";
import { GRID_SX } from "utils/gridStyles";
import { hasPermission } from "utils/permissions";
import RichTextEditor from "components/ui/RichTextEditor";
import Config from "config/baseUrl";
import AuthService from "services/authService";
import AdvancedFilter from "components/tables/AdvancedFilter";

const PERM = "settings.roll_number_slip_instructions";

const API_BASE = Config.apiUrl;
const API_KEY  = Config.apiKey;

const authHeaders = (json = true) => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "X-API-KEY": API_KEY,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

// The two kinds of text that can be authored for the roll-number slip.
const SLIP_TEXT_TYPES = [
  { value: "note",        label: "Roll Number Slip Note" },
  { value: "instruction", label: "Roll Number Slip Instruction" },
];

const STATUSES = [
  { value: "active",   label: "Active",   color: "success" },
  { value: "inactive", label: "Inactive", color: "default" },
];

const labelForType   = (v) => SLIP_TEXT_TYPES.find((t) => t.value === v)?.label || v;
const stripHtml      = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const EMPTY_FORM = {
  slip_text_type: "",
  slip_text:      "",
};

const RollNumberSlipInstructions = () => {
  const navigate = useNavigate();
  const canAdd    = hasPermission(`${PERM}.add`);
  const canEdit   = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);
  const canRowActions = canEdit || canDelete;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ slip_text: "", slip_text_type: "", status: "" });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: "slip_text", label: "Text", type: "text", placeholder: "Search slip text..." },
    { name: "slip_text_type", label: "Slip Text Type", type: "select", options: SLIP_TEXT_TYPES },
    { name: "status", label: "Status", type: "select", options: STATUSES },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ slip_text: "", slip_text_type: "", status: "" });
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  /* ── FETCH ── */
  const fetchInstructions = async () => {
    setLoading(true);
    try {
      const res    = await fetch(`${API_BASE}/settings/roll-number-slip-instructions`, { headers: authHeaders() });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        const data = result.data?.data ?? result.data ?? [];
        setRows(
          (Array.isArray(data) ? data : []).map((item, i) => ({
            id:             item.hash_id ?? item.id,
            hash_id:        item.hash_id ?? item.id,
            sr_no:          i + 1,
            slip_text_type: item.slip_text_type ?? "note",
            slip_text:      item.slip_text ?? item.slip_text ?? item.text ?? "",
            status:         item.status ?? "active",
          }))
        );
      } else {
        toast.error(result.message || "Failed to load slip instructions");
        setRows([]);
      }
    } catch {
      toast.error("Failed to load slip instructions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInstructions(); }, []); // eslint-disable-line

  const total         = rows.length;
  const activeCount   = rows.filter((r) => r.status === "active").length;
  const noteCount     = rows.filter((r) => r.slip_text_type === "note").length;
  const instrCount    = rows.filter((r) => r.slip_text_type === "instruction").length;

  const filtered = rows.filter((r) => {
    if (filters.slip_text.trim() && !stripHtml(r.slip_text).toLowerCase().includes(filters.slip_text.trim().toLowerCase())) return false;
    if (filters.slip_text_type && r.slip_text_type !== filters.slip_text_type) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });

  /* ── MENU ── */
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = () => {
    const r = selectedRow;
    handleMenuClose();
    setEditing(r);
    setForm({
      slip_text_type: r.slip_text_type || "note",
      slip_text:      r.slip_text || r.slip_text || r.text || "",
    });
    setOpen(true);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  /* ── CREATE / UPDATE ── */
  const handleSubmit = async () => {
    if (!form.slip_text_type) { toast.error("Please select the slip text type"); return; }
    if (!stripHtml(form.slip_text)) { toast.error("Please enter the slip text"); return; }

    setSaving(true);
    try {
      const isUpdate = !!editing;
      const payload = {
        slip_text_type: form.slip_text_type,
        slip_text:      form.slip_text,
        status:         isUpdate ? (editing.status || "active") : "active",
      };

      const url = isUpdate
        ? `${API_BASE}/settings/roll-number-slip-instructions/${editing.hash_id}/update`
        : `${API_BASE}/settings/roll-number-slip-instructions/store`;

      const res    = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isUpdate ? "Slip text updated successfully" : "Slip text created successfully");
        setOpen(false);
        setEditing(null);
        fetchInstructions();
      } else {
        toast.error(result.message || (isUpdate ? "Update failed" : "Create failed"));
      }
    } catch {
      toast.error("Operation failed");
    } finally {
      setSaving(false);
    }
  };

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    handleMenuClose();
    if (!await confirmDelete({ title: "Delete Slip Text", identifier: labelForType(selectedRow.slip_text_type) })) return;
    try {
      const res    = await fetch(`${API_BASE}/settings/roll-number-slip-instructions/${selectedRow.hash_id}/delete`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success("Slip text deleted successfully");
        fetchInstructions();
      } else {
        toast.error(result.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ── STATUS TOGGLE (inline, from the list) ── */
  const toggleStatus = async (row) => {
    const next = row.status === "active" ? "inactive" : "active";

    if (!await confirmStatus({ newStatus: next })) return;

    // Optimistic UI: flip immediately, revert on failure.
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));

    try {
      const res = await fetch(
        `${API_BASE}/settings/roll-number-slip-instructions/${row.hash_id}/update`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            slip_text_type: row.slip_text_type,
            slip_text:      row.slip_text,
            status:         next,
          }),
        }
      );
      const result = await res.json();

      if (res.ok || result.success || result.status === 200) {
        toast.success(`Status set to ${next === "active" ? "Active" : "Inactive"}`);
      } else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
        toast.error(result.message || "Failed to update status");
      }
    } catch {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
      toast.error("Failed to update status");
    }
  };

  /* ── COLUMNS ── */
  const columns = [
    { field: "sr_no", headerName: "#", width: 70 },
    {
      field: "slip_text_type", headerName: "Slip Text Type", width: 240,
      renderCell: (p) => labelForType(p.value),
    },
    {
      field: "slip_text", headerName: "Text Preview", flex: 1, minWidth: 260,
      renderCell: (p) => {
        const text = stripHtml(p.value);
        return text
          ? <span className="truncate" title={text}>{text.length > 120 ? `${text.slice(0, 120)}…` : text}</span>
          : <span className="text-slate-400 text-xs">—</span>;
      },
    },
    {
      field: "status", headerName: "Status", width: 130,
      renderCell: (p) => (
        <Switch
          size="small"
          checked={p.value === "active"}
          onChange={() => canEdit && toggleStatus(p.row)}
          disabled={!canEdit}
          color="success"
        />
      ),
    },
    ...(canRowActions ? [{
      field: "actions", headerName: "Actions", width: 75, sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    }] : []),
  ];

  if (loading && rows.length === 0)
    return <InlineLoader text="Loading slip instructions..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: "-webkit-fill-available" }}>

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate("/dashboard/settings")}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ScrollText size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Roll Number Slip Instructions</h1>
                <p className="text-sm text-slate-500">Manage note and instruction text shown on roll number slips</p>
              </div>
            </div>
          </div>
          {canAdd && (
            <button onClick={openAdd}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2 text-sm">
              <Plus size={15} /> Add Slip Text
            </button>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{total}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5"><p className="text-sm text-emerald-700 font-medium">Active</p><h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-5"><p className="text-sm text-violet-700 font-medium">Notes</p><h2 className="text-3xl font-bold text-violet-900 mt-1">{noteCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="p-5"><p className="text-sm text-amber-700 font-medium">Instructions</p><h2 className="text-3xl font-bold text-amber-900 mt-1">{instrCount}</h2></CardContent>
          </Card>
        </div>

        {/* ADVANCED FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Slip Instructions"
        />

        {/* GRID */}
        <TooltipDataGrid
          rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={GRID_SX}
          loading={loading}
        />

        {/* ROW MENU */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {canEdit && <MenuItem onClick={openEdit}>Edit</MenuItem>}
          {canDelete && <MenuItem onClick={handleDelete} sx={{ color: "red" }}>Delete</MenuItem>}
        </Menu>

        {/* ADD / EDIT MODAL */}
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
          <DialogTitle className="font-bold flex items-center gap-2">
            <ScrollText size={18} className="text-emerald-700" />
            {editing ? "Edit Slip Text" : "Add Slip Text"}
          </DialogTitle>

          <DialogContent>
            <div className="mt-1">
              <SearchableSelect
                label="Slip Text Type"
                value={form.slip_text_type}
                onChange={(e) => setField("slip_text_type", e.target.value)}
                options={SLIP_TEXT_TYPES}
                placeholder="— Select Slip Text Type —"
              />
            </div>

            {/* Rich text editor */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">Slip Text</p>
              <RichTextEditor
                value={form.slip_text}
                onChange={(html) => setField("slip_text", html)}
                placeholder="Type the note / instruction text here…"
                minHeight={240}
              />
            </div>
          </DialogContent>

          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default RollNumberSlipInstructions;
