import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import toast from 'react-hot-toast';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import StatusBadge from 'components/reports/StatusBadge';
import ReportsApi from 'api/reportsApi';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  status: '',
};

const mapRow = (row, index) => ({
  id: row.complaint_id || `row-${index}`,
  complaintId: row.complaint_id,
  candidateName: row.candidate_name,
  rollNo: row.roll_no,
  advertisementNo: row.advertisement_no,
  post: row.post,
  complaintType: row.complaint_type,
  complaintDate: row.complaint_date,
  assignedOfficer: row.assigned_officer,
  status: row.status,
  resolutionDate: row.resolution_date,
  remarks: row.remarks,
});

const GrievanceComplaintTracking = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filterOptions, setFilterOptions] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [general, admin] = await Promise.all([ReportsApi.getFilters(), ReportsApi.getAdminAuditFilters()]);
        setFilterOptions({ ...(general?.data ?? {}), ...(admin?.data ?? {}) });
      } catch (err) {
        toast.error(err?.message || 'Failed to load filter options');
        setFilterOptions({});
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPaginationModel((p) => ({ ...p, page: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const fetchReport = useCallback(async () => {
    setSearching(true);
    try {
      const result = await ReportsApi.getGrievanceComplaints({
        advertisement: appliedFilters.advertisementNo,
        post_name:     appliedFilters.post,
        status:        appliedFilters.status,
        search:        debouncedSearchTerm,
        page:          paginationModel.page + 1,
        per_page:      paginationModel.pageSize,
      });
      const payload = result?.data ?? {};
      const items = Array.isArray(payload.data) ? payload.data : [];
      setRows(items.map(mapRow));
      setTotalCount(payload.total ?? items.length);
    } catch (err) {
      toast.error(err?.message || 'Failed to load grievance / complaint tracking report');
      setRows([]);
      setTotalCount(0);
    } finally {
      setSearching(false);
    }
  }, [appliedFilters, debouncedSearchTerm, paginationModel]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filterConfig = useMemo(() => ([
    { name: 'advertisementNo', label: 'Advertisement No', type: 'select', options: filterOptions?.advertisements || [] },
    { name: 'post',            label: 'Post', type: 'select', options: filterOptions?.posts || [] },
    { name: 'status',          label: 'Status', type: 'select', options: filterOptions?.complaint_statuses || [] },
  ]), [filterOptions]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const handleSearch = () => {
    setAppliedFilters(filters);
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const columns = [
    { field: 'complaintId', headerName: 'Complaint ID', width: 150 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    { field: 'rollNo', headerName: 'Roll Number', width: 130 },
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 170 },
    { field: 'post', headerName: 'Post', width: 140 },
    { field: 'complaintType', headerName: 'Complaint Type', width: 200 },
    { field: 'complaintDate', headerName: 'Complaint Date', width: 140 },
    { field: 'assignedOfficer', headerName: 'Assigned Officer', width: 170 },
    {
      field: 'status', headerName: 'Current Status', width: 150, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
    { field: 'resolutionDate', headerName: 'Resolution Date', width: 150,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    { field: 'remarks', headerName: 'Remarks', flex: 1, minWidth: 220 },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={MessageSquareWarning}
          title="Grievance / Complaint Tracking"
          subtitle="Complete status of candidate complaints, appeals, and grievance resolution"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Administrative & Audit Reports' },
            { label: 'Grievance / Complaint Tracking' },
          ]}
        />

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Complaints"
          onSearch={handleSearch}
          searching={searching}
          showPdfExport={false}
          showExcelExport
        />

        <ReportTable
          rows={rows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by candidate name, roll no, complaint ID..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalCount}
          resultsLabel="complaints"
          emptyTitle="No complaints found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default GrievanceComplaintTracking;
