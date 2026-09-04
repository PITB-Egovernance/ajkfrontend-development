import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { Eye, XCircle, MoreVertical, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import ApplicationApi from 'api/applicationApi';
import toast from 'react-hot-toast';
import { getApplicationOcrBatch } from 'utils/applicationOcrUtils';
import { formatDate } from 'utils/dateUtils';
import { formatCNIC } from 'utils/stringUtils';

// ── Module-level constants ────────────────────────────────────────────────────

const UNREVIEWED_SENTINEL = '__unreviewed__';

const DEFAULT_FILTERS = {
  ref_id: '', job_id: '', advertisement_no: '', status: '',
  payment_status: '', start_date: '', end_date: '',
  search: '', ocr_batch: '', disability: '',
};

const ApplicationsList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [apiError, setApiError] = useState(null);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [advertisementMap, setAdvertisementMap] = useState({});

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  // Map job-detail / advertisement hash ids -> human-readable advertisement
  // number (e.g. "Advertisement 5-26"), so the candidate-portal's
  // `advertisement_no` (which is actually a job-detail hash id) can be
  // resolved to readable text instead of a raw hash.
  const fetchAdvertisements = useCallback(async () => {
    try {
      const headers = {
        Accept: 'application/json',
        'X-API-KEY': API_KEY,
        Authorization: `Bearer ${TOKEN}`,
      };

      const firstRes  = await fetch(`${API_BASE}/advertisements?per_page=100`, { headers });
      const firstJson = await firstRes.json();
      const firstPage = firstJson?.data?.data ?? [];
      const lastPage  = firstJson?.data?.last_page ?? 1;

      let allAds = firstPage;
      if (lastPage > 1) {
        const pages = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) =>
            fetch(`${API_BASE}/advertisements?per_page=100&page=${i + 2}`, { headers })
              .then((r) => r.json())
              .then((j) => j?.data?.data ?? [])
              .catch(() => [])
          )
        );
        allAds = allAds.concat(...pages);
      }

      const map = {};
      allAds.forEach((ad) => {
        if (ad.hash_id) map[ad.hash_id] = ad.adv_number;
        (ad.job_details || []).forEach((job) => {
          if (job?.hash_id) map[job.hash_id] = ad.adv_number;
        });
      });
      setAdvertisementMap(map);
    } catch (err) {
      console.error('Failed to load advertisements for resolving advertisement numbers');
    }
  }, [API_BASE, TOKEN, API_KEY]);

  useEffect(() => {
    fetchAdvertisements();
  }, [fetchAdvertisements]);

  // Derive unique jobs from loaded rows — keyed on advertisement_no (now
  // sourced straight from the candidate portal's own top-level field, so
  // it's reliably present on every application regardless of admin sync
  // status), labeled with the post title when available for readability.
  const jobs = useMemo(() => {
    const seen   = new Set();
    const unique = [];
    rows.forEach((row) => {
      const adNo = row.advertisement_no;
      if (adNo && adNo !== 'N/A' && !seen.has(adNo)) {
        seen.add(adNo);
        const label = row.job_title && row.job_title !== 'N/A' ? `${row.job_title} (${adNo})` : adNo;
        unique.push({ id: adNo, advertisement_no: adNo, label });
      }
    });
    return unique;
  }, [rows]);

  const filterConfig = useMemo(() => [
    { name: 'search', label: 'Search (Name/CNIC)', type: 'text', placeholder: 'Candidate name or CNIC...' },
    { name: 'ref_id', label: 'Ref ID', type: 'text' },
    {
      name: 'job_id', label: 'Job Advertisement', type: 'select',
      options: jobs.map((job) => ({ value: job.advertisement_no, label: job.label })),
    },
    {
      name: 'advertisement_no', label: 'Advertisement No', type: 'select',
      options: jobs.map((job) => ({ value: job.advertisement_no, label: job.advertisement_no })),
    },
    {
      name: 'status', label: 'Status', type: 'select',
      options: [
        { value: UNREVIEWED_SENTINEL, label: 'Unreviewed' },
        { value: 'Shortlisted', label: 'Shortlisted' },
        { value: 'Interview', label: 'Interview' },
        { value: 'Rejected', label: 'Rejected' },
      ],
    },
    {
      name: 'payment_status', label: 'Payment Status', type: 'select',
      options: [
        { value: 'paid', label: 'Paid' },
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'pending', label: 'Pending' },
      ],
    },
    {
      name: 'ocr_batch', label: 'OCR Verification', type: 'select',
      options: [
        { value: 'green', label: 'OCR Verified' },
        { value: 'yellow', label: 'Partially Verified' },
        { value: 'red', label: 'Not Verified' },
      ],
    },
    {
      name: 'disability', label: 'Disability', type: 'select',
      options: [
        { value: 'yes', label: 'Disabled' },
        { value: 'no', label: 'Not Disabled' },
      ],
    },
    { name: 'start_date', label: 'Applied At (From)', type: 'date' },
    { name: 'end_date', label: 'Applied At (To)', type: 'date' },
  ], [jobs]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      // UNREVIEWED_SENTINEL is a frontend-only token (no admin row with that status exists);
      // skip sending it to the server so the local filter can pick up rows whose status is empty.
      // job_id is filtered locally below (its value is now the job title
      // text, not an id the candidate portal's own /applications endpoint
      // would understand), so it's deliberately not sent as a server param.
      const params = {
        per_page: 1000,
        search: filters.search,
        status: filters.status === UNREVIEWED_SENTINEL ? '' : filters.status,
        start_date: filters.start_date,
        end_date: filters.end_date,
      };
      const response = await ApplicationApi.getAll(params);

      console.log("response", response);
      const payload    = response?.data || response;
      const data       = payload?.data || response.data?.data || response.data || [];
      const totalCount = payload?.total || response.meta?.total || response.total || data.length || 0;

      const formattedRows = data.map((item) => {
        let snapshot = item.snapshot_data;
        if (typeof snapshot === 'string') {
          try { snapshot = JSON.parse(snapshot); } catch { snapshot = {}; }
        }

        // Resolve preferred exam cities (handle hash ids, objects, or strings)
        const resolveCity = (c) => {
          let cityName = typeof c === 'string' ? c : (c.city || c.name);
          const cityMap = {
            'zlJB4eA4yegp': 'Muzaffarabad',
            'JoawKZG4QNM9': 'Rawalakot',
            'MirpurHashID': 'Mirpur',
          };
          if (cityMap[cityName]) {
            cityName = cityMap[cityName];
          }
          return cityName;
        };

        // Resolve advertisement number (handle hash ids from candidate portal)
        const resolveAdvertisementNo = (adNo) => {
          if (!adNo) return 'N/A';
          if (advertisementMap[adNo]) return advertisementMap[adNo];
          const adMap = {
            'XlGDW6zJWmk6': 'Assistant Program Officer',
            // Add more mappings as needed
          };
          return adMap[adNo] || adNo;
        };
        const resolvedExamCities = (item.preferred_exam_cities || []).map(resolveCity);
        const domicile = snapshot?.domicile_district || item.candidate?.domicile_district || item.snapshot_data?.domicile_district;

        // Pull candidate photo, CNIC-front and CNIC-back document images so they can be
        // shown in the list and forwarded to the admin DB on status updates.
        const documents = item.candidate?.documents || item.documents || [];
        const cnicFrontDoc = documents.find((doc) => doc.doc_type === 'cnic_front');
        const cnicBackDoc = documents.find((doc) => doc.doc_type === 'cnic_back');
        const photoDoc = documents.find((doc) => doc.doc_type === 'photo');

        // Admin DB is the source of truth for status (overlaid via _admin_status).
        // Fall back to candidate status, masking the implicit 'submitted' as blank.
        const effectiveStatus = item._admin_status !== null && item._admin_status !== undefined
          ? item._admin_status
          : (item.status === 'submitted' || !item.status ? '' : item.status);

        return {
          id:      item.application_number || item.id,
          hash_id: item.hash_id || item.id,
          // Live candidate record preferred over snapshot_data (frozen at
          // submission time) — admin profile edits only ever update the live
          // record, so snapshot-first would make edits (e.g. CNIC changes)
          // never show up here even though they saved correctly.
          applicant_name:  item.candidate?.name || snapshot?.name || item.profile?.full_name || 'N/A',
          cnic:            item.candidate?.cnic || snapshot?.cnic || item.profile?.cnic || 'N/A',
          // item.job.post_title and the top-level item.advertisement_no are
          // the real fields the candidate portal's /applications list
          // actually returns (confirmed live) — always present, regardless
          // of whether this application has ever been synced to the admin
          // DB. item.job_post (wrong field name) never existed, which is
          // why job_title/advertisement_no used to silently fall through to
          // 'N/A' for any application the admin hadn't already touched.
          job_title:       item.job?.post_title || item._job_designation || item.job_post?.post_title || 'N/A',
          job_post_id:     item.job_post_id || null,
          advertisement_no: resolveAdvertisementNo(item.advertisement_no || item.job?.adv_number || item.job_post?.ext_adv_id || 'N/A'),
          status:          effectiveStatus,
          applied_at_raw:  item.submitted_at || item.created_at || null,
          applied_at: (item.submitted_at || item.created_at)
            ? formatDate(item.submitted_at || item.created_at)
            : 'N/A',
          ocr_batch:       getApplicationOcrBatch(item.candidate?.documents || item.documents || []),
          eligibility_age_passed:       item.eligibility_summary?.checks?.age_passed,
          eligibility_district_passed:  item.eligibility_summary?.checks?.district_passed,
          eligibility_education_passed: item.eligibility_summary?.checks?.qualification_passed,
          payment_status: item.payment_summary?.status || item.payment?.payment_status || 'N/A',
          payment_amount: item.payment_summary?.amount_paid ?? item.payment?.amount ?? 'N/A',
          payment_psid:   item.payment_summary?.psid_number || item.payment?.psid_number || 'N/A',
          has_disability:  !!(item.candidate?.disability),
          disability_type: item.candidate?.disability?.disability_type || null,
          disability:      item.candidate?.disability || null,
          domicile_district: domicile,
          preferred_exam_cities: resolvedExamCities,
          cnic_front_url: cnicFrontDoc?.file_url || null,
          cnic_back_url: cnicBackDoc?.file_url || null,
          photo_url: photoDoc?.file_url || item.candidate?.profile_photo_url || null,
        };
      });

      const locallyFilteredRows = formattedRows.filter((row) => {
        const searchText = (filters.search || '').toLowerCase().trim();
        const searchMatch = !searchText
          || (row.applicant_name || '').toLowerCase().includes(searchText)
          || (row.cnic || '').toLowerCase().includes(searchText);

        const jobMatch = !filters.job_id || (row.advertisement_no || '') === filters.job_id;

        const statusMatch = !filters.status
          || (filters.status === UNREVIEWED_SENTINEL
            ? !row.status
            : (row.status || '').toString().toLowerCase() === filters.status.toLowerCase());

        const rowDate    = row.applied_at_raw ? new Date(row.applied_at_raw) : null;
        const startMatch = !filters.start_date || (rowDate && rowDate >= new Date(`${filters.start_date}T00:00:00`));
        const endMatch   = !filters.end_date   || (rowDate && rowDate <= new Date(`${filters.end_date}T23:59:59`));

        const refMatch       = !filters.ref_id          || (row.id || '').toString().toLowerCase().includes(filters.ref_id.toLowerCase());
        const adNoMatch      = !filters.advertisement_no || (row.advertisement_no || '') === filters.advertisement_no;
        const paymentMatch   = !filters.payment_status  || (row.payment_status || '').toString().toLowerCase() === filters.payment_status.toLowerCase();
        const batchMatch     = !filters.ocr_batch       || (row.ocr_batch || '').toString().toLowerCase() === filters.ocr_batch.toLowerCase();
        const disabilityMatch = !filters.disability
          || (filters.disability === 'yes' && row.has_disability)
          || (filters.disability === 'no'  && !row.has_disability);

        return searchMatch && jobMatch && statusMatch && startMatch && endMatch && refMatch && adNoMatch && paymentMatch && batchMatch && disabilityMatch;
      });

      setRows(locallyFilteredRows);
      setTotal(
        (filters.ref_id || filters.job_id || filters.advertisement_no || filters.payment_status || filters.ocr_batch || filters.disability)
          ? locallyFilteredRows.length
          : totalCount
      );
    } catch (err) {
      setApiError(err.message || 'Failed to fetch applications');
      toast.error(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [filters, advertisementMap]);

  useEffect(() => {
    const timer = setTimeout(fetchApplications, 500);
    return () => clearTimeout(timer);
  }, [fetchApplications]);


  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleMenuOpen  = (event, row) => { setAnchorEl(event.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const handleView = () => {
    if (selectedRow) navigate(`/dashboard/applications/${selectedRow.hash_id}`);
    handleMenuClose();
  };

  // Exports whatever is currently loaded/filtered in `rows` (the list is
  // already fetched in full — up to 1000 records — and filtered client-side,
  // so no separate backend export endpoint is needed here).
  const handleExportExcel = () => {
    if (rows.length === 0) {
      toast.error('No applications to export');
      return;
    }
    const data = rows.map((row) => ({
      'Ref ID': row.id,
      'Applicant Name': row.applicant_name,
      // Formatted with hyphens rather than the raw 13-digit string — Excel's
      // SheetJS writer auto-detects a purely-numeric string as a number cell,
      // which then renders CNICs in scientific notation (e.g. 3.5202E+12).
      'CNIC': formatCNIC(row.cnic),
      'Job Advertisement': row.job_title,
      'Advertisement No': row.advertisement_no,
      'Applied At': row.applied_at,
      'Status': row.status || 'Unreviewed',
      'Domicile District': row.domicile_district || 'N/A',
      'Disability': row.has_disability ? (row.disability_type || 'Yes') : 'None',
      'Payment Status': row.payment_status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');
    XLSX.writeFile(workbook, `applications_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns = [
    { field: 'id',               headerName: 'Ref ID',           flex: 0.7, minWidth: 100 },
    { field: 'applicant_name',   headerName: 'Applicant Name',   flex: 1.1, minWidth: 150 },
    { field: 'cnic',             headerName: 'CNIC',             flex: 1,   minWidth: 150 },
    { field: 'job_title',        headerName: 'Job Advertisement', flex: 1.3, minWidth: 200 },
    { field: 'advertisement_no', headerName: 'Advertisement No', flex: 1,   minWidth: 155 },
    { field: 'applied_at',       headerName: 'Applied At',       flex: 0.8, minWidth: 105 },
    {
      field: 'has_disability',
      headerName: 'Disability',
      flex: 0.8,
      minWidth: 110,
      sortable: false,
      renderCell: (params) => params.value ? (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase border bg-purple-100 text-purple-700 border-purple-200 capitalize">
          {params.row.disability_type || 'Yes'}
        </span>
      ) : (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase border bg-slate-100 text-slate-400 border-slate-200">
          None
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 70,
      sortable: false,
      resizable: false,
      renderCell: (params) => (
        <IconButton onClick={(e) => handleMenuOpen(e, params.row)} size="small">
          <MoreVertical size={20} />
        </IconButton>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Applications Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and review all incoming job applications.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={loading || rows.length === 0}
              className="h-10 flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
            >
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button
              onClick={fetchApplications}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
              className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters — same AdvancedFilter (Search/Reset) pattern used across the admin portal */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Applications"
        />

        {/* API Error Banner */}
        {apiError && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to load applications</p>
              <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
              <p className="text-xs text-red-500 mt-1">Check your network connection or contact the system administrator.</p>
            </div>
          </div>
        )}

        {/* DataGrid */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="p-10 flex justify-center">
              <InlineLoader text="Loading applications..." variant="ring" size="lg" />
            </div>
          ) : !apiError && rows.length === 0 && !loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Eye size={32} className="text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">No applications found</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Applications appear here once candidates submit them through the candidate portal. Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <TooltipDataGrid
              rows={rows}
              columns={columns}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
              loading={loading}
              sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders':    { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                '& .MuiDataGrid-columnHeader':     { padding: '0 8px' },
                '& .MuiDataGrid-columnSeparator':  { color: '#cbd5e1', '&:hover': { color: '#10b981' } },
                '& .MuiDataGrid-cell':             { padding: '0 8px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#334155' },
                '& .MuiDataGrid-row':              { minHeight: '48px !important', '&:hover': { backgroundColor: '#f8fafc' } },
                '& .MuiDataGrid-footerContainer':  { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
                '& .MuiDataGrid-virtualScroller':  { overflowX: 'auto' },
              }}
            />
          )}
        </div>
      </div>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={handleView}>
          <Eye size={18} style={{ marginRight: '8px' }} className="text-blue-600" /> View Application
        </MenuItem>
      </Menu>
    </div>
  );
};

export default ApplicationsList;
