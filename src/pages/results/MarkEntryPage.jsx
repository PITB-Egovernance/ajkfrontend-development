import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { TextField, MenuItem, IconButton, Switch, FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Save, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Search, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import useDebounce from 'hooks/useDebounce';
import toast from 'react-hot-toast';
import { normalizeJobResponse, getJobRouteId, getJobApiId } from 'utils/jobMapper';

/**
 * MarkEntryPage (v2.0)
 * Handles batch manual entry of candidate results with keyset pagination
 */

const MarkEntryPage = () => {
  const navigate = useNavigate();

  // State for Job Selection
  const [jobs, setJobs] = useState([]);
  const [fetchingJobs, setFetchingJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDetailed, setIsDetailed] = useState(false);
  const [totalMaxMarks, setTotalMaxMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);

  // State for Candidates List
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [pagination, setPagination] = useState({ next_cursor: null, has_more: false });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Save Dialog State
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveReason, setSaveReason] = useState('');

  // Dirty state tracking for batch save
  const [dirtyRows, setDirtyRows] = useState(new Set());

  // Load Jobs
  useEffect(() => {
    const fetchJobs = async () => {
      setFetchingJobs(true);
      try {
        const res = await AdvertisementApi.getAll(1);
        setJobs(res.data?.data || res.data || []);
      } catch (err) {
        toast.error('Failed to load job posts');
      } finally {
        setFetchingJobs(false);
      }
    };
    fetchJobs();
  }, []);

  // Load Candidates
  const fetchCandidates = useCallback(async (cursor = null) => {
    if (!selectedJob) return;
    setLoading(true);
    try {
      const res = await ResultsApi.getCandidates(selectedJob, {
        cursor,
        search: debouncedSearch,
        limit: 50
      });

      const newCandidates = res.data.map(c => ({
        ...c,
        local_obtained: c.obtained_marks || '',
        local_status: c.status || 'pass',
        local_subjects: c.marks_summary || {} // Map subjects here if detailed
      }));

      setCandidates(newCandidates);
      setPagination(res.pagination);
    } catch (err) {
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  }, [selectedJob, debouncedSearch]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Auto-save logic (UC-R01 A4)
  useEffect(() => {
    if (dirtyRows.size === 0 || saving) return;

    const timer = setTimeout(() => {
      handleSaveAll();
    }, 10000); // 10s debounce as per spec

    return () => clearTimeout(timer);
  }, [dirtyRows, candidates, saving]);

  // Handle Mark Change
  const handleMarkChange = (appId, value) => {
    setCandidates(prev => prev.map(c =>
      c.app_id === appId ? { ...c, local_obtained: value } : c
    ));
    setDirtyRows(prev => new Set(prev).add(appId));
  };

  const handleStatusChange = (appId, status) => {
    setCandidates(prev => prev.map(c =>
      c.app_id === appId ? { ...c, local_status: status } : c
    ));
    setDirtyRows(prev => new Set(prev).add(appId));
  };

  // Batch Save
  const handleSaveAll = async () => {
    if (dirtyRows.size === 0) {
      toast.info('No changes to save');
      return;
    }

    // Check if any of the dirty rows have existing marks (requires reason)
    const hasExistingMarks = candidates.some(c => dirtyRows.has(c.app_id) && c.marks_status !== 'Pending');

    if (hasExistingMarks && !isSaveDialogOpen) {
      setIsSaveDialogOpen(true);
      return;
    }

    if (hasExistingMarks && !saveReason.trim()) {
      toast.error('Reason for change is required for existing marks');
      return;
    }

    setSaving(true);
    try {
      const changedApps = candidates.filter(c => dirtyRows.has(c.app_id));

      const payload = {
        job_post_id: selectedJob,
        exam_date: examDate,
        result_type: isDetailed ? 'detailed' : 'summary',
        total_max_marks: Number(totalMaxMarks),
        passing_marks: Number(passingMarks),
        reason: saveReason,
        applications: changedApps.map(c => ({
          application_id: c.app_id,
          status: c.local_status,
          obtained_marks: Number(c.local_obtained),
          subjects: []
        }))
      };

      await ResultsApi.submitMarks(payload);
      toast.success(`Successfully saved ${dirtyRows.size} records`);
      setDirtyRows(new Set());
      setSaveReason('');
      setIsSaveDialogOpen(false);
      fetchCandidates();
    } catch (err) {
      toast.error(err.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  // Finalize Batch
  const handleFinalize = async () => {
    if (dirtyRows.size > 0) {
      toast.error('Please save your changes before finalizing');
      return;
    }

    if (!window.confirm('Are you sure? This will submit all "Uploaded" marks for review and they will no longer be editable by you.')) {
      return;
    }

    setFinalizing(true);
    try {
      await ResultsApi.confirmFinalize(selectedJob); // I'll add this to API service
      toast.success('Batch submitted for review!');
      fetchCandidates();
    } catch (err) {
      toast.error('Failed to finalize batch');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manual Mark Entry</h1>
              <p className="text-sm text-slate-500">Batch processing mode for eligible candidates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleSaveAll}
              disabled={saving || dirtyRows.size === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
              Save Changes ({dirtyRows.size})
            </Button>
            <Button
              variant="outline"
              onClick={handleFinalize}
              disabled={finalizing || candidates.length === 0}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {finalizing ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle2 size={18} className="mr-2" />}
              Ready for Review
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <TextField
                select
                label="Job Post"
                fullWidth
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                variant="outlined"
              >
                <MenuItem value="">Select a post...</MenuItem>
                {jobs.flatMap(adv =>
                  (adv.job_details || adv.jobDetails || []).map(job => (
                    <MenuItem key={job.hash_id || job.id} value={job.hash_id || job.id}>
                      {job.designation} ({adv.adv_number})
                    </MenuItem>
                  ))
                )}
              </TextField>

              <TextField
                type="date"
                label="Exam Date"
                fullWidth
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <div className="flex gap-4">
                <TextField
                  label="Max Marks"
                  type="number"
                  value={totalMaxMarks}
                  onChange={(e) => setTotalMaxMarks(e.target.value)}
                />
                <TextField
                  label="Pass Marks"
                  type="number"
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(e.target.value)}
                />
              </div>

              <TextField
                label="Search Candidates"
                placeholder="Name or Roll No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search size={18} className="mr-2 text-slate-400" />
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        <TableContainer component={Paper} className="shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell className="bg-slate-50 font-bold text-slate-600">Roll No</TableCell>
                <TableCell className="bg-slate-50 font-bold text-slate-600">Candidate Name</TableCell>
                <TableCell className="bg-slate-50 font-bold text-slate-600">Marks Status</TableCell>
                <TableCell className="bg-slate-50 font-bold text-slate-600" width="120">Status</TableCell>
                <TableCell className="bg-slate-50 font-bold text-slate-600 text-center" width="180">Obtained Marks</TableCell>
                <TableCell className="bg-slate-50 font-bold text-slate-600 text-center">Score %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <Loader2 className="animate-spin mx-auto text-slate-300" size={40} />
                    <p className="mt-4 text-slate-500 font-medium">Loading eligible candidates...</p>
                  </TableCell>
                </TableRow>
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400">
                    <Search size={40} className="mx-auto mb-4 opacity-20" />
                    No candidates found for this selection
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((c) => {
                  const score = totalMaxMarks > 0 ? ((Number(c.local_obtained) / totalMaxMarks) * 100).toFixed(1) : 0;
                  const isDirty = dirtyRows.has(c.app_id);

                  return (
                    <TableRow key={c.app_id} className={`${isDirty ? 'bg-amber-50/30' : ''} hover:bg-slate-50 transition-colors`}>
                      <TableCell className="font-mono font-bold text-slate-700">{c.roll_no}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{c.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.cnic}</div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.marks_status}
                          size="small"
                          className={`font-bold text-[10px] uppercase ${c.marks_status === 'Pending' ? 'bg-slate-100 text-slate-600' :
                              c.marks_status === 'Uploaded' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-blue-100 text-blue-700'
                            }`}
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
                          value={c.local_status}
                          onChange={(e) => handleStatusChange(c.app_id, e.target.value)}
                        >
                          <option value="pass">PASS</option>
                          <option value="fail">FAIL</option>
                          <option value="absent">ABSENT</option>
                          <option value="withheld">WITHHELD</option>
                        </select>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={c.local_obtained}
                          onChange={(e) => handleMarkChange(c.app_id, e.target.value)}
                          disabled={c.local_status === 'absent' || c.local_status === 'withheld'}
                          inputProps={{
                            className: "text-center font-bold tabular-nums",
                            style: { textAlign: 'center' }
                          }}
                          sx={{ width: 100 }}
                          error={Number(c.local_obtained) > totalMaxMarks}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <div className={`font-black ${Number(score) >= 40 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {c.local_status === 'absent' ? '-' : `${score}%`}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{candidates.length}</span> candidates
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={true}>
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.has_more}
              onClick={() => fetchCandidates(pagination.next_cursor)}
            >
              Next Page <ChevronRight size={18} className="ml-1" />
            </Button>
          </div>
        </div>

        {/* Save Confirmation Dialog */}
        <Dialog open={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle className="font-bold flex items-center gap-2">
            <AlertCircle className="text-amber-500" />
            Confirm Mark Update
          </DialogTitle>
          <DialogContent>
            <p className="text-sm text-slate-600 mb-4">
              You are updating {dirtyRows.size} records that already have marks.
              Please provide a brief reason for this correction for the audit trail.
            </p>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Change"
              value={saveReason}
              onChange={(e) => setSaveReason(e.target.value)}
              placeholder="e.g. Clerical error correction, OMR re-scan, etc."
              autoFocus
            />
          </DialogContent>
          <DialogActions className="p-4">
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSaveAll}
              disabled={!saveReason.trim() || saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
              Apply Changes
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default MarkEntryPage;
