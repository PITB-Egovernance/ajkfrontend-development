import React, { useState, useEffect, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem, TextField, MenuItem as SelectItem } from '@mui/material';
import { Eye, CheckCircle, XCircle, MoreVertical, RefreshCw, FilterX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InlineLoader } from 'components/ui/Loader';
import Button from 'components/ui/Button';
import ApplicationApi from 'api/applicationApi';
import AdvertisementApi from 'api/advertisementApi'; // we will use this to fetch jobs for dropdown
import toast from 'react-hot-toast';
import {
  getApplicationOcrBatch,
  getApplicationOcrBatchLabel,
  getApplicationOcrBatchPillClass,
} from 'utils/applicationOcrUtils';

const ApplicationsList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [jobs, setJobs] = useState([]);
  
  // Filtering state
  const [filters, setFilters] = useState({
    ref_id: '',
    job_id: '',
    advertisement_no: '',
    status: '',
    payment_status: '',
    start_date: '',
    end_date: '',
    search: '',
    ocr_batch: ''
  });

  const defaultFilters = {
    ref_id: '',
    job_id: '',
    advertisement_no: '',
    status: '',
    payment_status: '',
    start_date: '',
    end_date: '',
    search: '',
    ocr_batch: ''
  };
  
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [selectionModel, setSelectionModel] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);


  // Fetch Jobs for the filter dropdown
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Just an example, maybe there's a dedicated endpoint for jobs dropdown
        const res = await AdvertisementApi.getAll(1); 
        // Depending on the structure of your response, adapt this:
        const data = res.data?.data || res.data || [];
        setJobs(data);
      } catch (error) {
        console.error('Failed to fetch jobs', error);
      }
    };
    fetchJobs();
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: paginationModel.page + 1,
        per_page: paginationModel.pageSize,
        search: filters.search,
        job_id: filters.job_id,
        status: filters.status,
        start_date: filters.start_date,
        end_date: filters.end_date,
      };
      const response = await ApplicationApi.getAll(params);
      
      const payload = response?.data || response;
      let data = payload?.data || response.data?.data || response.data || [];
      let totalCount = payload?.total || response.meta?.total || response.total || data.length || 0;
      
      // MOCK DATA FALLBACK removed
      
      const formattedRows = data.map((item) => {
        // Handle snapshot_data which might be a string
        let snapshot = item.snapshot_data;
        if (typeof snapshot === 'string') {
          try { snapshot = JSON.parse(snapshot); } catch (e) { snapshot = {}; }
        }

        return {
          id: item.hash_id || item.id,
          applicant_name: snapshot?.name || item.candidate?.name || item.profile?.full_name || 'N/A',
          cnic: snapshot?.cnic || item.candidate?.cnic || item.profile?.cnic || 'N/A',
          job_title: item.job_post?.post_title || item.job_post?.title || item.job?.title || item.advertisement?.title || 'N/A',
          job_post_id: item.job_post_id || item.job_post?.id || item.job?.id || item.advertisement?.id || null,
          advertisement_no: item.advertisement_no || item.job_post?.ext_adv_id || item.job_post?.adv_number || 'N/A',
          status: item.status || 'Pending',
          applied_at_raw: item.submitted_at || item.created_at || null,
          applied_at: item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : (item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'),
          ocr_batch: getApplicationOcrBatch(item.documents || item.candidate?.documents || []),
          eligibility_age_passed: item.eligibility_summary?.checks?.age_passed,
          eligibility_district_passed: item.eligibility_summary?.checks?.district_passed,
          eligibility_education_passed: item.eligibility_summary?.checks?.qualification_passed,
          payment_status: item.payment_summary?.status || item.payment?.payment_status || 'N/A',
          payment_amount: item.payment_summary?.amount_paid ?? item.payment?.amount ?? 'N/A',
          payment_psid: item.payment_summary?.psid_number || item.payment?.psid_number || 'N/A',
        };
      });
      
      const selectedJob = jobs.find((job) => (job.hash_id || job.id)?.toString() === filters.job_id?.toString());
      const selectedJobTitle = (selectedJob?.title || selectedJob?.designation || '').toLowerCase();

      const locallyFilteredRows = formattedRows.filter((row) => {
        const searchText = (filters.search || '').toLowerCase().trim();
        const searchMatch = !searchText
          || (row.applicant_name || '').toLowerCase().includes(searchText)
          || (row.cnic || '').toLowerCase().includes(searchText);

        const jobMatch = !filters.job_id
          || (selectedJobTitle && (row.job_title || '').toLowerCase().includes(selectedJobTitle))
          || (row.job_post_id !== null && row.job_post_id?.toString() === filters.job_id?.toString());

        const statusMatch = !filters.status
          || (row.status || '').toString().toLowerCase() === filters.status.toLowerCase();

        const rowDate = row.applied_at_raw ? new Date(row.applied_at_raw) : null;
        const startMatch = !filters.start_date || (rowDate && rowDate >= new Date(`${filters.start_date}T00:00:00`));
        const endMatch = !filters.end_date || (rowDate && rowDate <= new Date(`${filters.end_date}T23:59:59`));

        const refMatch = !filters.ref_id || (row.id || '').toString().toLowerCase().includes(filters.ref_id.toLowerCase());
        const adNoMatch = !filters.advertisement_no || (row.advertisement_no || '').toString().toLowerCase().includes(filters.advertisement_no.toLowerCase());
        const paymentMatch = !filters.payment_status || (row.payment_status || '').toString().toLowerCase() === filters.payment_status.toLowerCase();
        const batchMatch = !filters.ocr_batch || (row.ocr_batch || '').toString().toLowerCase() === filters.ocr_batch.toLowerCase();
        return searchMatch && jobMatch && statusMatch && startMatch && endMatch && refMatch && adNoMatch && paymentMatch && batchMatch;
      });

      setRows(locallyFilteredRows);
      setTotal(
        (filters.ref_id || filters.advertisement_no || filters.payment_status || filters.ocr_batch)
          ? locallyFilteredRows.length
          : totalCount
      );
    } catch (err) {
      toast.error(err.message || 'Failed to fetch applications');
      console.error(err);
      
    } finally {
      setLoading(false);
    }
  }, [paginationModel, filters]);

  useEffect(() => {
    // Implementing debounce for search
    const delayDebounceFn = setTimeout(() => {
      fetchApplications();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchApplications]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPaginationModel(prev => ({ ...prev, page: 0 })); // Reset page
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleView = () => {
    if (selectedRow) {
      navigate(`/dashboard/applications/${selectedRow.id}`);
    }
    handleMenuClose();
  };

  const updateStatus = async (id, status) => {
    try {
      // Optimistic update
      setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      await ApplicationApi.updateStatus(id, status);
      toast.success(`Application marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
      fetchApplications(); // Revert on failure
    }
    handleMenuClose();
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectionModel.length === 0) return;
    try {
      setRows(prev => prev.map(r => selectionModel.includes(r.id) ? { ...r, status } : r));
      await ApplicationApi.bulkUpdateStatus(selectionModel, status);
      toast.success(`${selectionModel.length} applications marked as ${status}`);
      setSelectionModel([]);
    } catch (error) {
      toast.error('Failed to update bulk status');
      fetchApplications();
    }
  };

  const getStatusColor = (status) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (lowerStatus === 'shortlisted') return 'bg-green-100 text-green-700';
    if (lowerStatus === 'rejected') return 'bg-red-100 text-red-700';
    if (lowerStatus === 'interview') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const columns = [
    { field: 'id', headerName: 'Ref ID', width: 100 },
    { field: 'applicant_name', headerName: 'Applicant Name', flex: 1 },
    { field: 'cnic', headerName: 'CNIC', width: 160 },
    { field: 'job_title', headerName: 'Job Advertisement', flex: 1 },
    { field: 'advertisement_no', headerName: 'Advertisement No', width: 160 },
    { field: 'applied_at', headerName: 'Applied At', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(params.value)}`}>
          {params.value}
        </span>
      ),
    },
    {
      field: 'ocr_batch',
      headerName: 'Batch',
      width: 110,
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
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${params.value?.toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
          {params.value || 'N/A'}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
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

        {/* Filter Section */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap xl:flex-nowrap gap-4 items-end">
          <TextField
            label="Search (Name/CNIC)"
            variant="outlined"
            size="small"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            className="w-full md:w-64"
          />
          <TextField
            label="Ref ID"
            variant="outlined"
            size="small"
            name="ref_id"
            value={filters.ref_id}
            onChange={handleFilterChange}
            className="w-full md:w-40"
          />
          <TextField
            select
            label="Job Advertisement"
            variant="outlined"
            size="small"
            name="job_id"
            value={filters.job_id}
            onChange={handleFilterChange}
            className="w-full md:w-64"
          >
            <SelectItem value="">All Jobs</SelectItem>
            {jobs.map(job => (
              <SelectItem key={job.hash_id || job.id} value={job.hash_id || job.id}>
                {job.title || job.designation || `Job #${job.id}`}
              </SelectItem>
            ))}
          </TextField>
          <TextField
            label="Advertisement No"
            variant="outlined"
            size="small"
            name="advertisement_no"
            value={filters.advertisement_no}
            onChange={handleFilterChange}
            className="w-full md:w-56"
          />
          <TextField
            select
            label="Status"
            variant="outlined"
            size="small"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full md:w-48"
          >
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Shortlisted">Shortlisted</SelectItem>
            <SelectItem value="Interview">Interview</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </TextField>
          <TextField
            select
            label="Payment Status"
            variant="outlined"
            size="small"
            name="payment_status"
            value={filters.payment_status}
            onChange={handleFilterChange}
            className="w-full md:w-44"
          >
            <SelectItem value="">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </TextField>
          <TextField
            select
            label="OCR Verification"
            variant="outlined"
            size="small"
            name="ocr_batch"
            value={filters.ocr_batch}
            onChange={handleFilterChange}
            className="w-full md:w-48"
          >
            <SelectItem value="">All Batches</SelectItem>
            <SelectItem value="green">OCR Verified</SelectItem>
            <SelectItem value="yellow">OCR Partially Verified</SelectItem>
            <SelectItem value="red">OCR Not Verified</SelectItem>
          </TextField>
          <TextField
            type="date"
            label="Applied At (From)"
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
            name="start_date"
            value={filters.start_date}
            onChange={handleFilterChange}
          />
          <TextField
            type="date"
            label="Applied At (To)"
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
            name="end_date"
            value={filters.end_date}
            onChange={handleFilterChange}
          />
          <Button
            variant="outline"
            size="md"
            onClick={handleClearFilters}
            className="h-[33.07px] w-[33.07px] min-w-[33.07px] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            title="Clear Filters"
            aria-label="Clear Filters"
          >
            <FilterX size={16} />
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={fetchApplications}
            disabled={loading}
            className="h-[33.07px] w-[33.07px] min-w-[33.07px] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            title="Refresh List"
            aria-label="Refresh List"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectionModel.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg mb-4 flex items-center justify-between shadow-sm">
            <span className="text-emerald-800 font-medium">{selectionModel.length} applications selected</span>
            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkStatusUpdate('Shortlisted')} 
                variant="primary"
                size="sm"
              >
                Shortlist Selected
              </Button>
              <Button
                onClick={() => handleBulkStatusUpdate('Rejected')} 
                variant="destructive"
                size="sm"
              >
                Reject Selected
              </Button>
            </div>
          </div>
        )}

        {/* DataGrid */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading && rows.length === 0 ? (
            <div className="p-10 flex justify-center"><InlineLoader text="Loading applications..." variant="ring" size="lg" /></div>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              paginationMode="server"
              rowCount={total}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50]}
              checkboxSelection
              onRowSelectionModelChange={(newSelection) => {
                setSelectionModel(newSelection);
              }}
              rowSelectionModel={selectionModel}
              disableRowSelectionOnClick
              autoHeight
              loading={loading}
              sx={{
                '& .MuiDataGrid-row': { minHeight: '52px !important' },
              }}
            />
          )}
        </div>
      </div>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleView}>
          <Eye size={18} style={{ marginRight: '8px' }} className="text-blue-600" /> View Details
        </MenuItem>
        <MenuItem onClick={() => updateStatus(selectedRow?.id, 'Shortlisted')}>
          <CheckCircle size={18} style={{ marginRight: '8px' }} className="text-green-600" /> Mark Shortlisted
        </MenuItem>
        <MenuItem onClick={() => updateStatus(selectedRow?.id, 'Interview')}>
          <CheckCircle size={18} style={{ marginRight: '8px' }} className="text-blue-600" /> Mark for Interview
        </MenuItem>
        <MenuItem onClick={() => updateStatus(selectedRow?.id, 'Rejected')}>
          <XCircle size={18} style={{ marginRight: '8px' }} className="text-red-600" /> Mark Rejected
        </MenuItem>
      </Menu>

    </div>
  );
};

export default ApplicationsList;
