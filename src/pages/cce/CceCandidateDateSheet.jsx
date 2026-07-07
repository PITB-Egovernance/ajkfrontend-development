import React, { useState, useEffect, useCallback } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { TextField, MenuItem } from '@mui/material';
import { BookOpen, Save, Send, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import confirmDelete from 'components/ui/ConfirmDelete';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import CceScreeningApi from 'api/cceScreeningApi';
import CceDateSheetApi from 'api/cceDateSheetApi';
import RollNumberApi from 'api/rollNumberApi';
import { GRID_SX, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';

// Same group ordering used across the CCE pages (master date sheet, public syllabus).
const GROUP_ORDER = ['Compulsory', 'Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G'];

const DEFAULT_FILTERS = { search: '' };
const FILTER_CONFIG = [
  { name: 'search', label: 'Search (Name / CNIC / Roll No)', type: 'text', placeholder: 'Search by name, CNIC, or roll number' },
];

const StatusPill = ({ label, tone }) => {
  const tones = {
    ok:      'bg-emerald-100 text-emerald-700',
    warn:    'bg-amber-100 text-amber-700',
    neutral: 'bg-slate-100 text-slate-500',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone] || tones.neutral}`}>{label}</span>;
};

const CceCandidateDateSheet = () => {
  const [advertisements, setAdvertisements] = useState([]);
  const [advertisementsLoading, setAdvertisementsLoading] = useState(true);
  const [advertisementId, setAdvertisementId] = useState('');

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [expandedApplicationNumber, setExpandedApplicationNumber] = useState(null);
  const [subjectRows, setSubjectRows] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectSelection, setSubjectSelection] = useState(null);
  const [subjectSelectionLoading, setSubjectSelectionLoading] = useState(false);
  const [subjectSelectionError, setSubjectSelectionError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [centers, setCenters] = useState([]);
  const [hallsByCenter, setHallsByCenter] = useState({}); // centerId -> hall[]

  useEffect(() => {
    (async () => {
      setAdvertisementsLoading(true);
      try {
        const res = await CceScreeningApi.advertisements();
        const list = res?.data ?? [];
        setAdvertisements(Array.isArray(list) ? list : []);
        if (list.length > 0) setAdvertisementId(list[0].hash_id || list[0].id);
      } catch (err) {
        toast.error(err?.message || 'Failed to load advertisements');
      } finally {
        setAdvertisementsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await RollNumberApi.getExamCenters(500);
        const list = r.data?.data ?? r.data ?? [];
        setCenters(Array.isArray(list) ? list : []);
      } catch { /* silent — center select falls back to empty options */ }
    })();
  }, []);

  const loadHallsFor = useCallback(async (centerId) => {
    if (!centerId || hallsByCenter[centerId]) return;
    try {
      const r = await RollNumberApi.getHallsByCenter(centerId);
      const list = r.data?.data ?? r.data ?? [];
      setHallsByCenter((prev) => ({ ...prev, [centerId]: Array.isArray(list) ? list : [] }));
    } catch { /* silent — hall select falls back to empty options for this center */ }
  }, [hallsByCenter]);

  const loadCandidates = useCallback(async () => {
    if (!advertisementId) return;
    setLoading(true);
    try {
      const res = await CceDateSheetApi.getEligibleCandidates(advertisementId, {
        search:   filters.search || undefined,
        per_page: paginationModel.pageSize,
        page:     paginationModel.page + 1,
      });
      const payload = res?.data ?? {};
      const list = payload.data ?? [];
      setRows((Array.isArray(list) ? list : []).map((r) => ({ ...r, id: r.application_number })));
      setTotal(Number(payload.total ?? list.length ?? 0));
    } catch (err) {
      toast.error(err?.message || 'Failed to load eligible candidates');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [advertisementId, filters, paginationModel]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };
  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  // const loadSubjectsFor = useCallback(async (applicationNumber) => {
  //   setSubjectsLoading(true);
  //   try {
  //     const res = await CceDateSheetApi.getCandidateSubjects(applicationNumber, advertisementId);
  //     const list = res?.data ?? [];
  //     setSubjectRows(Array.isArray(list) ? list : []);
  //     (Array.isArray(list) ? list : []).forEach((r) => { if (r.exam_center_id) loadHallsFor(r.exam_center_id); });
  //   } catch (err) {
  //     toast.error(err?.message || 'Failed to load candidate subjects');
  //     setSubjectRows([]);
  //   } finally {
  //     setSubjectsLoading(false);
  //   }
  // }, [advertisementId, loadHallsFor]);

  // Candidate's own group-wise optional-subject selection — data lives in the
  // candidate portal's own database, so this reads it straight from the
  // candidate API rather than syncing/storing a copy in the admin DB. A 404
  // just means the candidate hasn't submitted a selection yet (empty state,
  // not an error); any other failure surfaces as a real error inline.
  const loadSubjectSelectionFor = useCallback(async (rollNumber) => {
    if (!rollNumber) { setSubjectSelection(null); setSubjectSelectionError(null); return; }
    setSubjectSelectionLoading(true);
    setSubjectSelectionError(null);
    try {
      const res = await CceDateSheetApi.getSubjectSelection(rollNumber);
      setSubjectSelection(res?.data ?? null);
    } catch (err) {
      setSubjectSelection(null);
      if (err?.status !== 404) {
        setSubjectSelectionError(err?.message || 'Failed to load subject selection');
      }
    } finally {
      setSubjectSelectionLoading(false);
    }
  }, []);

  const toggleExpand = (row) => {
    const applicationNumber = row.application_number;
    if (expandedApplicationNumber === applicationNumber) {
      setExpandedApplicationNumber(null);
      setSubjectRows([]);
      setSubjectSelection(null);
      setSubjectSelectionError(null);
      return;
    }
    setExpandedApplicationNumber(applicationNumber);
    // loadSubjectsFor(applicationNumber);
    loadSubjectSelectionFor(row.roll_number);
  };

  const updateSubjectRow = (index, field, value) => {
    setSubjectRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    if (field === 'exam_center_id') loadHallsFor(value);
  };

  const handleSaveCandidateDateSheet = async () => {
    const incomplete = subjectRows.filter((r) => !r.exam_center_id);
    if (incomplete.length > 0) {
      toast.error('Allocate an exam center for every paper before saving');
      return;
    }

    setBusy(true);
    try {
      await CceDateSheetApi.saveCandidateDateSheet(
        expandedApplicationNumber,
        advertisementId,
        subjectRows.map((r) => ({
          subject_id:        r.subject_id,
          paper_label:       r.paper_label,
          paper_date:        r.paper_date,
          paper_time:        r.paper_time,
          duration_minutes:  r.duration_minutes ? Number(r.duration_minutes) : null,
          exam_center_id:    r.exam_center_id,
          exam_hall_id:      r.exam_hall_id || null,
        }))
      );
      toast.success('Candidate date sheet saved successfully');
      // await loadSubjectsFor(expandedApplicationNumber);
      await loadCandidates();
    } catch (err) {
      toast.error(err?.message || 'Failed to save candidate date sheet');
    } finally {
      setBusy(false);
    }
  };

  const publishRow = async (row) => {
    if (!row.hash_id) { toast.error('Save this paper before publishing it'); return; }
    const confirmed = await confirmDelete({
      title: 'Publish Candidate Date Sheet',
      message: `Publish this paper's date sheet? The candidate will be able to view it immediately.`,
      warning: 'This action cannot be undone.',
      confirmLabel: 'Publish',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      await CceDateSheetApi.publish([row.hash_id]);
      toast.success('Paper published successfully');
      // await loadSubjectsFor(expandedApplicationNumber);
      await loadCandidates();
    } catch (err) {
      toast.error(err?.message || 'Failed to publish');
    } finally {
      setBusy(false);
    }
  };

  const unpublishRow = async (row) => {
    if (!row.hash_id) return;
    const confirmed = await confirmDelete({
      title: 'Unpublish Candidate Date Sheet',
      message: `Unpublish this paper's date sheet? The candidate will no longer be able to view it.`,
      warning: 'The candidate immediately loses access to this paper.',
      confirmLabel: 'Unpublish',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      await CceDateSheetApi.unpublish([row.hash_id]);
      toast.success('Paper unpublished successfully');
      // await loadSubjectsFor(expandedApplicationNumber);
      await loadCandidates();
    } catch (err) {
      toast.error(err?.message || 'Failed to unpublish');
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      field: 'candidate_name',
      headerName: 'Candidate',
      minWidth: 180,
      flex: 1.1,
      renderCell: (p) => (
        <button type="button" onClick={() => toggleExpand(p.row)}
          className="flex items-center gap-1 font-medium text-indigo-700 hover:underline">
          {expandedApplicationNumber === p.row.application_number ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {p.value}
        </button>
      ),
    },
    { field: 'candidate_cnic', headerName: 'CNIC', minWidth: 140, flex: 0.8 },
    { field: 'application_number', headerName: 'Application #', minWidth: 150, flex: 0.9 },
    {
      field: 'roll_number',
      headerName: 'Roll Number',
      minWidth: 130,
      flex: 0.8,
      renderCell: (p) => <span className="font-mono font-bold text-indigo-700">{p.value}</span>,
    },
    {
      field: 'screening_status',
      headerName: 'Screening',
      minWidth: 110,
      flex: 0.6,
      renderCell: (p) => <StatusPill label={(p.value || 'pass').toUpperCase()} tone="ok" />,
    },
    {
      field: 'subject_selection_status',
      headerName: 'Subject Selection',
      minWidth: 140,
      flex: 0.7,
      renderCell: (p) => <StatusPill label={p.value === 'submitted' ? 'Submitted' : 'Pending'} tone={p.value === 'submitted' ? 'ok' : 'neutral'} />,
    },
    {
      field: 'date_sheet_status',
      headerName: 'Date Sheet Status',
      minWidth: 140,
      flex: 0.7,
      renderCell: (p) => {
        if (p.value === 'complete') return <StatusPill label="Complete" tone="ok" />;
        if (p.value === 'draft') return <StatusPill label="Draft" tone="warn" />;
        return <StatusPill label="Not Started" tone="neutral" />;
      },
    },
    {
      field: 'published',
      headerName: 'Publish Status',
      minWidth: 130,
      flex: 0.7,
      renderCell: (p) => p.value
        ? <StatusPill label="Published" tone="ok" />
        : <StatusPill label="Not Published" tone="neutral" />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><BookOpen size={22} className="text-emerald-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">CCE Candidate Date Sheet</h1>
              <p className="text-sm text-slate-500 mt-1">Allocate centers/halls and publish each passed candidate's written date sheet.</p>
            </div>
          </div>
          {advertisements.length > 0 && (
            <TextField
              select
              size="small"
              label="Advertisement"
              value={advertisementId}
              onChange={(e) => { setAdvertisementId(e.target.value); setPaginationModel((prev) => ({ ...prev, page: 0 })); setExpandedApplicationNumber(null); }}
              sx={{ minWidth: 260, backgroundColor: 'white' }}
            >
              {advertisements.map((ad) => (
                <MenuItem key={ad.hash_id || ad.id} value={ad.hash_id || ad.id}>
                  {ad.adv_number || ad.title || `Advertisement #${ad.id}`}
                </MenuItem>
              ))}
            </TextField>
          )}
        </div>

        {advertisementsLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-10 flex justify-center">
            <InlineLoader text="Loading advertisements..." variant="ring" size="lg" />
          </div>
        ) : advertisements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
              <BookOpen size={32} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700">No CCE Screening Roll Numbers Yet</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">Candidates will appear here once they've passed screening and submitted their subject selection.</p>
          </div>
        ) : (
          <>
            <AdvancedFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              filterConfig={FILTER_CONFIG}
              title="Filter Eligible Candidates"
            />

            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
              {loading && rows.length === 0 ? (
                <div className="p-10 flex justify-center">
                  <InlineLoader text="Loading eligible candidates..." variant="ring" size="lg" />
                </div>
              ) : rows.length === 0 && !loading ? (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <BookOpen size={32} className="text-slate-400" />
                  </div>
                  <p className="text-base font-semibold text-slate-700">No eligible candidates found</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    Candidates must have passed CCE screening, have a generated roll number, and have submitted their subject selection.
                  </p>
                </div>
              ) : (
                <TooltipDataGrid
                  rows={rows}
                  columns={columns}
                  getRowId={(r) => r.application_number}
                  paginationMode="server"
                  rowCount={total}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={GRID_PAGE_SIZE_OPTIONS}
                  disableRowSelectionOnClick
                  autoHeight
                  loading={loading}
                  sx={GRID_SX}
                />
              )}
            </div>

            {/* EXPANDED CANDIDATE SUBJECT PANEL */}
            {expandedApplicationNumber && (
              <Card className="border border-indigo-200">
                <CardContent className="p-5">
                  <h2 className="font-semibold text-slate-800 mb-3">
                    Selected Papers — <span className="font-mono">{expandedApplicationNumber}</span>
                  </h2>

                  {/* Candidate's group-wise optional-subject selection, read live from the candidate portal API. */}
                  {subjectSelectionLoading ? (
                    <div className="p-3 mb-4 flex justify-center">
                      <InlineLoader text="Loading subject selection..." variant="ring" size="sm" />
                    </div>
                  ) : subjectSelectionError ? (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
                      <p className="text-xs text-red-600">Could not load subject selection — {subjectSelectionError}</p>
                    </div>
                  ) : subjectSelection?.selections && Object.keys(subjectSelection.selections).length > 0 ? (
                    <div className="mb-4 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
                      <p className="text-xs font-semibold uppercase text-indigo-800 mb-2">
                        Subject Selection
                        {subjectSelection.submitted_at && (
                          <span className="ml-2 font-normal normal-case text-slate-400">
                            (submitted {new Date(subjectSelection.submitted_at).toLocaleDateString()})
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {[
                          ...GROUP_ORDER.filter((g) => subjectSelection.selections[g]),
                          ...Object.keys(subjectSelection.selections).filter((g) => !GROUP_ORDER.includes(g)),
                        ].map((group) => (
                          <div key={group} className="text-sm">
                            <span className="font-semibold text-slate-700">{group}: </span>
                            <span className="text-slate-600">{subjectSelection.selections[group].join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mb-4">No subject selection found for this candidate.</p>
                  )}

                  {subjectsLoading ? (
                    <div className="p-6 flex justify-center"><InlineLoader text="Loading subjects..." variant="ring" size="md" /></div>
                  ) : subjectRows.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4">No selected subjects found for this candidate.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                              <th className="py-2 px-3">Paper</th>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3">Day</th>
                              <th className="py-2 px-3">Time</th>
                              <th className="py-2 px-3">Duration</th>
                              <th className="py-2 px-3">Exam Center</th>
                              <th className="py-2 px-3">Exam Hall</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectRows.map((row, index) => (
                              <tr key={`${row.subject_id}-${row.paper_label || ''}`} className="border-b border-slate-100">
                                <td className="py-2 px-3 font-medium text-slate-800">
                                  {row.subject_name}{row.paper_label ? ` — ${row.paper_label}` : ''}
                                </td>
                                <td className="py-2 px-3 text-slate-600">{row.paper_date || '—'}</td>
                                <td className="py-2 px-3 text-slate-500">{row.paper_day || '—'}</td>
                                <td className="py-2 px-3 text-slate-600">{row.paper_time || '—'}</td>
                                <td className="py-2 px-3 text-slate-600">{row.duration_minutes ? `${row.duration_minutes} min` : '—'}</td>
                                <td className="py-2 px-3">
                                  <TextField select size="small" sx={{ minWidth: 160 }} disabled={!!row.published_at}
                                    value={row.exam_center_id || ''} onChange={(e) => updateSubjectRow(index, 'exam_center_id', e.target.value)}>
                                    <MenuItem value="">— Select —</MenuItem>
                                    {centers.map((c) => {
                                      const value = c.id != null ? String(c.id) : c.hash_id;
                                      return <MenuItem key={value} value={value}>{c.name}{c.city ? ` (${c.city})` : ''}</MenuItem>;
                                    })}
                                  </TextField>
                                </td>
                                <td className="py-2 px-3">
                                  <TextField select size="small" sx={{ minWidth: 140 }} disabled={!row.exam_center_id || !!row.published_at}
                                    value={row.exam_hall_id || ''} onChange={(e) => updateSubjectRow(index, 'exam_hall_id', e.target.value)}>
                                    <MenuItem value="">— None —</MenuItem>
                                    {(hallsByCenter[row.exam_center_id] || []).map((h) => {
                                      const value = h.id != null ? String(h.id) : h.hash_id;
                                      return <MenuItem key={value} value={value}>{h.name}</MenuItem>;
                                    })}
                                  </TextField>
                                </td>
                                <td className="py-2 px-3">
                                  {row.published_at
                                    ? <StatusPill label="Published" tone="ok" />
                                    : <StatusPill label="Not Published" tone="neutral" />}
                                </td>
                                <td className="py-2 px-3">
                                  {row.published_at ? (
                                    <Button size="sm" variant="outline" disabled={busy}
                                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                      onClick={() => unpublishRow(row)}>
                                      <EyeOff size={13} />
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" disabled={busy || !row.hash_id}
                                      title={!row.hash_id ? 'Save first' : undefined}
                                      onClick={() => publishRow(row)}>
                                      <Send size={13} />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end mt-4">
                        <Button onClick={handleSaveCandidateDateSheet} disabled={busy} className="flex items-center gap-2">
                          <Save size={14} /> {busy ? 'Saving…' : 'Save Candidate Date Sheet'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CceCandidateDateSheet;
