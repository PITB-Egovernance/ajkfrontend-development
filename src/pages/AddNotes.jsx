import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField, IconButton, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, MoreVertical, BookOpenText } from 'lucide-react';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { InlineLoader } from 'components/ui/Loader';
import { GRID_SX } from 'utils/gridStyles';

const API_BASE = Config.apiUrl;

const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': Config.apiKey,
});

const TermsConditions = () => {
  const navigate = useNavigate();

  /* ── raw data from API ──────────────────────── */
  const [importantNotes, setImportantNotes] = useState('');
  const [rawTerms, setRawTerms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ important_note: '', terms_conditions: '' });

  const filterConfig = [
    { name: 'important_note', label: 'Important Note', type: 'text', placeholder: 'Filter by important note' },
    { name: 'terms_conditions', label: 'Terms & Conditions', type: 'text', placeholder: 'Filter by terms' },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ important_note: '', terms_conditions: '' });
  };
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  /* ── context menu ───────────────────────────── */
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  /* ── add/edit dialog ────────────────────────── */
  const [openModal, setOpenModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [termInput, setTermInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleMenuOpen = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  /* ── build rows: each term is a row, important_note shown alongside ── */
  const buildRows = () => {
    return rawTerms.map((t, i) => ({
      id: `term_${i}`,
      important_note: importantNotes,
      terms_conditions: t,
    }));
  };

  /* ── Fetch ──────────────────────────────────── */
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/advertisements/approved-requisitions`, { headers: getHeaders() });
      const result = await res.json();
      if (res.ok && result.success) {
        const payload = result.data || result;
        const notes = payload.notes || payload;
        setImportantNotes(notes.important_notes || '');
        const terms = notes.terms_conditions;
        setRawTerms(Array.isArray(terms) && terms.length > 0 ? terms : []);
      } else {
        toast.error(result.message || 'Failed to load data');
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, []);

  /* ── Save helper ─────────────────────────────── */
  const saveToServer = async (newNotes, newTerms) => {
    const filtered = newTerms.filter((t) => t.trim().length > 0);
    if (!newNotes.trim() || filtered.length === 0) {
      toast.error('Important notes and at least one term are required');
      return false;
    }
    try {
      const res = await fetch(`${API_BASE}/advertisements/notes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          important_notes: newNotes.trim(),
          terms_conditions: filtered,
        }),
      });
      const result = await res.json();
      return res.ok && result.success;
    } catch { return false; }
  };

  /* ── Open Add dialog ────────────────────────── */
  const openAdd = () => {
    setEditingRow(null);
    setNoteInput(importantNotes || '');
    setTermInput('');
    setOpenModal(true);
  };

  /* ── Open Edit dialog ───────────────────────── */
  const openEdit = (row) => {
    setEditingRow(row);
    setNoteInput(importantNotes || '');
    setTermInput(row.terms_conditions || '');
    setOpenModal(true);
    handleMenuClose();
  };

  /* ── Submit Add / Edit ──────────────────────── */
  const handleSubmit = async () => {
    if (!noteInput.trim()) { toast.error('Important Notes is required'); return; }

    setSaving(true);
    try {
      let newNotes = noteInput.trim();
      let newTerms = [...rawTerms];

      if (!editingRow) {
        /* ── ADD mode: add the new term, keep existing ── */
        if (termInput.trim()) {
          newTerms.push(termInput.trim());
        }
      } else {
        /* ── EDIT mode ─────────────────────────── */
        const idx = parseInt(editingRow.id.split('_')[1], 10);
        if (termInput.trim()) {
          newTerms[idx] = termInput.trim();
        }
      }

      // if no term was added/edited and we had none before, fail
      if (newTerms.filter((t) => t.trim()).length === 0) {
        toast.error('At least one term is required');
        setSaving(false);
        return;
      }

      const ok = await saveToServer(newNotes, newTerms);
      if (ok) {
        toast.success(editingRow ? 'Updated successfully' : 'Added successfully');
        setOpenModal(false);
        fetchNotes();
      } else {
        toast.error('Failed to save');
      }
    } catch { toast.error('Server error'); }
    finally { setSaving(false); }
  };

  /* ── Delete ──────────────────────────────────── */
  const handleDelete = async () => {
    if (!selectedRow) return;
    const row = selectedRow;
    handleMenuClose();

    if (!(await confirmDelete({
      title: 'Delete Terms & Conditions',
      identifier: row.terms_conditions.substring(0, 60) + (row.terms_conditions.length > 60 ? '…' : ''),
    }))) return;

    try {
      const idx = parseInt(row.id.split('_')[1], 10);
      const newTerms = [...rawTerms];
      newTerms.splice(idx, 1);
      if (newTerms.length === 0) {
        toast.error('At least one term is required');
        return;
      }

      const ok = await saveToServer(importantNotes, newTerms);
      if (ok) {
        toast.success('Terms & Conditions deleted');
        fetchNotes();
      } else {
        toast.error('Failed to delete');
      }
    } catch { toast.error('Server error'); }
  };

  /* ── Filter + columns ───────────────────────── */
  const allRows = buildRows();
  const filteredRows = allRows.filter((r) => {
    // basic search
    const q = search.toLowerCase();
    const searchMatch = !q ||
      r.important_note?.toLowerCase().includes(q) ||
      r.terms_conditions?.toLowerCase().includes(q);
    if (!searchMatch) return false;
    // advanced filters
    if (filters.important_note && !r.important_note?.toLowerCase().includes(filters.important_note.toLowerCase())) return false;
    if (filters.terms_conditions && !r.terms_conditions?.toLowerCase().includes(filters.terms_conditions.toLowerCase())) return false;
    return true;
  });

  const columns = [
    {
      field: 'important_note', headerName: 'Important Note', flex: 1, minWidth: 250,
      renderCell: (p) => (
        <span className="text-sm text-slate-700 line-clamp-2">{p.value || <span className="text-slate-400 italic">—</span>}</span>
      ),
    },
    {
      field: 'terms_conditions', headerName: 'Terms & Conditions', flex: 1, minWidth: 250,
      renderCell: (p) => (
        <span className="text-sm text-slate-700 line-clamp-2">{p.value}</span>
      ),
    },
    {
      field: 'actions', headerName: 'Actions', width: 80, sortable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  if (loading) return <InlineLoader text="Loading terms & conditions..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button onClick={() => navigate('/dashboard/settings')}
              className="text-sm text-gray-600 flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <BookOpenText size={22} className="text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Terms & Conditions</h1>
                <p className="text-sm text-slate-500">Manage advertisement notes and terms</p>
              </div>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
            <Plus size={15} /> Add
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="p-6">
              <p className="text-sm text-amber-700 font-medium">Important Note</p>
              <h2 className="text-3xl font-bold text-amber-900 mt-2">{importantNotes ? 1 : 0}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-6">
              <p className="text-sm text-emerald-700 font-medium">Terms & Conditions</p>
              <h2 className="text-3xl font-bold text-emerald-900 mt-2">{rawTerms.length}</h2>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filter */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Notes & Terms"
        />

        {/* Unified Table */}
        <TooltipDataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 15, page: 0 } } }}
          autoHeight
          disableRowSelectionOnClick
          sx={GRID_SX}
        />

        {/* Context Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => openEdit(selectedRow)}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'red' }}>Delete</MenuItem>
        </Menu>

        {/* Add / Edit Dialog — two fields side by side */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
          <DialogTitle className="font-bold">
            {editingRow ? 'Edit' : 'Add'} Notes & Terms
          </DialogTitle>
          <DialogContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* Left — Important Notes */}
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1">Important Note</p>
                <TextField
                  fullWidth multiline rows={8} size="small"
                  label="Important Note"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Enter important notes..."
                />
              </div>
              {/* Right — Terms & Conditions */}
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-1">Terms & Conditions</p>
                <TextField
                  fullWidth multiline rows={8} size="small"
                  label={editingRow ? 'Edit Terms & Conditions' : 'New Terms & Conditions'}
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  placeholder={editingRow
                    ? 'Update term text...'
                    : 'Enter new term...'}
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <button onClick={() => setOpenModal(false)} disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg text-sm disabled:opacity-60">
              {saving ? 'Saving…' : editingRow ? 'Update' : 'Save'}
            </button>
          </DialogActions>
        </Dialog>

      </div>
    </div>
  );
};

export default TermsConditions;
