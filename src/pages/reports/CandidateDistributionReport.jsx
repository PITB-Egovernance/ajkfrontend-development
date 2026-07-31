import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PieChart, Building2, Users, Sunrise, Sunset } from 'lucide-react';
import toast from 'react-hot-toast';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import ReportsApi from 'api/reportsApi';

const EMPTY_FILTERS = {
  advertisement: '',
  postName: '',
  examinationCenter: '',
  shift: '',
  date: '',
};

const EMPTY_STATS = { totalCenters: 0, totalCandidates: 0, morningShift: 0, eveningShift: 0 };

const mapRow = (row, index) => ({
  id: `${row.center_name || ''}-${row.date || ''}-${row.time || ''}-${row.post_name || ''}-${index}`,
  srNo: row.sr_no,
  centerName: row.center_name,
  advertisementNo: row.advertisement_no,
  postName: row.post_name,
  date: row.date,
  time: row.time,
  shift: row.shift,
  totalCandidates: row.total_candidates,
});

const CandidateDistributionReport = () => {
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
      const result = await ReportsApi.getCandidateDistribution({
        advertisement: appliedFilters.advertisement,
        post_name:     appliedFilters.postName,
        exam_center:   appliedFilters.examinationCenter,
        shift:         appliedFilters.shift,
        date:          appliedFilters.date,
        search:        debouncedSearchTerm,
        page:          paginationModel.page + 1,
        per_page:      paginationModel.pageSize,
      });
      const payload = result?.data ?? {};
      const items = Array.isArray(payload.data) ? payload.data : [];
      setRows(items.map(mapRow));
      setTotalCount(payload.total ?? items.length);
      setStats({
        totalCenters:    payload.stats?.total_centers ?? 0,
        totalCandidates: payload.stats?.total_candidates ?? 0,
        morningShift:    payload.stats?.morning_shift ?? 0,
        eveningShift:    payload.stats?.evening_shift ?? 0,
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to load candidate distribution report');
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
    { name: 'advertisement',     label: 'Advertisement', type: 'select', options: filterOptions?.advertisements || [] },
    { name: 'postName',          label: 'Post', type: 'select', options: filterOptions?.posts || [] },
    { name: 'examinationCenter', label: 'Examination Center', type: 'select', options: filterOptions?.exam_centers || [] },
    { name: 'shift',             label: 'Shift', type: 'select', options: filterOptions?.shifts || [] },
    { name: 'date',              label: 'Date', type: 'date' },
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
    { field: 'srNo', headerName: '#', width: 65 },
    { field: 'centerName', headerName: 'Center Name', flex: 1, minWidth: 220 },
    { field: 'advertisementNo', headerName: 'Advertisement No.', width: 170 },
    { field: 'postName', headerName: 'Post Name', width: 150 },
    { field: 'date', headerName: 'Date', width: 120 },
    { field: 'time', headerName: 'Time', width: 110 },
    { field: 'shift', headerName: 'Shift', width: 110 },
    { field: 'totalCandidates', headerName: 'Total Candidates', width: 160, type: 'number' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={PieChart}
          title="Candidate Distribution Report"
          subtitle="Candidate distribution across centers, dates, and shifts"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Examination Logistics Reports', path: '/dashboard/reports/center-wise-candidates' },
            { label: 'Candidate Distribution Report' },
          ]}
        />

        {searching && rows.length === 0 ? (
          <StatCardsSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Total Centers" value={stats.totalCenters} icon={Building2} color="blue" />
            <SummaryCard label="Total Candidates" value={stats.totalCandidates.toLocaleString()} icon={Users} color="emerald" />
            <SummaryCard label="Morning Shift" value={stats.morningShift.toLocaleString()} icon={Sunrise} color="amber" />
            <SummaryCard label="Evening Shift" value={stats.eveningShift.toLocaleString()} icon={Sunset} color="violet" />
          </div>
        )}

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Distribution"
          onSearch={handleSearch}
          searching={searching}
          showPdfExport
        />

        <ReportTable
          rows={rows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by center, advertisement, shift..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalCount}
          resultsLabel="entries"
          emptyTitle="No distribution data found"
          emptyDescription="Try adjusting your filters or search criteria to find distribution records."
        />
      </div>
    </div>
  );
};

export default CandidateDistributionReport;
