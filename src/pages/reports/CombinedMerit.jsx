import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GitMerge } from 'lucide-react';
import toast from 'react-hot-toast';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import StatusBadge from 'components/reports/StatusBadge';
import ReportsApi from 'api/reportsApi';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  gender: '',
  status: '',
};

const mapRow = (row, index) => ({
  id: row.roll_no || `row-${index}`,
  meritRank: row.merit_rank,
  rollNo: row.roll_no,
  candidateName: row.candidate_name,
  fatherName: row.father_name,
  advertisementNo: row.advertisement_no,
  post: row.post,
  gender: row.gender,
  writtenMarks: row.written_marks,
  interviewMarks: row.interview_marks,
  aggregateMarks: row.aggregate_marks,
  finalPercentage: row.final_percentage,
  finalMeritStatus: row.final_merit_status,
  remarks: row.remarks,
});

const CombinedMerit = () => {
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
      const result = await ReportsApi.getCombinedMerit({
        advertisement: appliedFilters.advertisementNo,
        post_name:     appliedFilters.post,
        gender:        appliedFilters.gender,
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
      toast.error(err?.message || 'Failed to load combined merit report');
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
    { name: 'gender',          label: 'Gender', type: 'select', options: filterOptions?.genders || [] },
    { name: 'status',          label: 'Status', type: 'select', options: filterOptions?.merit_statuses || [] },
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
    { field: 'meritRank', headerName: 'Merit Rank', width: 110 },
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 170 },
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 170 },
    { field: 'post', headerName: 'Post', width: 140 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    { field: 'writtenMarks', headerName: 'Written Marks', width: 130, type: 'number' },
    { field: 'interviewMarks', headerName: 'Interview Marks', width: 140, type: 'number' },
    { field: 'aggregateMarks', headerName: 'Aggregate Marks', width: 150, type: 'number' },
    { field: 'finalPercentage', headerName: 'Final Percentage', width: 150, renderCell: (p) => `${p.value}%` },
    {
      field: 'finalMeritStatus', headerName: 'Final Merit Status', width: 170, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
    { field: 'remarks', headerName: 'Remarks', flex: 1, minWidth: 200,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={GitMerge}
          title="Combined Merit (Written + Interview)"
          subtitle="Final weighted merit list combining written examination and interview marks"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Interview / Viva Reports' },
            { label: 'Combined Merit (Written + Interview)' },
          ]}
        />

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Combined Merit"
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
          emptyTitle="No combined merit records found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default CombinedMerit;
