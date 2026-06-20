import React, { useState, useEffect } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField, IconButton, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Switch, Checkbox,
  FormControlLabel, Divider, Chip,
} from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import { Plus, ArrowLeft, Trash2, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import { localSettingsApi } from 'hooks/useLocalSettings';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { GRID_SX } from 'utils/gridStyles';

const API_BASE = Config.apiUrl;
const getApiHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'X-API-KEY': Config.apiKey,
});

const KEY  = 'groups';
const QKEY = 'qualifications';
const DKEY = 'degrees';

const emptyForm = { name: '', qualification_id: '', degree_ids: [] };

const QualificationGroupsManagement = () => {
  const navigate = useNavigate();

  const [rows,           setRows]           = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [allDegrees,     setAllDegrees]     = useState([]);
  const [filteredDegrees, setFilteredDegrees] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [open,           setOpen]           = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [form,           setForm]           = useState(emptyForm);
  const [search,         setSearch]         = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const load = async () => {
    setLoading(true);
    try {
      // Qualifications and degrees come from the live API
      const [qRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/settings/qualifications`, { headers: getApiHeaders() }),
        fetch(`${API_BASE}/settings/degrees`,        { headers: getApiHeaders() }),
      ]);
      const [qData, dData] = await Promise.all([qRes.json(), dRes.json()]);

      const quals = ((qData.data?.data ?? qData.data ?? []))
        .filter((q) => (q.status ?? 'active') === 'active')
        .map((q) => ({ id: q.hash_id || q.id, name: q.qualification_name || q.name, status: q.status ?? 'active' }));

      const degs = ((dData.data?.data ?? dData.data ?? []))
        .filter((d) => (d.status ?? 'active') === 'active')
        .map((d) => ({
          id:               d.hash_id || d.id,
          name:             d.degree_name || d.name,
          qualification_id: d.degree_group || '',
          status:           d.status ?? 'active',
        }));

      setQualifications(quals);
      setAllDegrees(degs);

      // Groups remain in localStorage (no backend API yet)
      const groups = localSettingsApi.getAll(KEY);
      setRows(groups.map((g, i) => {
        const qual        = quals.find((q) => q.id === g.qualification_id);
        const degsInGroup = degs.filter((d) => g.degree_ids.includes(d.id));
        return {
          ...g,
          sr_no:              i + 1,
          qualification_name: qual?.name ?? '—',
          degree_count:       g.degree_ids.length,
          degree_names:       degsInGroup.map((d) => d.name),
        };
      }));
    } catch {
      toast.error('Failed to load qualification data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  // When qualification changes in form → filter degrees
  useEffect(() => {
    const degs = form.qualification_id
      ? allDegrees.filter((d) => d.qualification_id === form.qualification_id)
      : [];
    setFilteredDegrees(degs);
    // Remove selected degrees that don't belong to new qualification
    setForm((f) => ({
      ...f,
      degree_ids: f.degree_ids.filter((id) => degs.some((d) => d.id === id)),
    }));
  }, [form.qualification_id, allDegrees]); // eslint-disable-line

  const activeCount   = rows.filter((r) => r.status === 'active').length;
  const inactiveCount = rows.filter((r) => r.status === 'inactive').length;

  const filtered = rows.filter((r) =>
    !search.trim() ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.qualification_name?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name, qualification_id: row.qualification_id, degree_ids: [...row.degree_ids] });
    setOpen(true);
  };

  const toggleDegree = (degId) => {
    setForm((f) => ({
      ...f,
      degree_ids: f.degree_ids.includes(degId)
        ? f.degree_ids.filter((id) => id !== degId)
        : [...f.degree_ids, degId],
    }));
  };

  const selectAll = () => {
    const allIds = filteredDegrees.map((d) => d.id);
    const allSelected = allIds.every((id) => form.degree_ids.includes(id));
    setForm((f) => ({
      ...f,
      degree_ids: allSelected ? f.degree_ids.filter((id) => !allIds.includes(id)) : [...new Set([...f.degree_ids, ...allIds])],
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim())          { toast.error('Group name is required'); return; }
    if (!form.qualification_id)     { toast.error('Select a qualification'); return; }
    if (!form.degree_ids.length)    { toast.error('Select at least one degree'); return; }

    const duplicate = rows.find(
      (r) => r.name.toLowerCase() === form.name.trim().toLowerCase() && r.id !== editing?.id
    );
    if (duplicate) { toast.error('Group name already exists'); return; }

    const payload = {
      name:             form.name.trim(),
      qualification_id: form.qualification_id,
      degree_ids:       form.degree_ids,
      status:           editing?.status ?? 'active',
    };

    if (editing) {
      localSettingsApi.update(KEY, { ...editing, ...payload });
      toast.success('Group updated');
    } else {
      localSettingsApi.add(KEY, payload);
      toast.success('Group created');
    }
    setOpen(false);
    load();
  };

  const handleDelete = async (row) => {
    if (!await confirmDelete({ title: 'Delete Group', identifier: row.name })) return;
    localSettingsApi.remove(KEY, row.id);
    toast.success('Deleted');
    load();
  };

  const handleToggle = (row) => {
    localSettingsApi.toggle(KEY, row.id);
    load();
  };

  const allDegIdsSelected = filteredDegrees.length > 0 &&
    filteredDegrees.every((d) => form.degree_ids.includes(d.id));

  const columns = [
    { field: 'sr_no',              headerName: '#',            width: 60 },
    { field: 'name',               headerName: 'Group Name',   flex: 1, minWidth: 160 },
    { field: 'qualification_name', headerName: 'Qualification', width: 220 },
    {
      field: 'degree_names',
      headerName: 'Included Degrees',
      flex: 1.5,
      minWidth: 240,
      renderCell: (p) => (
        <div className="flex flex-wrap gap-1 py-1">
          {(p.value || []).slice(0, 4).map((name) => (
            <Chip key={name} label={name} size="small"
              sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#ecfdf5', color: '#065f46' }} />
          ))}
          {(p.value || []).length > 4 && (
            <Chip label={`+${p.value.length - 4} more`} size="small"
              sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f1f5f9', color: '#475569' }} />
          )}
        </div>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      renderCell: (p) => (
        <div className="flex gap-1">
          <IconButton size="small" onClick={() => openEdit(p.row)} title="Edit">
            <Layers size={15} />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(p.row)} sx={{ color: 'red' }} title="Delete">
            <Trash2 size={15} />
          </IconButton>
        </div>
      ),
    },
  ];

  if (loading) return <InlineLoader text="Loading groups..." variant="ring" size="lg" />;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm p-6">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button onClick={() => navigate('/dashboard/settings')}
              className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
              <ArrowLeft size={14} /> Back to Settings
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Layers size={22} className="text-violet-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Qualification Groups</h1>
                <p className="text-sm text-slate-500">
                  Group qualifications with specific degrees — used in advertisement creation
                </p>
              </div>
            </div>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Group
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5"><p className="text-sm text-blue-700 font-medium">Total Groups</p><h2 className="text-3xl font-bold text-blue-900 mt-1">{rows.length}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5"><p className="text-sm text-emerald-700 font-medium">Active</p><h2 className="text-3xl font-bold text-emerald-900 mt-1">{activeCount}</h2></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
            <CardContent className="p-5"><p className="text-sm text-red-700 font-medium">Inactive</p><h2 className="text-3xl font-bold text-red-900 mt-1">{inactiveCount}</h2></CardContent>
          </Card>
        </div>

        {/* SEARCH */}
        <div className="mb-4">
          <TextField size="small" placeholder="Search groups..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 320 }} />
        </div>

        {/* GRID */}
        <TooltipDataGrid
          rows={filtered} columns={columns} getRowId={(r) => r.id}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50]} autoHeight disableRowSelectionOnClick sx={GRID_SX}
          getRowHeight={() => 'auto'}
        />

        {/* MODAL */}
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle className="font-bold flex items-center gap-2">
            <Layers size={18} className="text-violet-600" />
            {editing ? 'Edit Qualification Group' : 'Add Qualification Group'}
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Group Name */}
            <TextField fullWidth autoFocus label="Group Name" margin="normal" size="small"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Bachelor's Group" />

            {/* Qualification Select */}
            <TextField select fullWidth label="Qualification" margin="normal" size="small"
              value={form.qualification_id}
              onChange={(e) => setForm((f) => ({ ...f, qualification_id: e.target.value, degree_ids: [] }))}
              helperText="Select a qualification — degrees will appear below">
              <MenuItem value="">— Select Qualification —</MenuItem>
              {qualifications.map((q) => (
                <MenuItem key={q.id} value={q.id}>{q.name}</MenuItem>
              ))}
            </TextField>

            {/* Degree checkboxes */}
            {form.qualification_id && (
              <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">
                    Degrees ({filteredDegrees.length} available)
                  </span>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline"
                  >
                    {allDegIdsSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {filteredDegrees.length === 0 ? (
                  <p className="text-slate-400 text-sm p-4 text-center">
                    No degrees found for this qualification. Add degrees in Settings → Degrees.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-0 p-2 max-h-56 overflow-y-auto">
                    {filteredDegrees.map((deg) => (
                      <FormControlLabel
                        key={deg.id}
                        control={
                          <Checkbox
                            checked={form.degree_ids.includes(deg.id)}
                            onChange={() => toggleDegree(deg.id)}
                            size="small"
                            sx={{ color: '#065f46', '&.Mui-checked': { color: '#065f46' } }}
                          />
                        }
                        label={<span className="text-sm text-slate-700">{deg.name}</span>}
                        sx={{ m: 0, px: 1, py: 0.5 }}
                      />
                    ))}
                  </div>
                )}

                {form.degree_ids.length > 0 && (
                  <div className="px-3 py-2 border-t border-slate-100 bg-emerald-50">
                    <span className="text-xs text-emerald-700 font-medium">
                      {form.degree_ids.length} degree{form.degree_ids.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                )}
              </div>
            )}

            {!form.qualification_id && (
              <p className="text-slate-400 text-sm mt-3 text-center py-4 border border-dashed border-slate-200 rounded-lg">
                Select a qualification above to see available degrees
              </p>
            )}
          </DialogContent>

          <DialogActions className="px-4 pb-4 gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit}
              className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white font-medium rounded-lg text-sm">
              {editing ? 'Update Group' : 'Create Group'}
            </button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default QualificationGroupsManagement;
