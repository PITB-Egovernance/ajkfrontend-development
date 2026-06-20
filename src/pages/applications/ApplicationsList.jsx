import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGridApiRef } from '@mui/x-data-grid';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { IconButton, Menu, MenuItem, TextField, MenuItem as SelectItem } from '@mui/material';
import { Eye, CheckCircle, XCircle, MoreVertical, RefreshCw, FilterX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InlineLoader } from 'components/ui/Loader';
import Button from 'components/ui/Button';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import ApplicationApi from 'api/applicationApi';
import toast from 'react-hot-toast';
import {
  getApplicationOcrBatch,
  getApplicationOcrBatchLabel,
  getApplicationOcrBatchPillClass,
} from 'utils/applicationOcrUtils';
import { formatDate } from 'utils/dateUtils';

// ── Module-level constants ────────────────────────────────────────────────────

const UNREVIEWED_SENTINEL = '__unreviewed__';

const DEFAULT_FILTERS = {
  ref_id: '', job_id: '', advertisement_no: '', status: '',
  payment_status: '', start_date: '', end_date: '',
  search: '', ocr_batch: '', disability: '',
};

const STATUS_COLORS = {
  shortlisted: 'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
  interview:   'bg-blue-100 text-blue-700',
};

const ApplicationsList = () => {
  const navigate = useNavigate();
  const apiRef = useGridApiRef();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [apiError, setApiError] = useState(null);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [selectionModel, setSelectionModel] = useState([]);
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

  // Derive unique jobs from loaded rows — useMemo avoids extra state + double-render.
  const jobs = useMemo(() => {
    const seen   = new Set();
    const unique = [];
    rows.forEach((row) => {
      const key = row.advertisement_no || row.job_title;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push({ id: row.advertisement_no, title: row.job_title, advertisement_no: row.advertisement_no });
      }
    });
    return unique;
  }, [rows]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      // UNREVIEWED_SENTINEL is a frontend-only token (no admin row with that status exists);
      // skip sending it to the server so the local filter can pick up rows whose status is empty.
      const params = {
        per_page: 1000,
        search: filters.search,
        job_id: filters.job_id,
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
          applicant_name:  snapshot?.name || item.candidate?.name || item.profile?.full_name || 'N/A',
          cnic:            snapshot?.cnic || item.candidate?.cnic || item.profile?.cnic || 'N/A',
          job_title:       item.job_post?.post_title || item.job_post?.title || item.job?.title || 'N/A',
          job_post_id:     item.job_post_id || null,
          advertisement_no: resolveAdvertisementNo(item.job_post?.ext_adv_id || item.advertisement_no || item.job_post?.adv_number || 'N/A'),
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
        const adNoMatch      = !filters.advertisement_no || (row.advertisement_no || '').toString().toLowerCase().includes(filters.advertisement_no.toLowerCase());
        const paymentMatch   = !filters.payment_status  || (row.payment_status || '').toString().toLowerCase() === filters.payment_status.toLowerCase();
        const batchMatch     = !filters.ocr_batch       || (row.ocr_batch || '').toString().toLowerCase() === filters.ocr_batch.toLowerCase();
        const disabilityMatch = !filters.disability
          || (filters.disability === 'yes' && row.has_disability)
          || (filters.disability === 'no'  && !row.has_disability);

        return searchMatch && jobMatch && statusMatch && startMatch && endMatch && refMatch && adNoMatch && paymentMatch && batchMatch && disabilityMatch;
      });

      setRows(locallyFilteredRows);
      setTotal(
        (filters.ref_id || filters.advertisement_no || filters.payment_status || filters.ocr_batch || filters.disability)
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

  useEffect(() => {
    if (!loading && rows.length > 0) {
      setTimeout(() => {
        apiRef.current?.autosizeColumns?.({
          includeOutliers: true,
          includeHeaders: true,
          expand: true,
        });
      }, 0);
    }
  }, [rows, loading, apiRef]);

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

  const updateStatus = async (id, status) => {
    try {
      const row = rows.find((r) => r.id === id);
      const payloadRow = {
      ...row,
      candidate_cnic: row?.cnic,
      cnic_front_path: row?.cnic_front_path,
      cnic_back_path: row?.cnic_back_path,
      photo_path: row?.photo_path,
      profile_photo_path: row?.profile_photo_path,
      profile_photo_url: row?.profile_photo_url,
    };

    console.log("Payload", payloadRow)
      // Optimistic update — set both `status` (display) and `_admin_status` (source of truth
      // for the effectiveStatus mapping). Without this, a later re-render (re-fetch or filter
      // change) maps the row back to '' because the candidate portal always returns 'submitted'.
      // setRows(prev => prev.map(r => r.id === id ? { ...r, status, _admin_status: status } : r));
      setRows(prev =>
      prev.map(r =>
        r.id === id ? { ...r, status, _admin_status: status } : r
      )
    );
      // await ApplicationApi.updateStatus(id, status, row);
      // toast.success(`Application marked as ${status}`);
      await ApplicationApi.updateStatus(id, status, payloadRow);

      toast.success(`Application marked as ${status}`);
    } catch (err) {
      // Surface backend message when available — the live API's updateStatus path can
      // return 404 "No query results for model [App\Models\ReceivedApplication]" when
      // the admin row hasn't been synced yet. applicationApi.updateStatus already
      // retries via /applications/bulk-status in that case, so this catch only fires
      // if both endpoints fail.
      const msg = err?.status === 404
        ? 'Status update failed: admin DB has no record for this application. Both single and bulk endpoints returned 404. The backend team needs to sync the application to admin DB, or relax the route-model binding on PUT /applications/{id}/status.'
        : (err?.message || 'Failed to update status');
      toast.error(msg);
      fetchApplications();
    }
    handleMenuClose();
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectionModel.length) return;
    try {
      // const selectedRows = rows.filter((r) => selectionModel.includes(r.id));
      const selectedRows = rows
      .filter((r) => selectionModel.includes(r.id))
      .map(row => ({
        ...row,
        candidate_cnic: row?.cnic,
        cnic_front_path: row?.cnic_front_path,
        cnic_back_path: row?.cnic_back_path,
        photo_path: row?.photo_path,
        profile_photo_path: row?.profile_photo_path,
        profile_photo_url: row?.profile_photo_url,
      }));
      // Same optimistic patch as updateStatus — also write _admin_status so the row keeps its
      // new status across re-fetches and filter changes.
      setRows(prev => prev.map(r => selectionModel.includes(r.id) ? { ...r, status, _admin_status: status } : r));
      // await ApplicationApi.bulkUpdateStatus(selectionModel, status, selectedRows);
      await ApplicationApi.bulkUpdateStatus(selectionModel, status, selectedRows);
      toast.success(`${selectionModel.length} applications marked as ${status}`);
      setSelectionModel([]);
    } catch {
      toast.error('Failed to update bulk status');
      fetchApplications();
    }
  };

  const getStatusColor = (status) => {
    const key = status?.toLowerCase() || '';
    if (!key) return 'bg-slate-100 text-slate-400';
    return STATUS_COLORS[key] ?? 'bg-gray-100 text-gray-700';
  };

  // ── Selection-aware shortlist state (for bulk action bar) ───────────────
  const selectedRows = useMemo(
    () => rows.filter((r) => selectionModel.includes(r.id)),
    [rows, selectionModel]
  );
  const anyShortlisted = selectedRows.some((r) => (r.status || '').toLowerCase() === 'shortlisted');
  const allShortlisted = selectedRows.length > 0 && selectedRows.every((r) => (r.status || '').toLowerCase() === 'shortlisted');

  const columns = [
    { field: 'id',               headerName: 'Ref ID',           minWidth: 100 },
    // {
    //   field: 'photo_url',
    //   headerName: 'Photo',
    //   minWidth: 70,
    //   sortable: false,
    //   renderCell: (params) => params.value ? (
    //     <a href={params.value} target="_blank" rel="noopener noreferrer">
    //       <img src={params.value} alt="Candidate" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
    //     </a>
    //   ) : <span className="text-slate-400 text-xs">—</span>,
    // },
    // {
    //   field: 'cnic_front_url',
    //   headerName: 'CNIC Front',
    //   minWidth: 90,
    //   sortable: false,
    //   renderCell: (params) => params.value ? (
    //     <a href={params.value} target="_blank" rel="noopener noreferrer">
    //       <img src={params.value} alt="CNIC Front" className="w-14 h-10 rounded object-cover border border-slate-200" />
    //     </a>
    //   ) : <span className="text-slate-400 text-xs">—</span>,
    // },
    { field: 'applicant_name',   headerName: 'Applicant Name',   minWidth: 150 },
    { field: 'cnic',             headerName: 'CNIC',             minWidth: 150 },
    { field: 'job_title',        headerName: 'Job Advertisement', minWidth: 170 },
    { field: 'advertisement_no', headerName: 'Advertisement No', minWidth: 155 },
    { field: 'applied_at',       headerName: 'Applied At',       minWidth: 105 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 115,
      renderCell: (params) => params.value ? (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(params.value)}`}>
          {params.value}
        </span>
      ) : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      field: 'ocr_batch',
      headerName: 'Batch',
      minWidth: 130,
      sortable: false,
      renderCell: (params) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${getApplicationOcrBatchPillClass(params.value)}`}>
          {getApplicationOcrBatchLabel(params.value)}
        </span>
      ),
    },
    {
      field: 'payment_status',
      headerName: 'Payment Status',
      minWidth: 130,
      sortable: false,
      renderCell: (params) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${params.value?.toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
          {params.value || 'N/A'}
        </span>
      ),
    },
    {
      field: 'has_disability',
      headerName: 'Disability',
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
      minWidth: 70,
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Applications Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and review all incoming job applications.</p>
          </div>
        </div>

        {/* Filter Section — single flex-wrap container so each row is fully packed */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex gap-3 items-end flex-wrap">
            <TextField label="Search (Name/CNIC)" variant="outlined" size="small" name="search"
              value={filters.search} onChange={handleFilterChange} sx={{ flex: '1 1 160px', minWidth: 140 }} />
            <TextField label="Ref ID" variant="outlined" size="small" name="ref_id"
              value={filters.ref_id} onChange={handleFilterChange} sx={{ width: 110 }} />
            <TextField select label="Job Advertisement" variant="outlined" size="small" name="job_id"
              value={filters.job_id} onChange={handleFilterChange} sx={{ flex: '1 1 140px', minWidth: 130 }}>
              <SelectItem value="">All Jobs</SelectItem>
              {jobs.map(job => (
                <SelectItem key={job.advertisement_no} value={job.advertisement_no}>{job.title}</SelectItem>
              ))}
            </TextField>
            <TextField label="Advertisement No" variant="outlined" size="small" name="advertisement_no"
              value={filters.advertisement_no} onChange={handleFilterChange} sx={{ width: 140 }} />
            <TextField select label="Status" variant="outlined" size="small" name="status"
              value={filters.status} onChange={handleFilterChange} sx={{ width: 130 }}>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value={UNREVIEWED_SENTINEL}>Unreviewed</SelectItem>
              <SelectItem value="Shortlisted">Shortlisted</SelectItem>
              <SelectItem value="Interview">Interview</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </TextField>
            <TextField select label="Payment Status" variant="outlined" size="small" name="payment_status"
              value={filters.payment_status} onChange={handleFilterChange} sx={{ width: 135 }}>
              <SelectItem value="">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </TextField>
            <TextField select label="OCR Verification" variant="outlined" size="small" name="ocr_batch"
              value={filters.ocr_batch} onChange={handleFilterChange} sx={{ width: 145 }}>
              <SelectItem value="">All Batches</SelectItem>
              <SelectItem value="green">OCR Verified</SelectItem>
              <SelectItem value="yellow">Partially Verified</SelectItem>
              <SelectItem value="red">Not Verified</SelectItem>
            </TextField>
            <TextField select label="Disability" variant="outlined" size="small" name="disability"
              value={filters.disability} onChange={handleFilterChange} sx={{ width: 125 }}>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="yes">Disabled</SelectItem>
              <SelectItem value="no">Not Disabled</SelectItem>
            </TextField>
            <TextField type="date" label="Applied At (From)" InputLabelProps={{ shrink: true }}
              variant="outlined" size="small" name="start_date"
              value={filters.start_date} onChange={handleFilterChange} sx={{ width: 170 }} />
            <TextField type="date" label="Applied At (To)" InputLabelProps={{ shrink: true }}
              variant="outlined" size="small" name="end_date"
              value={filters.end_date} onChange={handleFilterChange} sx={{ width: 170 }} />
            <Button variant="outline" size="md" onClick={handleClearFilters}
              className="h-[33.07px] w-[33.07px] min-w-[33.07px] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Clear Filters" aria-label="Clear Filters">
              <FilterX size={16} />
            </Button>
            <Button variant="outline" size="md" onClick={fetchApplications} disabled={loading}
              className="h-[33.07px] w-[33.07px] min-w-[33.07px] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Refresh List" aria-label="Refresh List">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectionModel.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg mb-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-emerald-800 font-medium">{selectionModel.length} applications selected</span>
              <div className="flex gap-2">
                {!anyShortlisted && (
                  <Button onClick={() => handleBulkStatusUpdate('Shortlisted')} variant="primary" size="sm">
                    Shortlist Selected
                  </Button>
                )}
                {anyShortlisted && (
                  <Button onClick={() => handleBulkStatusUpdate('submitted')} variant="outline" size="sm">
                    Unshortlist Selected
                  </Button>
                )}
                <Button onClick={() => handleBulkStatusUpdate('Rejected')} variant="destructive" size="sm">
                  Reject Selected
                </Button>
              </div>
            </div>
            {anyShortlisted && !allShortlisted && (
              <p className="text-amber-700 text-xs font-medium mt-2">
                You have selected an already shortlisted application. Please unshortlist it before shortlisting the rest.
              </p>
            )}
          </div>
        )}

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
              apiRef={apiRef}
              rows={rows}
              columns={columns}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50]}
              checkboxSelection
              onRowSelectionModelChange={(s) => setSelectionModel(s)}
              rowSelectionModel={selectionModel}
              disableRowSelectionOnClick
              autosizeOnMount
              autosizeOptions={{ includeOutliers: true, includeHeaders: true, expand: true }}
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
          <Eye size={18} style={{ marginRight: '8px' }} className="text-blue-600" /> View Details
        </MenuItem>
        {selectedRow?.status?.toLowerCase() === 'shortlisted' ? (
          <MenuItem onClick={() => updateStatus(selectedRow?.id, 'submitted')}>
            <RefreshCw size={18} style={{ marginRight: '8px' }} className="text-yellow-600" /> Unshortlist
          </MenuItem>
        ) : (
          <MenuItem onClick={() => updateStatus(selectedRow?.id, 'Shortlisted')}>
            <CheckCircle size={18} style={{ marginRight: '8px' }} className="text-green-600" /> Mark Shortlisted
          </MenuItem>
        )}
        <MenuItem onClick={() => updateStatus(selectedRow?.id, 'Rejected')}>
          <XCircle size={18} style={{ marginRight: '8px' }} className="text-red-600" /> Mark Rejected
        </MenuItem>
      </Menu>
    </div>
  );
};

export default ApplicationsList;
