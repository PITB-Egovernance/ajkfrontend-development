import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton,
  Paper, Tab, Tabs, TextField, Tooltip, Typography, Alert,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import SearchableSelect from 'components/ui/SearchableSelect';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  ArrowLeft, RefreshCw, Upload, Calculator, Download,
  Edit, CheckCircle, History, Send, X
} from 'lucide-react';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import confirmDelete from 'components/ui/ConfirmDelete';
import { formatDate } from 'utils/dateUtils';
import { toast } from 'react-hot-toast';
import CSVUploadZone from 'components/results/CSVUploadZone';

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

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return;
    setBulkSaving(true);
    try {
      const res = await fetch(`${API_BASE}/award-lists/${id}/bulk-status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Bulk update failed');
      toast.success(data?.message ?? `Updated ${selectedIds.length} candidates status successfully.`);
      setSelectedIds([]); // clear selection
      fetchDetail();
    } catch (err) {
      toast.error(err.message ?? 'Failed to perform bulk status update');
    } finally {
      setBulkSaving(false);
    }
  };

  const [openMeritEntries, setOpenMeritEntries] = useState([]);
  const [openMeritLoading, setOpenMeritLoading] = useState(false);

  const [categoryMeritEntries, setCategoryMeritEntries] = useState([]);
  const [categoryMeritLoading, setCategoryMeritLoading] = useState(false);
  const [categoryType, setCategoryType] = useState('district');
  const [categoryValue, setCategoryValue] = useState('all');

  const fetchOpenMerit = async () => {
    setOpenMeritLoading(true);
    try {
      const res = await fetch(`${API_BASE}/award-lists/${id}/open-merit`, { headers: getHeaders() });
      const data = await res.json();
      setOpenMeritEntries(data?.data ?? []);
    } catch (err) {
      toast.error('Failed to fetch open merit list');
    } finally {
      setOpenMeritLoading(false);
    }
  };

  const fetchCategoryMerit = async (type = categoryType, val = categoryValue) => {
    setCategoryMeritLoading(true);
    try {
      const res = await fetch(`${API_BASE}/award-lists/${id}/category-merit?category=${type}&value=${val}`, { headers: getHeaders() });
      const data = await res.json();
      setCategoryMeritEntries(data?.data ?? []);
    } catch (err) {
      toast.error('Failed to fetch category merit list');
    } finally {
      setCategoryMeritLoading(false);
    }
  };

  const handleDownloadOpenMeritPDF = async () => {
    try {
      toast.loading('Generating Open Merit PDF...', { id: 'pdf-export' });
      const res = await fetch(`${API_BASE}/award-lists/${id}/open-merit?export=pdf`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `open_merit_list_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Open Merit PDF downloaded successfully!', { id: 'pdf-export' });
    } catch (err) {
      toast.error('Failed to download Open Merit PDF', { id: 'pdf-export' });
    }
  };

  const handleDownloadCategoryMeritPDF = async () => {
    try {
      toast.loading('Generating Category Merit PDF...', { id: 'pdf-export' });
      const res = await fetch(`${API_BASE}/award-lists/${id}/category-merit?category=${categoryType}&value=${categoryValue}&export=pdf`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `category_merit_${categoryType}_${categoryValue}_list_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Category Merit PDF downloaded successfully!', { id: 'pdf-export' });
    } catch (err) {
      toast.error('Failed to download Category Merit PDF', { id: 'pdf-export' });
    }
  };

  const handleImportSubmit = async (fileToUpload) => {
    const file = fileToUpload || selectedUploadFile;
    if (!file) {
      toast.error('Please select a file to upload first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setCsvLoading(true);
    try {
      const res = await fetch(`${API_BASE}/award-lists/${id}/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        const importData = data?.data || {};
        const errorsList = importData.errors || [];
        const updatedCount = importData.updated || 0;

        if (errorsList.length > 0) {
          toast.error(
            <div>
              <strong>Import completed with {errorsList.length} errors:</strong>
              <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                {errorsList.slice(0, 5).map((err, idx) => <li key={idx}>{err}</li>)}
                {errorsList.length > 5 && <li>...and {errorsList.length - 5} more</li>}
              </ul>
            </div>,
            { duration: 6000 }
          );
        } else {
          toast.success(data?.message || 'CSV imported successfully!');
        }
        setImportModalOpen(false);
        setSelectedUploadFile(null);
        fetchDetail();
      } else {
        toast.error(data?.message || 'Import failed');
      }
    } catch (err) {
      toast.error('Failed to import CSV file');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.loading('Exporting template...', { id: 'csv-export' });
      const res = await fetch(`${API_BASE}/award-lists/${id}/export`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to export template');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `award_list_${id}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template exported successfully!', { id: 'csv-export' });
    } catch (err) {
      toast.error('Failed to export template', { id: 'csv-export' });
    }
  };

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
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (tab === 1) {
      fetchOpenMerit();
    } else if (tab === 2) {
      fetchCategoryMerit(categoryType, categoryValue);
    }
  }, [tab, id, categoryType, categoryValue]);

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

  const getAcademicDetail = (row, field) => {
    try {
      const notesDecoded = JSON.parse(row.notes || '{}');
      return notesDecoded[field] ?? '—';
    } catch (e) {
      return '—';
    }
  };

  const entryColumns = [
    { field: 'merit_position', headerName: 'Rank', width: 60, align: 'center', headerAlign: 'center' },
    { field: 'roll_number', headerName: 'Roll No', width: 90 },
    { field: 'candidate_name', headerName: 'Candidate Name', flex: 1.2, minWidth: 150 },
    {
      field: 'matric_obt_tot',
      headerName: 'Matric',
      width: 100,
      valueGetter: (params) => {
        const obt = getAcademicDetail(params.row, 'matric_obt');
        const tot = getAcademicDetail(params.row, 'matric_tot');
        return obt !== '—' ? `${obt} / ${tot}` : '—';
      }
    },
    {
      field: 'inter_obt_tot',
      headerName: 'F.A/F.SC',
      width: 100,
      valueGetter: (params) => {
        const obt = getAcademicDetail(params.row, 'inter_obt');
        const tot = getAcademicDetail(params.row, 'inter_tot');
        return obt !== '—' ? `${obt} / ${tot}` : '—';
      }
    },
    {
      field: 'grad_obt_tot',
      headerName: "Bachelor's",
      width: 110,
      valueGetter: (params) => {
        const obt = getAcademicDetail(params.row, 'grad_obt');
        const tot = getAcademicDetail(params.row, 'grad_tot');
        return obt !== '—' ? `${obt} / ${tot}` : '—';
      }
    },
    {
      field: 'marks_matric',
      headerName: 'Matric %',
      width: 90,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => {
        const obt = Number(getAcademicDetail(row, 'matric_obt'));
        const tot = Number(getAcademicDetail(row, 'matric_tot'));
        return tot > 0 ? ((obt / tot) * 100).toFixed(2) + '%' : '—';
      }
    },
    {
      field: 'marks_inter',
      headerName: 'F.A/F.SC %',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => {
        const obt = Number(getAcademicDetail(row, 'inter_obt'));
        const tot = Number(getAcademicDetail(row, 'inter_tot'));
        return tot > 0 ? ((obt / tot) * 100).toFixed(2) + '%' : '—';
      }
    },
    {
      field: 'marks_grad',
      headerName: "Bachelor's %",
      width: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => {
        const obt = Number(getAcademicDetail(row, 'grad_obt'));
        const tot = Number(getAcademicDetail(row, 'grad_tot'));
        return tot > 0 ? ((obt / tot) * 100).toFixed(2) + '%' : '—';
      }
    },
    {
      field: 'marks_written',
      headerName: (list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq') ? 'MCQ Test (A) [70 Marks]' : 'Written Marks (A)',
      width: 170,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (params) => {
        const val = Number(params.row.marks_written ?? 0);
        const isMcq = list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq';
        if (isMcq && val > 70.0) {
          const maxRaw = Number(list?.test_total_marks ?? 100);
          return (val / maxRaw) * 70.0;
        }
        return val;
      },
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'marks_pak_studies',
      headerName: (list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq') ? 'Viva Voce (B) [30 Marks]' : 'Viva Voce (B)',
      width: 170,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'grand_total',
      headerName: 'Grand Total (A+B)',
      width: 140,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (params) => {
        const rawWritten = Number(params.row.marks_written ?? 0);
        const isMcq = list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq';
        const maxRaw = Number(list?.test_total_marks ?? 100);
        const written = (isMcq && rawWritten > 70.0) ? ((rawWritten / maxRaw) * 70.0) : rawWritten;
        const viva = Number(params.row.marks_pak_studies ?? 0);
        return written + viva;
      },
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={700}>
          {value != null ? Number(value).toFixed(2) : '0.00'}
        </Typography>
      ),
    },
    {
      field: 'remarks',
      headerName: 'Remarks',
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => {
        const notesStr = params.row.notes;
        if (!notesStr) return '—';
        try {
          const decoded = JSON.parse(notesStr);
          if (decoded && typeof decoded === 'object') {
            return decoded.remarks || '';
          }
          return notesStr;
        } catch (e) {
          return notesStr;
        }
      }
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
  ];

  const openMeritColumns = [
    { field: 'merit_position', headerName: 'Rank', width: 70, align: 'center', headerAlign: 'center' },
    { field: 'roll_number', headerName: 'Roll No', width: 110 },
    { field: 'candidate_name', headerName: 'Candidate Name', flex: 1.5, minWidth: 200 },
    {
      field: 'marks_written',
      headerName: (list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq') ? 'MCQ Test (A) [70 Marks]' : 'Written Marks (A)',
      width: 170,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (params) => {
        const val = Number(params.row.marks_written ?? 0);
        const isMcq = list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq';
        if (isMcq && val > 70.0) {
          const maxRaw = Number(list?.test_total_marks ?? 100);
          return (val / maxRaw) * 70.0;
        }
        return val;
      },
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'marks_pak_studies',
      headerName: (list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq') ? 'Viva Voce (B) [30 Marks]' : 'Viva Voce (B)',
      width: 170,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'grand_total',
      headerName: 'Grand Total (A+B)',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (params) => {
        const rawWritten = Number(params.row.marks_written ?? 0);
        const isMcq = list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq';
        const maxRaw = Number(list?.test_total_marks ?? 100);
        const written = (isMcq && rawWritten > 70.0) ? ((rawWritten / maxRaw) * 70.0) : rawWritten;
        const viva = Number(params.row.marks_pak_studies ?? 0);
        return written + viva;
      },
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={700}>
          {value != null ? Number(value).toFixed(2) : '0.00'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: ({ value }) => {
        const displayLabel = STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value ?? 'Pending';
        return (
          <Chip label={displayLabel} color={statusColor(value)} size="small" />
        );
      },
    },
  ];

  const categoryMeritColumns = [
    { field: 'category_rank', headerName: 'Quota Rank', width: 100, align: 'center', headerAlign: 'center' },
    { field: 'merit_position', headerName: 'Open Rank', width: 100, align: 'center', headerAlign: 'center' },
    { field: 'category_value', headerName: 'Quota', width: 120, align: 'center', headerAlign: 'center' },
    { field: 'roll_number', headerName: 'Roll No', width: 110 },
    { field: 'candidate_name', headerName: 'Candidate Name', flex: 1.5, minWidth: 200 },
    {
      field: 'marks_written',
      headerName: (list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq') ? 'MCQ Test (A) [70 Marks]' : 'Written Marks (A)',
      width: 170,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (params) => {
        const val = Number(params.row.marks_written ?? 0);
        const isMcq = list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq';
        if (isMcq && val > 70.0) {
          const maxRaw = Number(list?.test_total_marks ?? 100);
          return (val / maxRaw) * 70.0;
        }
        return val;
      },
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'marks_pak_studies',
      headerName: (list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq') ? 'Viva Voce (B) [30 Marks]' : 'Viva Voce (B)',
      width: 170,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value }) => value != null ? Number(value).toFixed(2) : '0.00',
    },
    {
      field: 'grand_total',
      headerName: 'Grand Total (A+B)',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (params) => {
        const rawWritten = Number(params.row.marks_written ?? 0);
        const isMcq = list?.test_type_slug === 'one-paper-mcq' || list?.test_type_slug === 'two-paper-mcq';
        const maxRaw = Number(list?.test_total_marks ?? 100);
        const written = (isMcq && rawWritten > 70.0) ? ((rawWritten / maxRaw) * 70.0) : rawWritten;
        const viva = Number(params.row.marks_pak_studies ?? 0);
        return written + viva;
      },
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={700}>
          {value != null ? Number(value).toFixed(2) : '0.00'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: ({ value }) => {
        const displayLabel = STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value ?? 'Pending';
        return (
          <Chip label={displayLabel} color={statusColor(value)} size="small" />
        );
      },
    },
  ];

  const auditColumns = [
    {
      field: 'changed_at',
      headerName: 'Time',
      width: 160,
      renderCell: ({ value }) => value ? formatDate(value) : '—',
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
              `Interview: ${formatDate(list.interview_date)}`}
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
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
        {!isPublished && (
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Upload size={14} />}
            onClick={() => setImportModalOpen(true)}
          >
            Import CSV
          </Button>
        )}
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

      {/* Bulk action toolbar */}
      {selectedIds.length > 0 && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 1.5, 
            mb: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            bgcolor: 'primary.light', 
            color: 'primary.contrastText',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} color="inherit">
              {selectedIds.length} candidate(s) selected
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => handleBulkStatus('selected')}
              disabled={bulkSaving}
            >
              Mark Selected
            </Button>
            <Button
              variant="contained"
              color="warning"
              size="small"
              onClick={() => handleBulkStatus('provisional')}
              disabled={bulkSaving}
            >
              Mark Provisional
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => handleBulkStatus('absent')}
              disabled={bulkSaving}
            >
              Mark Absent
            </Button>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => handleBulkStatus('declined')}
              disabled={bulkSaving}
            >
              Mark Declined
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: 'grey.700', '&:hover': { bgcolor: 'grey.800' } }}
              size="small"
              onClick={() => handleBulkStatus('disqualified')}
              disabled={bulkSaving}
            >
              Mark Disqualified
            </Button>
            <Button
              variant="text"
              sx={{ color: 'primary.contrastText' }}
              size="small"
              onClick={() => setSelectedIds([])}
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Entries (${entries.length})`} />
        <Tab label="Open Merit List" disabled={entries.length === 0} />
        <Tab label="Category Merit List" disabled={entries.length === 0} />
        <Tab
          label={`Audit Log (${auditLogs.length})`}
          icon={<History size={14} />}
          iconPosition="start"
        />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ height: 520 }}>
          <TooltipDataGrid
            rows={entries}
            columns={entryColumns}
            pageSizeOptions={[15, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            density="compact"
            checkboxSelection={!isPublished}
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={(ids) => setSelectedIds(ids)}
            sx={{ bgcolor: 'background.paper', borderRadius: 2, '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' } }}
          />
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>Open Merit List (Final Standing)</Typography>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Download size={14} />}
              onClick={handleDownloadOpenMeritPDF}
              disabled={openMeritLoading || openMeritEntries.length === 0}
            >
              Download Open Merit PDF
            </Button>
          </Box>
          <Box sx={{ height: 500 }}>
            <TooltipDataGrid
              rows={openMeritEntries}
              columns={openMeritColumns}
              loading={openMeritLoading}
              pageSizeOptions={[15, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              density="compact"
              sx={{ bgcolor: 'background.paper', borderRadius: 2, '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' } }}
            />
          </Box>
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Category/Quota-wise Merit</Typography>
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category Type</InputLabel>
                <Select
                  value={categoryType}
                  label="Category Type"
                  onChange={(e) => {
                    setCategoryType(e.target.value);
                    setCategoryValue('all');
                  }}
                >
                  <MenuItem value="district">District Quota</MenuItem>
                  <MenuItem value="gender">Gender Quota</MenuItem>
                  <MenuItem value="disability">Disability Quota</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Quota Value</InputLabel>
                <Select
                  value={categoryValue}
                  label="Quota Value"
                  onChange={(e) => setCategoryValue(e.target.value)}
                >
                  <MenuItem value="all">All Quotas</MenuItem>
                  {Array.from(new Set(entries.map(ent => {
                    const app = ent.application;
                    if (!app) return null;
                    if (categoryType === 'district') {
                      return app.personal_details?.district_code ?? app.personal_details?.district;
                    } else if (categoryType === 'gender') {
                      return app.personal_details?.gender;
                    } else if (categoryType === 'disability') {
                      return app.personal_details?.is_disabled ? 'Yes' : 'No';
                    }
                    return null;
                  }).filter(Boolean))).map(val => (
                    <MenuItem key={val} value={val}>{val.toUpperCase()}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Button
              variant="contained"
              color="info"
              size="small"
              startIcon={<Download size={14} />}
              onClick={handleDownloadCategoryMeritPDF}
              disabled={categoryMeritLoading || categoryMeritEntries.length === 0}
            >
              Download Quota PDF
            </Button>
          </Box>
          <Box sx={{ height: 500 }}>
            <TooltipDataGrid
              rows={categoryMeritEntries}
              columns={categoryMeritColumns}
              loading={categoryMeritLoading}
              pageSizeOptions={[15, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              density="compact"
              sx={{ bgcolor: 'background.paper', borderRadius: 2, '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' } }}
            />
          </Box>
        </Box>
      )}

      {tab === 3 && (
        <Box sx={{ height: 400 }}>
          <TooltipDataGrid
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
                <SearchableSelect
                  label="Board / Uni 1st Position"
                  value={marksForm.board_uni_pos}
                  onChange={(e) => setMarksForm((f) => ({ ...f, board_uni_pos: Number(e.target.value) }))}
                  options={[
                    { value: 0, label: 'None (0)' },
                    { value: 1, label: '1st Position (1 Mark)' },
                  ]}
                />
              </Grid>
              <Grid item xs={6}>
                <SearchableSelect
                  label="MPhil / PhD Qualification"
                  value={marksForm.mphil_phd}
                  onChange={(e) => setMarksForm((f) => ({ ...f, mphil_phd: Number(e.target.value) }))}
                  options={[
                    { value: 0, label: 'None (0)' },
                    { value: 1, label: 'MPhil (1 Mark)' },
                    { value: 2, label: 'PhD (2 Marks)' },
                  ]}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Interview Attendance
            </Typography>
            <div style={{ marginBottom: '16px' }}>
              <SearchableSelect
                label="Attendance"
                value={marksForm.status}
                onChange={(e) => handleAttendanceChange(e.target.value)}
                options={[
                  { value: 'present', label: 'Present' },
                  { value: 'absent', label: 'Absent' },
                ]}
              />
            </div>

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
          <SearchableSelect
            label="Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
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
      {/* Import CSV Modal Dialog */}
      <Dialog open={importModalOpen} onClose={() => setImportModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>Bulk Import Interview Awards</Typography>
          <IconButton size="small" onClick={() => setImportModalOpen(false)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Alert severity="info">
            Download the pre-filled template, fill in Matric, Inter, Bachelors, and Interview (viva voce) marks, then drag and drop the CSV file below to import.
          </Alert>
          <CSVUploadZone
            onFileSelect={setSelectedUploadFile}
            onPreview={handleImportSubmit}
            loading={csvLoading}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImportModalOpen(false)} disabled={csvLoading}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
