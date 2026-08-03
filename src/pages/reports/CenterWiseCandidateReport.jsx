import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Building2, Users, UserRound, UserRoundCheck } from 'lucide-react';
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

const EMPTY_STATS = { totalCenters: 0, totalCandidates: 0, maleCandidates: 0, femaleCandidates: 0 };

const mapRow = (row, index) => ({
  id: row.roll_no || `row-${index}`,
  srNo: row.sr_no,
  rollNo: row.roll_no,
  candidateName: row.candidate_name,
  fatherName: row.father_name,
  postName: row.post_name,
  advertisementNo: row.advertisement_no,
  examinationCenter: row.examination_center,
  gender: row.gender,
  district: row.district,
  badge: row.badge,
});

const CenterWiseCandidateReport = () => {
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
      const result = await ReportsApi.getCenterWiseCandidates({
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
        totalCenters:     payload.stats?.total_centers ?? 0,
        totalCandidates:  payload.stats?.total_candidates ?? 0,
        maleCandidates:   payload.stats?.male_candidates ?? 0,
        femaleCandidates: payload.stats?.female_candidates ?? 0,
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to load center-wise candidate report');
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
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 180 },
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 180 },
    { field: 'postName', headerName: 'Post Name', width: 150 },
    { field: 'advertisementNo', headerName: 'Advertisement No.', width: 170 },
    { field: 'examinationCenter', headerName: 'Examination Center', flex: 1, minWidth: 220 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    { field: 'district', headerName: 'District', width: 150 },
    { field: 'badge', headerName: 'Badge', width: 110 },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={MapPin}
          title="Center-wise Candidate Report"
          subtitle="Candidate allocation across examination centers"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Examination Logistics Reports' },
            { label: 'Center-wise Candidate Report' },
          ]}
        />

        {searching && rows.length === 0 ? (
          <StatCardsSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Total Centers" value={stats.totalCenters} icon={Building2} color="blue" />
            <SummaryCard label="Total Candidates" value={stats.totalCandidates.toLocaleString()} icon={Users} color="emerald" />
            <SummaryCard label="Male Candidates" value={stats.maleCandidates.toLocaleString()} icon={UserRound} color="violet" />
            <SummaryCard label="Female Candidates" value={stats.femaleCandidates.toLocaleString()} icon={UserRoundCheck} color="rose" />
          </div>
        )}

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Candidates"
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
          searchPlaceholder="Search by roll no, name, center..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalCount}
          resultsLabel="candidates"
          emptyTitle="No candidates found"
          emptyDescription="Try adjusting your filters or search criteria to find candidate records."
        />
      </div>
    </div>
  );
};

export default CenterWiseCandidateReport;
