import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSignature, Users, Percent, TrendingUp, TrendingDown, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import StatusBadge from 'components/reports/StatusBadge';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import ReportsApi from 'api/reportsApi';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  status: '',
};

const EMPTY_STATS = {
  totalCandidates: 0,
  averageMarks: 0,
  highestMarks: 0,
  lowestMarks: 0,
  completedEvaluations: 0,
  pendingEvaluations: 0,
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
  interviewMarks: row.interview_marks,
  totalInterviewMarks: row.total_interview_marks,
  percentage: row.percentage,
  remarks: row.remarks,
  status: row.status,
});

const mapStats = (s) => ({
  totalCandidates: s?.total_candidates ?? 0,
  averageMarks: s?.average_marks ?? 0,
  highestMarks: s?.highest_marks ?? 0,
  lowestMarks: s?.lowest_marks ?? 0,
  completedEvaluations: s?.completed_evaluations ?? 0,
  pendingEvaluations: s?.pending_evaluations ?? 0,
});

const InterviewMarksCompilation = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);
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
      const result = await ReportsApi.getInterviewMarksCompilation({
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
      setStats(mapStats(payload.stats));
    } catch (err) {
      toast.error(err?.message || 'Failed to load interview marks compilation');
      setRows([]);
      setTotalCount(0);
      setStats(EMPTY_STATS);
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
    { name: 'status',          label: 'Status', type: 'select', options: filterOptions?.evaluation_statuses || [] },
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
    { field: 'interviewMarks', headerName: 'Interview Marks', width: 140, type: 'number',
      renderCell: (p) => (p.value ?? <span className="text-slate-400 text-xs">—</span>) },
    { field: 'totalInterviewMarks', headerName: 'Total Interview Marks', width: 180, type: 'number' },
    { field: 'percentage', headerName: 'Percentage', width: 120,
      renderCell: (p) => (p.value != null ? `${p.value}%` : <span className="text-slate-400 text-xs">—</span>) },
    { field: 'remarks', headerName: 'Remarks', flex: 1, minWidth: 220 },
    {
      field: 'status', headerName: 'Status', width: 130, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={FileSignature}
          title="Interview Marks Compilation"
          subtitle="Interview marks awarded by interview boards"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Interview / Viva Reports' },
            { label: 'Interview Marks Compilation' },
          ]}
        />

        {searching && rows.length === 0 ? (
          <StatCardsSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Candidates" value={stats.totalCandidates.toLocaleString()} icon={Users} color="blue" />
            <SummaryCard label="Average Marks" value={stats.averageMarks} icon={Percent} color="emerald" />
            <SummaryCard label="Highest Marks" value={stats.highestMarks} icon={TrendingUp} color="violet" />
            <SummaryCard label="Lowest Marks" value={stats.lowestMarks} icon={TrendingDown} color="amber" />
            <SummaryCard label="Completed Evaluations" value={stats.completedEvaluations.toLocaleString()} icon={CheckCircle2} color="emerald" />
            <SummaryCard label="Pending Evaluations" value={stats.pendingEvaluations.toLocaleString()} icon={Clock} color="rose" />
          </div>
        )}

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Marks"
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
          searchPlaceholder="Search by candidate name, roll no, father name..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalCount}
          resultsLabel="candidates"
          emptyTitle="No interview marks found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default InterviewMarksCompilation;
