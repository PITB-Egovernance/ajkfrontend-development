import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
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
  id: row.roll_no || `row-${index}`,
  srNo: row.sr_no,
  rollNo: row.roll_no,
  candidateName: row.candidate_name,
  fatherName: row.father_name,
  advertisementNo: row.advertisement_no,
  post: row.post,
  interviewBoard: row.interview_board,
  interviewDate: row.interview_date,
  interviewTime: row.interview_time,
  venue: row.venue,
  status: row.status,
});

const InterviewSchedule = () => {
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
        const [general, interview] = await Promise.all([ReportsApi.getFilters(), ReportsApi.getInterviewFilters()]);
        setFilterOptions({ ...(general?.data ?? {}), ...(interview?.data ?? {}) });
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
      const result = await ReportsApi.getInterviewSchedule({
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
      toast.error(err?.message || 'Failed to load interview schedule');
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
    { name: 'advertisementNo', label: 'Advertisement', type: 'select', options: filterOptions?.advertisements || [] },
    { name: 'post',            label: 'Post', type: 'select', options: filterOptions?.posts || [] },
    { name: 'status',          label: 'Status', type: 'select', options: filterOptions?.interview_statuses || [] },
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
    { field: 'srNo', headerName: 'Sr No', width: 80 },
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 170 },
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 170 },
    { field: 'post', headerName: 'Post', width: 140 },
    { field: 'interviewBoard', headerName: 'Interview Board', width: 170 },
    { field: 'interviewDate', headerName: 'Interview Date', width: 140 },
    { field: 'interviewTime', headerName: 'Interview Time', width: 140 },
    { field: 'venue', headerName: 'Venue / Center', flex: 1, minWidth: 220 },
    {
      field: 'status', headerName: 'Status', width: 130, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={CalendarClock}
          title="Interview Schedule"
          subtitle="Complete interview scheduling information for board and time-slot assignment"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Interview / Viva Reports' },
            { label: 'Interview Schedule' },
          ]}
        />

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Schedule"
          onSearch={handleSearch}
          searching={searching}
          showPdfExport
          showExcelExport={false}
        />

        <ReportTable
          rows={rows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by candidate name, roll no, father name..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalCount}
          resultsLabel="candidates"
          emptyTitle="No interview schedule records found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default InterviewSchedule;
