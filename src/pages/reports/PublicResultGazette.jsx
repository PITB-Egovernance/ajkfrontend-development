import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollText, Users, CheckCircle2, Trophy, ListOrdered, Briefcase } from 'lucide-react';
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
  examination: '',
  status: '',
};

const EMPTY_STATS = {
  totalCandidates: 0,
  totalQualified: 0,
  totalSelected: 0,
  totalMeritCandidates: 0,
  totalVacancies: 0,
};

const mapRow = (row, index) => ({
  id: row.roll_no || `row-${index}`,
  srNo: row.sr_no,
  rollNo: row.roll_no,
  candidateName: row.candidate_name,
  fatherName: row.father_name,
  advertisementNo: row.advertisement_no,
  post: row.post,
  merit: row.merit,
  resultStatus: row.result_status,
  publicationStatus: row.publication_status,
});

const mapStats = (s) => ({
  totalCandidates: s?.total_candidates ?? 0,
  totalQualified: s?.total_qualified ?? 0,
  totalSelected: s?.total_selected ?? 0,
  totalMeritCandidates: s?.total_merit_candidates ?? 0,
  totalVacancies: s?.total_vacancies ?? 0,
});

const PublicResultGazette = () => {
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
        const [general, compliance] = await Promise.all([ReportsApi.getFilters(), ReportsApi.getComplianceFilters()]);
        setFilterOptions({ ...(general?.data ?? {}), ...(compliance?.data ?? {}) });
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
      const result = await ReportsApi.getPublicResultGazette({
        advertisement: appliedFilters.advertisementNo,
        post_name:     appliedFilters.post,
        examination:   appliedFilters.examination,
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
      toast.error(err?.message || 'Failed to load public result gazette');
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
    { name: 'advertisementNo', label: 'Advertisement No.', type: 'select', options: filterOptions?.advertisements || [] },
    { name: 'post',            label: 'Post', type: 'select', options: filterOptions?.posts || [] },
    { name: 'examination',     label: 'Examination', type: 'select', options: filterOptions?.examinations || [] },
    { name: 'status',          label: 'Result Status', type: 'select', options: filterOptions?.result_statuses || [] },
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
    examination:   appliedFilters.examination,
    status:        appliedFilters.status,
    search:        debouncedSearchTerm,
  });

  const handleExportExcel = () => ReportsApi.exportPublicResultGazetteExcel(exportParams());
  const handleExportPdf = () => ReportsApi.exportPublicResultGazettePdf(exportParams());

  const columns = [
    { field: 'srNo', headerName: 'Sr. No.', width: 90 },
    { field: 'rollNo', headerName: 'Roll No.', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 180 },
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 180 },
    { field: 'advertisementNo', headerName: 'Advertisement No.', width: 180 },
    { field: 'post', headerName: 'Post', width: 150 },
    { field: 'merit', headerName: 'Merit', width: 100, type: 'number' },
    {
      field: 'resultStatus', headerName: 'Result Status', width: 150, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
    {
      // reporting latest.pdf §3.1: merit lists must be versioned (provisional
      // vs. final) — sourced from the real ResultPublication.status for this
      // candidate's job post, not derived/guessed.
      field: 'publicationStatus', headerName: 'Publication Status', width: 170, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={ScrollText}
          title="Public Result Gazette"
          subtitle="Final, publishable result / merit list"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Compliance & Public Reports' },
            { label: 'Public Result Gazette' },
          ]}
        />

        {searching && rows.length === 0 ? (
          <StatCardsSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <SummaryCard label="Total Candidates" value={stats.totalCandidates.toLocaleString()} icon={Users} color="blue" />
            <SummaryCard label="Total Qualified" value={stats.totalQualified.toLocaleString()} icon={CheckCircle2} color="violet" />
            <SummaryCard label="Total Selected" value={stats.totalSelected.toLocaleString()} icon={Trophy} color="emerald" />
            <SummaryCard label="Total Merit Candidates" value={stats.totalMeritCandidates.toLocaleString()} icon={ListOrdered} color="amber" />
            <SummaryCard label="Total Vacancies" value={stats.totalVacancies.toLocaleString()} icon={Briefcase} color="blue" />
          </div>
        )}

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Result Gazette"
          onSearch={handleSearch}
          searching={searching}
          showPdfExport
          showExcelExport
          pdfExportLabel="Download PDF"
          excelExportLabel="Download Excel"
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
          emptyTitle="No result records found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default PublicResultGazette;
