import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { TextField, MenuItem } from '@mui/material';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import { InlineLoader } from 'components/ui/Loader';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import CceScreeningApi from 'api/cceScreeningApi';
import CceDateSheetApi from 'api/cceDateSheetApi';
import { GRID_SX, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';
import { formatPaperDate, formatPaperDay, formatPaperTime, buildCandidateDateSheetGroups } from 'utils/cceDateSheet';

const DEFAULT_FILTERS = { search: '' };
const FILTER_CONFIG = [
  { name: 'search', label: 'Roll Number', type: 'text', placeholder: 'Enter the exact CCE roll number (e.g. CCE-000001)' },
];

const CceCandidateDateSheet = () => {
  const [advertisements, setAdvertisements] = useState([]);
  const [advertisementsLoading, setAdvertisementsLoading] = useState(true);
  const [advertisementId, setAdvertisementId] = useState('');

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [expandedRollNumber, setExpandedRollNumber] = useState(null);
  const [subjectSelection, setSubjectSelection] = useState(null);
  const [subjectSelectionLoading, setSubjectSelectionLoading] = useState(false);
  const [subjectSelectionError, setSubjectSelectionError] = useState(null);

  // The master date sheet for the selected advertisement — the single source
  // of truth for every paper's date/day/time/duration. Never duplicated into
  // a per-candidate copy; the candidate view is just this, filtered.
  const [masterRows, setMasterRows] = useState([]);
  const [masterRowsLoading, setMasterRowsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setAdvertisementsLoading(true);
      try {
        const res = await CceScreeningApi.advertisements();
        const list = res?.data ?? [];
        setAdvertisements(Array.isArray(list) ? list : []);
        // Default to the first advertisement (same as the master date sheet
        // page) so a candidate's date sheet always has a master sheet to
        // merge against as soon as the page loads. "All Advertisements"
        // remains selectable for cross-advertisement roll-number lookup.
        if (list.length > 0) setAdvertisementId(list[0].hash_id || list[0].id);
      } catch (err) {
        toast.error(err?.message || 'Failed to load advertisements');
      } finally {
        setAdvertisementsLoading(false);
      }
    })();
  }, []);

  // Load the master date sheet whenever the selected advertisement changes —
  // it's the same data source the master page reads/writes, so any date the
  // admin sets there shows up here automatically on next load, no extra sync.
  useEffect(() => {
    if (!advertisementId) { setMasterRows([]); return; }
    (async () => {
      setMasterRowsLoading(true);
      try {
        const res = await CceDateSheetApi.getMasterDateSheet(advertisementId);
        const list = res?.data ?? [];
        setMasterRows(Array.isArray(list) ? list : []);
      } catch (err) {
        toast.error(err?.message || 'Failed to load master date sheet');
        setMasterRows([]);
      } finally {
        setMasterRowsLoading(false);
      }
    })();
  }, [advertisementId]);

  // Candidates are read straight from the candidate portal's own subject-
  // selection API (no application_number/screening/date-sheet data attached —
  // that lives only in the admin backend's own tables). The portal has no
  // free-text search, so the "search" filter is treated as an exact roll
  // number lookup (single record); leaving it blank lists everyone who has
  // submitted a selection, paginated.
  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await CceDateSheetApi.getEligibleCandidatesFromPortal({
        rollNumber:      filters.search || undefined,
        advertisementId: advertisementId || undefined,
        perPage:         paginationModel.pageSize,
        page:            paginationModel.page + 1,
      });

      const payload = res?.data;
      if (Array.isArray(payload)) {
        setRows(payload);
        setTotal(Number(res?.meta?.pagination?.total ?? payload.length));
      } else if (payload) {
        setRows([payload]);
        setTotal(1);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch (err) {
      if (err?.status === 404) {
        setRows([]);
        setTotal(0);
      } else if (err?.status === 401) {
        setLoadError('Unauthorized — the candidate portal rejected this request\'s API key.');
        setRows([]);
        setTotal(0);
      } else {
        setLoadError(err?.message || 'Failed to load eligible candidates');
        toast.error(err?.message || 'Failed to load eligible candidates');
        setRows([]);
        setTotal(0);
      }
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

  // Compulsory papers (once) + only the optional papers this candidate
  // selected, each carrying whatever date/time/duration is currently set on
  // the master date sheet (blank if the admin hasn't filled it in yet).
  const candidateDateSheetGroups = useMemo(
    () => buildCandidateDateSheetGroups(masterRows, subjectSelection?.selections),
    [masterRows, subjectSelection]
  );

  const toggleExpand = (row) => {
    const rollNumber = row.roll_number;
    if (expandedRollNumber === rollNumber) {
      setExpandedRollNumber(null);
      setSubjectSelection(null);
      setSubjectSelectionError(null);
      return;
    }
    setExpandedRollNumber(rollNumber);
    loadSubjectSelectionFor(rollNumber);
  };

  const columns = [
    {
      field: 'candidate_name',
      headerName: 'Candidate',
      minWidth: 180,
      flex: 1.1,
      valueGetter: (p) => p.row.candidate?.name,
      renderCell: (p) => (
        <button type="button" onClick={() => toggleExpand(p.row)}
          className="flex items-center gap-1 font-medium text-indigo-700 hover:underline">
          {expandedRollNumber === p.row.roll_number ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {p.row.candidate?.name || '—'}
        </button>
      ),
    },
    {
      field: 'candidate_cnic',
      headerName: 'CNIC',
      minWidth: 140,
      flex: 0.8,
      valueGetter: (p) => p.row.candidate?.cnic,
    },
    {
      field: 'roll_number',
      headerName: 'Roll Number',
      minWidth: 130,
      flex: 0.8,
      renderCell: (p) => <span className="font-mono font-bold text-indigo-700">{p.value}</span>,
    },
    { field: 'advertisement_title', headerName: 'Advertisement', minWidth: 150, flex: 0.9 },
    { field: 'post_name', headerName: 'Post', minWidth: 150, flex: 0.9 },
    {
      field: 'submitted_at',
      headerName: 'Submitted At',
      minWidth: 170,
      flex: 0.9,
      renderCell: (p) => p.value ? new Date(p.value).toLocaleString() : '—',
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
              <p className="text-sm text-slate-500 mt-1">View each candidate's date sheet — compulsory papers plus their selected subjects, from the master date sheet.</p>
            </div>
          </div>
          {advertisements.length > 0 && (
            <TextField
              select
              size="small"
              label="Advertisement"
              value={advertisementId}
              onChange={(e) => { setAdvertisementId(e.target.value); setPaginationModel((prev) => ({ ...prev, page: 0 })); setExpandedRollNumber(null); }}
              sx={{ minWidth: 260, backgroundColor: 'white' }}
            >
              <MenuItem value="">All Advertisements</MenuItem>
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
              title="Look Up by Roll Number"
            />

            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
              {loading && rows.length === 0 ? (
                <div className="p-10 flex justify-center">
                  <InlineLoader text="Loading eligible candidates..." variant="ring" size="lg" />
                </div>
              ) : loadError ? (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-red-50 rounded-full mb-4">
                    <BookOpen size={32} className="text-red-400" />
                  </div>
                  <p className="text-base font-semibold text-red-700">Could not load candidates</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">{loadError}</p>
                </div>
              ) : rows.length === 0 && !loading ? (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <BookOpen size={32} className="text-slate-400" />
                  </div>
                  <p className="text-base font-semibold text-slate-700">No eligible candidates found</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    {filters.search
                      ? 'No submitted subject selection was found for that roll number.'
                      : 'Candidates must have passed CCE screening, have a generated roll number, and have submitted their subject selection.'}
                  </p>
                </div>
              ) : (
                <TooltipDataGrid
                  rows={rows}
                  columns={columns}
                  getRowId={(r) => r.roll_number}
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

            {/* EXPANDED CANDIDATE DATE SHEET PANEL */}
            {expandedRollNumber && (
              <Card className="border border-indigo-200 overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 pb-0">
                    <h2 className="font-semibold text-slate-800">
                      Date Sheet — <span className="font-mono">{expandedRollNumber}</span>
                    </h2>
                    {subjectSelection?.submitted_at && (
                      <p className="text-xs text-slate-400 mt-1">
                        Subject selection submitted {new Date(subjectSelection.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {subjectSelectionLoading || masterRowsLoading ? (
                    <div className="p-10 flex justify-center">
                      <InlineLoader text="Loading date sheet..." variant="ring" size="sm" />
                    </div>
                  ) : subjectSelectionError ? (
                    <div className="m-5 p-3 rounded-lg bg-red-50 border border-red-100">
                      <p className="text-xs text-red-600">Could not load subject selection — {subjectSelectionError}</p>
                    </div>
                  ) : !advertisementId ? (
                    <p className="p-5 text-xs text-slate-400">Select a specific advertisement above to view this candidate's date sheet.</p>
                  ) : candidateDateSheetGroups.length === 0 ? (
                    <p className="p-5 text-xs text-slate-400">No subject selection found for this candidate.</p>
                  ) : (
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50">
                            <th className="py-2 px-4">Subject / Paper</th>
                            <th className="py-2 px-4">Marks</th>
                            <th className="py-2 px-4">Paper Date</th>
                            <th className="py-2 px-4">Paper Day</th>
                            <th className="py-2 px-4">Paper Time</th>
                            <th className="py-2 px-4">Duration (min)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidateDateSheetGroups.map(({ group, items }) => (
                            <React.Fragment key={group}>
                              <tr className="bg-indigo-50/60">
                                <td colSpan={6} className="py-1.5 px-4 text-xs font-bold uppercase text-indigo-800">{group}</td>
                              </tr>
                              {items.map((row) => (
                                <tr key={`${row.subject_id}-${row.paper_label || ''}`} className="border-b border-slate-100">
                                  <td className="py-2 px-4 font-medium text-slate-800">
                                    {row.subject_name}{row.paper_label ? ` — ${row.paper_label}` : ''}
                                  </td>
                                  <td className="py-2 px-4 text-slate-500">{row.total_marks}</td>
                                  <td className="py-2 px-4 text-slate-600">{formatPaperDate(row.paper_date)}</td>
                                  <td className="py-2 px-4 text-slate-500">{formatPaperDay(row.paper_date)}</td>
                                  <td className="py-2 px-4 text-slate-600">{formatPaperTime(row.paper_time)}</td>
                                  <td className="py-2 px-4 text-slate-600">{row.duration_minutes || '—'}</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
