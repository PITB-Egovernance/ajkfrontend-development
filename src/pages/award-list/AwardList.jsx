import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, TextField, MenuItem, Typography, CircularProgress,
  InputAdornment, IconButton, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Plus, Search, X, RefreshCw, ExternalLink, Download, Edit2 } from 'lucide-react';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl; // local — switch to Config.apiUrl after deploying backend

const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': Config.apiKey,
});

const defaultForm = {
  advertisement_id: '',
  post_title: '',
  department: '',
  district: '',
  case_number: '',
  interview_date: '',
  total_posts: '',
};

export default function AwardList() {
  const navigate = useNavigate();

  const [rows, setRows]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(0);
  const [pageSize, setPageSize]   = useState(15);

  const [ads, setAds]             = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm]           = useState(defaultForm);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  // Edit State
  const [editOpen, setEditOpen]           = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [editForm, setEditForm]           = useState(defaultForm);
  const [editSaving, setEditSaving]       = useState(false);
  const [editFormError, setEditFormError] = useState('');

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/advertisements`, { headers: getHeaders() });
      const data = await res.json();
      setAds(data?.data?.data ?? []);
    } catch { /* optional */ }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: pageSize, page: page + 1 });
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/award-lists?${params}`, { headers: getHeaders() });
      const data = await res.json();
      const payload = data?.data;
      setRows(payload?.data ?? []);
      setTotal(payload?.total ?? 0);
    } catch (err) {
      console.error('Failed to fetch award lists', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchAds(); }, [fetchAds]);

  const handleCreate = async () => {
    if (!form.advertisement_id || !form.post_title || !form.total_posts) {
      setFormError('Advertisement, Post Title, and Total Posts are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_BASE}/award-lists/store`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Failed');
      setCreateOpen(false);
      setForm(defaultForm);
      fetchList();
    } catch (err) {
      setFormError(err.message ?? 'Failed to create award list.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (row) => {
    setEditingListId(row.id);
    setEditForm({
      advertisement_id: row.advertisement_id || '',
      post_title: row.post_title || '',
      department: row.department || '',
      district: row.district || '',
      case_number: row.case_number || '',
      interview_date: row.interview_date ? row.interview_date.split('T')[0] : '',
      total_posts: row.total_posts || '',
    });
    setEditFormError('');
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editForm.post_title || !editForm.total_posts) {
      setEditFormError('Post Title and Total Posts are required.');
      return;
    }
    setEditSaving(true);
    setEditFormError('');
    try {
      const res = await fetch(`${API_BASE}/award-lists/${editingListId}/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Failed');
      setEditOpen(false);
      fetchList();
    } catch (err) {
      setEditFormError(err.message ?? 'Failed to update award list.');
    } finally {
      setEditSaving(false);
    }
  };

  const columns = [
    { field: 'id', headerName: '#', width: 60 },
    { field: 'post_title', headerName: 'Post Title', flex: 1.5, minWidth: 180 },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1,
      minWidth: 140,
      renderCell: ({ value }) => value || '—',
    },
    {
      field: 'district',
      headerName: 'District',
      flex: 0.8,
      minWidth: 110,
      renderCell: ({ value }) => value || '—',
    },
    {
      field: 'case_number',
      headerName: 'Case No.',
      width: 110,
      renderCell: ({ value }) => value || '—',
    },
    {
      field: 'interview_date',
      headerName: 'Interview Date',
      width: 130,
      renderCell: ({ value }) =>
        value
          ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
    },
    {
      field: 'total_posts',
      headerName: 'Posts',
      width: 70,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'entries_count',
      headerName: 'Entries',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) => value ?? 0,
    },
    {
      field: 'published_at',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => (
        <Chip
          label={value ? 'Published' : 'Draft'}
          color={value ? 'success' : 'warning'}
          size="small"
          variant={value ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Open Detail">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate(`/dashboard/award-lists/${row.id}`)}
            >
              <ExternalLink size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Header Details">
            <IconButton
              size="small"
              color="secondary"
              onClick={() => handleOpenEdit(row)}
            >
              <Edit2 size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export CSV">
            <IconButton
              size="small"
              onClick={() => window.open(`${API_BASE}/award-lists/${row.id}/export`, '_blank')}
            >
              <Download size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Award Lists</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchList}><RefreshCw size={18} /></IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => { setCreateOpen(true); setFormError(''); }}
          >
            New Award List
          </Button>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search post title, department, case no…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><Search size={16} /></InputAdornment>
            ),
          }}
        />
      </Box>

      {/* DataGrid */}
      <Box sx={{ height: 600, width: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, overflow: 'hidden' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          paginationMode="server"
          rowCount={total}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[15, 30, 50]}
          disableRowSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Box>

      {/* Create Modal */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Award List</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {formError && (
            <Typography color="error" variant="body2">{formError}</Typography>
          )}
          <TextField
            select
            label="Advertisement"
            value={form.advertisement_id}
            onChange={(e) => setForm((f) => ({ ...f, advertisement_id: e.target.value }))}
            required
            fullWidth
            size="small"
          >
            <MenuItem value="">— Select Advertisement —</MenuItem>
            {ads.map((ad, i) => (
              <MenuItem key={ad.hash_id} value={ad.hash_id}>
                {ad.adv_number ? `Adv #${ad.adv_number}` : `Advertisement #${i + 1}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Post Title"
            value={form.post_title}
            onChange={(e) => setForm((f) => ({ ...f, post_title: e.target.value }))}
            required
            fullWidth
            size="small"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Department"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="District"
              value={form.district}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
              fullWidth
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Case Number"
              value={form.case_number}
              onChange={(e) => setForm((f) => ({ ...f, case_number: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Total Posts"
              type="number"
              value={form.total_posts}
              onChange={(e) => setForm((f) => ({ ...f, total_posts: e.target.value }))}
              required
              fullWidth
              size="small"
              inputProps={{ min: 1 }}
            />
          </Box>
          <TextField
            label="Interview Date"
            type="date"
            value={form.interview_date}
            onChange={(e) => setForm((f) => ({ ...f, interview_date: e.target.value }))}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Plus size={16} />}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Details Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Award List Details</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {editFormError && (
            <Typography color="error" variant="body2">{editFormError}</Typography>
          )}
          <TextField
            label="Post Title"
            value={editForm.post_title}
            onChange={(e) => setEditForm((f) => ({ ...f, post_title: e.target.value }))}
            required
            fullWidth
            size="small"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Department"
              value={editForm.department}
              onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="District"
              value={editForm.district}
              onChange={(e) => setEditForm((f) => ({ ...f, district: e.target.value }))}
              fullWidth
              size="small"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Case Number"
              value={editForm.case_number}
              onChange={(e) => setEditForm((f) => ({ ...f, case_number: e.target.value }))}
              fullWidth
              size="small"
            />
            <TextField
              label="Total Posts"
              type="number"
              value={editForm.total_posts}
              onChange={(e) => setEditForm((f) => ({ ...f, total_posts: e.target.value }))}
              required
              fullWidth
              size="small"
              inputProps={{ min: 1 }}
            />
          </Box>
          <TextField
            label="Interview Date"
            type="date"
            value={editForm.interview_date}
            onChange={(e) => setEditForm((f) => ({ ...f, interview_date: e.target.value }))}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={editSaving}
            startIcon={editSaving ? <CircularProgress size={16} /> : null}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
