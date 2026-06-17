import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton, MenuItem,
  Paper, Tab, Tabs, TextField, Tooltip, Typography, Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  ArrowLeft, RefreshCw, Upload, Calculator, Download,
  Edit, CheckCircle, History, Send,
} from 'lucide-react';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import confirmDelete from 'components/ui/ConfirmDelete';

const API_BASE = Config.apiUrl; // local — switch to Config.apiUrl after deploying backend

const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': Config.apiKey,
});

const STATUS_OPTIONS = [
  { value: 'pending',      label: 'Pending',      color: 'default' },
  { value: 'selected',     label: 'Selected',     color: 'success' },
  { value: 'SELECTED',     label: 'Selected',     color: 'success' },
  { value: 'not_selected', label: 'Not Selected', color: 'error' },
  { value: 'NOT SELECTED', label: 'Not Selected', color: 'error' },
  { value: 'provisional',  label: 'Provisional',  color: 'info' },
  { value: 'replacement',  label: 'Replacement',  color: 'warning' },
  { value: 'declined',     label: 'Declined',     color: 'error' },
  { value: 'absent',       label: 'Absent',       color: 'error' },
  { value: 'ABSENT',       label: 'Absent',       color: 'error' },
  { value: 'disqualified', label: 'Disqualified', color: 'error' },
];

const statusColor = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.color ?? 'default';

const emptyMarks = {
  marks_matric: '', marks_inter: '', marks_grad: '', marks_masters: '', marks_bs: '', marks_board_pos: '',
  board_uni_pos: 0, mphil_phd: 0,
  marks_written: '',
  marks_pak_studies: '', marks_islamic: '', marks_current_aff: '',
  status: 'present',
  notes: '',
};

