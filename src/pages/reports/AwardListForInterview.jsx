import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award as AwardIcon } from 'lucide-react';
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
  district: '',
};

const mapRow = (row) => ({
  id: row.roll_no,
  srNo: row.sr_no,
  rollNo: row.roll_no,
  candidateName: row.candidate_name,
  fatherName: row.father_name,
  qualification: row.qualification,
  district: row.district,
  dateOfBirth: row.date_of_birth,
  advertisementNo: row.advertisement_no,
  post: row.post,
  gender: row.gender,
  interviewMarks: row.interview_marks,
  totalMarks: row.total_marks,
  finalStatus: row.final_status,
});

const AwardListForInterview = () => {
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
        const result = await ReportsApi.getFilters();
        setFilterOptions(result?.data ?? {});
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
      const result = await ReportsApi.getAwardListInterview({
        advertisement: appliedFilters.advertisementNo,
        post_name:     appliedFilters.post,
        gender:        appliedFilters.gender,
        district:      appliedFilters.district,
        search:        debouncedSearchTerm,
        page:          paginationModel.page + 1,
        per_page:      paginationModel.pageSize,
      });
      const payload = result?.data ?? {};
      const items = Array.isArray(payload.data) ? payload.data : [];
      setRows(items.map(mapRow));
      setTotalCount(payload.total ?? items.length);
    } catch (err) {
      toast.error(err?.message || 'Failed to load award list for interview');
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
    { name: 'district',        label: 'District', type: 'select', options: filterOptions?.districts || [] },
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

  const exportParams = () => ({
    advertisement: appliedFilters.advertisementNo,
    post_name:     appliedFilters.post,
    gender:        appliedFilters.gender,
    district:      appliedFilters.district,
    search:        debouncedSearchTerm,
  });

  const handleExportExcel = () => ReportsApi.exportAwardListInterviewExcel(exportParams());
  const handleExportPdf = () => ReportsApi.exportAwardListInterviewPdf(exportParams());

  const columns = [
    { field: 'srNo', headerName: 'Sr No', width: 80 },
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 170 },
    { field: 'qualification', headerName: 'Qualification', width: 170,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    { field: 'district', headerName: 'District', width: 150 },
    { field: 'dateOfBirth', headerName: 'Date of Birth', width: 130,
      renderCell: (p) => p.value || <span className="text-slate-400 text-xs">—</span> },
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 170 },
    { field: 'post', headerName: 'Post Name', width: 140 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    { field: 'interviewMarks', headerName: 'Interview Marks', width: 140, type: 'number',
      renderCell: (p) => (p.value === null || p.value === undefined ? <span className="text-slate-400 text-xs">Pending</span> : p.value) },
    { field: 'totalMarks', headerName: 'Total Marks', width: 120, type: 'number',
      renderCell: (p) => (p.value === null || p.value === undefined ? <span className="text-slate-400 text-xs">—</span> : p.value) },
    {
      field: 'finalStatus', headerName: 'Final Status', width: 160, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={AwardIcon}
          title="Award List for Interview"
          subtitle="Final interview award list"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Award List for Interview' },
          ]}
        />

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Candidates"
          onSearch={handleSearch}
          searching={searching}
          showPdfExport
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
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
          emptyTitle="No award list records found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default AwardListForInterview;