export default function AwardListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [list, setList]           = useState(null);
  const [entries, setEntries]     = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState(0);

  const [marksOpen, setMarksOpen]     = useState(false);
  const [marksEntry, setMarksEntry]   = useState(null);
  const [marksForm, setMarksForm]     = useState(emptyMarks);
  const [marksSaving, setMarksSaving] = useState(false);

  const [statusOpen, setStatusOpen]     = useState(false);
  const [statusEntry, setStatusEntry]   = useState(null);
  const [newStatus, setNewStatus]       = useState('');
  const [statusNote, setStatusNote]     = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const [publishing, setPublishing]       = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [importing, setImporting]         = useState(false);
  const [actionMsg, setActionMsg]         = useState('');
  const [actionSeverity, setActionSeverity] = useState('info');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/award-lists/${id}`, { headers: getHeaders() });
      const data = await res.json();
      const payload = data?.data;
      setList(payload);
      setEntries(payload?.entries ?? []);
      setAuditLogs(payload?.audit_logs ?? []);
    } catch (err) {
      console.error('Failed to fetch award list', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const openMarks = (entry) => {
    setMarksEntry(entry);
    const isAbsent = entry.status === 'absent' || entry.status === 'ABSENT';
    const marks_board_pos = Number(entry.marks_board_pos ?? 0);
    let board_uni_pos = 0;
    let mphil_phd = 0;
    if (marks_board_pos === 1) {
      board_uni_pos = 1;
    } else if (marks_board_pos === 2) {
      mphil_phd = 2;
    } else if (marks_board_pos >= 3) {
      board_uni_pos = 1;
      mphil_phd = 2;
    }
    setMarksForm({
      marks_matric:      entry.marks_matric ?? '',
      marks_inter:       entry.marks_inter ?? '',
      marks_grad:        entry.marks_grad ?? '',
      marks_masters:     entry.marks_masters ?? '',
      marks_bs:          entry.marks_bs ?? '',
      marks_board_pos:   marks_board_pos,
      board_uni_pos:     board_uni_pos,
      mphil_phd:         mphil_phd,
      marks_written:     entry.marks_written ?? '',
      marks_pak_studies: entry.marks_pak_studies ?? '',
      marks_islamic:     entry.marks_islamic ?? '',
      marks_current_aff: entry.marks_current_aff ?? '',
      status:            isAbsent ? 'absent' : 'present',
      notes:             entry.notes ?? '',
    });
    setMarksOpen(true);
  };

  const saveMarks = async () => {
    setMarksSaving(true);
    try {
      const calculatedBoardPos = Number(marksForm.board_uni_pos ?? 0) + Number(marksForm.mphil_phd ?? 0);
      const payload = {
        ...marksForm,
        marks_board_pos: calculatedBoardPos,
        marks_islamic: 0,
        marks_current_aff: 0,
      };
      await fetch(`${API_BASE}/award-lists/entries/${marksEntry.id}/marks`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      setMarksOpen(false);
      fetchDetail();
    } catch (err) {
      console.error('Failed to save marks', err);
    } finally {
      setMarksSaving(false);
    }
  };

  const handleAttendanceChange = (val) => {
    setMarksForm((f) => ({
      ...f,
      status: val,
      marks_pak_studies: val === 'absent' ? 0 : f.marks_pak_studies,
      marks_islamic: val === 'absent' ? 0 : f.marks_islamic,
      marks_current_aff: val === 'absent' ? 0 : f.marks_current_aff,
    }));
  };

  const openStatus = (entry) => {
    setStatusEntry(entry);
    setNewStatus(entry.status ?? 'pending');
    setStatusNote('');
    setStatusOpen(true);
  };

  const saveStatus = async () => {
    setStatusSaving(true);
    try {
      await fetch(`${API_BASE}/award-lists/entries/${statusEntry.id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus, notes: statusNote }),
      });
      setStatusOpen(false);
      fetchDetail();
    } catch (err) {
      console.error('Failed to save status', err);
    } finally {
      setStatusSaving(false);
    }
  };

  const runAction = async (url, method = 'POST', successMsg) => {
    try {
      const res = await fetch(url, { method, headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Request failed');
      setActionMsg(successMsg ?? data?.message ?? 'Done');
      setActionSeverity('success');
      fetchDetail();
    } catch (err) {
      setActionMsg(err.message ?? 'Action failed');
      setActionSeverity('error');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setActionMsg('');
    await runAction(`${API_BASE}/award-lists/${id}/import-from-roll-numbers`);
    setImporting(false);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setActionMsg('');
    await runAction(`${API_BASE}/award-lists/${id}/recalculate-merit`, 'POST', 'Merit positions recalculated.');
    setRecalculating(false);
  };

  const handlePublish = async () => {
    if (!await confirmDelete({
      title: 'Publish Results',
      message: 'Publish results? Candidates will be able to view their status.',
      warning: 'This action will finalize the merit list and make results public.',
      confirmLabel: 'Publish',
      confirmColor: 'bg-emerald-600 hover:bg-emerald-700',
    })) return;
    setPublishing(true);
    setActionMsg('');
    await runAction(`${API_BASE}/award-lists/${id}/publish`, 'POST', 'Results published successfully.');
    setPublishing(false);
  };

  const isMcq = list?.advertisement?.test_type === 1 || list?.advertisement?.test_type === '1';
  const writtenLabel = isMcq ? 'Test (B/45)' : 'Written (B/45)';
  const combinedLabel = isMcq ? 'Acad+Test (70)' : 'Acad+Written (70)';

  const entryColumns = [
    { field: 'merit_position', headerName: 'Rank', width: 60, align: 'center', headerAlign: 'center' },
    { field: 'roll_number', headerName: 'Roll No', width: 90 },
    { field: 'candidate_name', headerName: 'Candidate Name', flex: 1, minWidth: 140 },
    {
      field: 'part_a_total',
      headerName: 'Acad (A/25)',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'marks_written',
      headerName: writtenLabel,
      width: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'academic_written_combined',
      headerName: combinedLabel,
      width: 120,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (params) => {
        const partA = Number(params.row.part_a_total ?? 0);
        const written = Number(params.row.marks_written ?? 0);
        return (partA + written).toFixed(2);
      }
    },
    {
      field: 'part_b_total',
      headerName: 'Interview (C/30)',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'grand_total',
      headerName: 'Grand Total (100)',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={700}>
          {value != null ? Number(value).toFixed(2) : '0.00'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ value }) => {
        const displayLabel = STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value ?? 'Pending';
        return (
          <Chip label={displayLabel} color={statusColor(value)} size="small" />
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit Marks">
            <IconButton size="small" onClick={() => openMarks(row)}>
              <Edit size={15} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Change Status">
            <IconButton size="small" color="primary" onClick={() => openStatus(row)}>
              <CheckCircle size={15} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const auditColumns = [
    {
      field: 'changed_at',
      headerName: 'Time',
      width: 160,
      renderCell: ({ value }) => value ? new Date(value).toLocaleString('en-GB') : '—',
    },
    { field: 'action', headerName: 'Action', width: 180 },
    { field: 'changed_by', headerName: 'By', width: 100 },
    {
      field: 'after',
      headerName: 'Details',
      flex: 1,
      renderCell: ({ value }) =>
        value ? (
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            {JSON.stringify(value)}
          </Typography>
        ) : '—',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!list) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Award list not found.</Alert>
      </Box>
    );
  }

  const isPublished = !!list.published_at;

  return (
    <Box sx={{ p: 3 }}>
      {/* Back + title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/dashboard/award-lists')}>
          <ArrowLeft size={20} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>{list.post_title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {list.department && `${list.department} · `}
            {list.district && `${list.district} · `}
            {list.case_number && `Case: ${list.case_number} · `}
            {list.interview_date &&
              `Interview: ${new Date(list.interview_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          </Typography>
        </Box>
        <Chip
          label={isPublished ? 'Published' : 'Draft'}
          color={isPublished ? 'success' : 'warning'}
          variant={isPublished ? 'filled' : 'outlined'}
        />
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Posts', value: list.total_posts },
          { label: 'Entries', value: entries.length },
          { label: 'Selected', value: entries.filter((e) => e.status === 'selected' || e.status === 'SELECTED').length },
          { label: 'Provisional', value: entries.filter((e) => e.status === 'provisional' || e.status === 'PROVISIONAL').length },
          { label: 'Pending', value: entries.filter((e) => e.status === 'pending' || e.status === 'PENDING').length },
        ].map((s) => (
          <Grid item xs={6} sm={4} md={2} key={s.label}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }} elevation={1}>
              <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Action feedback */}
      {actionMsg && (
        <Alert severity={actionSeverity} onClose={() => setActionMsg('')} sx={{ mb: 2 }}>
          {actionMsg}
        </Alert>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={importing ? <CircularProgress size={14} /> : <Upload size={14} />}
          onClick={handleImport}
          disabled={importing || isPublished}
        >
          Import from Roll Numbers
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={recalculating ? <CircularProgress size={14} /> : <Calculator size={14} />}
          onClick={handleRecalculate}
          disabled={recalculating || isPublished}
        >
          Recalculate Merit
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Download size={14} />}
          onClick={() => window.open(`${API_BASE}/award-lists/${id}/export`, '_blank')}
        >
          Export CSV
        </Button>
        {!isPublished && (
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={publishing ? <CircularProgress size={14} /> : <Send size={14} />}
            onClick={handlePublish}
            disabled={publishing || entries.length === 0}
          >
            Publish Results
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Entries (${entries.length})`} />
        <Tab
          label={`Audit Log (${auditLogs.length})`}
          icon={<History size={14} />}
          iconPosition="start"
        />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ height: 520 }}>
          <DataGrid
            rows={entries}
            columns={entryColumns}
            pageSizeOptions={[15, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            density="compact"
            sx={{ bgcolor: 'background.paper', borderRadius: 2, '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' } }}
          />
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ height: 400 }}>
          <DataGrid
            rows={auditLogs}
            columns={auditColumns}
            pageSizeOptions={[15, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 15 } } }}
            disableRowSelectionOnClick
            density="compact"
            sx={{ bgcolor: 'background.paper', borderRadius: 2, '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' } }}
          />
        </Box>
      )}

      {/* Edit Marks Dialog */}
      <Dialog open={marksOpen} onClose={() => setMarksOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Marks — {marksEntry?.candidate_name}
          <Typography variant="caption" display="block" color="text.secondary">
            Roll No: {marksEntry?.roll_number ?? '—'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Part A — Academic Qualifications & Written (max scaling scores as per AJKPSC rules)
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                { key: 'marks_matric',    label: 'Matric',       max: 2 },
                { key: 'marks_inter',     label: 'Intermediate', max: 3 },
                { key: 'marks_grad',      label: 'Graduation',   max: 4 },
                { key: 'marks_masters',   label: 'Masters',      max: 11 },
                { key: 'marks_bs',        label: 'BS (4 Years)',  max: 15 },
                { key: 'marks_written',   label: 'Written/MCQ',  max: 45 },
              ].map(({ key, label, max }) => (
                <Grid item xs={6} key={key}>
                  <TextField
                    label={`${label} (0–${max})`}
                    type="number"
                    size="small"
                    fullWidth
                    value={marksForm[key]}
                    onChange={(e) => setMarksForm((f) => ({ ...f, [key]: e.target.value }))}
                    inputProps={{ min: 0, max, step: 0.01 }}
                  />
                </Grid>
              ))}
              <Grid item xs={6}>
                <TextField
                  select
                  label="Board / Uni 1st Position"
                  size="small"
                  fullWidth
                  value={marksForm.board_uni_pos}
                  onChange={(e) => setMarksForm((f) => ({ ...f, board_uni_pos: Number(e.target.value) }))}
                >
                  <MenuItem value={0}>None (0)</MenuItem>
                  <MenuItem value={1}>1st Position (1 Mark)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="MPhil / PhD Qualification"
                  size="small"
                  fullWidth
                  value={marksForm.mphil_phd}
                  onChange={(e) => setMarksForm((f) => ({ ...f, mphil_phd: Number(e.target.value) }))}
                >
                  <MenuItem value={0}>None (0)</MenuItem>
                  <MenuItem value={1}>MPhil (1 Mark)</MenuItem>
                  <MenuItem value={2}>PhD (2 Marks)</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Interview Attendance
            </Typography>
            <TextField
              select
              label="Attendance"
              size="small"
              fullWidth
              sx={{ mb: 2 }}
              value={marksForm.status}
              onChange={(e) => handleAttendanceChange(e.target.value)}
            >
              <MenuItem value="present">Present</MenuItem>
              <MenuItem value="absent">Absent</MenuItem>
            </TextField>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Part B — Interview / Viva Voce Marks (max 30)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Interview / Viva Voce Marks (0–30)"
                type="number"
                size="small"
                fullWidth
                disabled={marksForm.status === 'absent'}
                value={marksForm.marks_pak_studies}
                onChange={(e) => setMarksForm((f) => ({ ...f, marks_pak_studies: e.target.value }))}
                inputProps={{ min: 0, max: 30, step: 0.01 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <TextField
              label="Notes"
              multiline
              rows={2}
              size="small"
              fullWidth
              value={marksForm.notes}
              onChange={(e) => setMarksForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMarksOpen(false)} disabled={marksSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveMarks}
            disabled={marksSaving}
            startIcon={marksSaving ? <CircularProgress size={14} /> : <Edit size={14} />}
          >
            Save Marks
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Status — {statusEntry?.candidate_name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            select
            label="Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            fullWidth
            size="small"
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Note (optional)"
            multiline
            rows={2}
            size="small"
            fullWidth
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
          />
          {['declined', 'absent', 'disqualified'].includes(newStatus) && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Next candidate on merit list will automatically be promoted to Replacement.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusOpen(false)} disabled={statusSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveStatus}
            disabled={statusSaving}
            startIcon={statusSaving ? <CircularProgress size={14} /> : <CheckCircle size={14} />}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
