import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileBarChart2, Users, UserRound, UserRoundCheck, Building2, Briefcase } from 'lucide-react';
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
  department: '',
  category: '',
  gender: '',
  district: '',
  degree: '',
  university: '',
  badge: '',
  dateFrom: '',
  dateTo: '',
};

const EMPTY_STATS = { totalApplications: 0, maleApplicants: 0, femaleApplicants: 0, totalDepartments: 0, totalPosts: 0 };

const mapRow = (row, index) => ({
  id: `${row.advertisement || ''}-${row.post_name || ''}-${row.department || ''}-${row.gender || ''}-${row.district || ''}-${row.degree || ''}-${index}`,
  srNo: row.sr_no,
  advertisement: row.advertisement,
  postName: row.post_name,
  department: row.department,
  category: row.category,
  gender: row.gender,
  district: row.district,
  degree: row.degree,
  university: row.university,
  badge: row.badge,
  totalApplications: row.total_applications,
});

const ApplicationSummaryReport = () => {
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

  // Filter dropdown options come from real data (distinct values actually
  // present on applications), not a fixed master list — see ReportController::filters().
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
      const result = await ReportsApi.getApplicationSummary({
        advertisement: appliedFilters.advertisement,
        post_name:     appliedFilters.postName,
        department:    appliedFilters.department,
        gender:        appliedFilters.gender,
        district:      appliedFilters.district,
        degree:        appliedFilters.degree,
        date_from:     appliedFilters.dateFrom,
        date_to:       appliedFilters.dateTo,
        search:        debouncedSearchTerm,
        page:          paginationModel.page + 1,
        per_page:      paginationModel.pageSize,
      });
      const payload = result?.data ?? {};
      const items = Array.isArray(payload.data) ? payload.data : [];
      setRows(items.map(mapRow));
      setTotalCount(payload.total ?? items.length);
      setStats({
        totalApplications: payload.stats?.total_applications ?? 0,
        maleApplicants:    payload.stats?.male_applicants ?? 0,
        femaleApplicants:  payload.stats?.female_applicants ?? 0,
        totalDepartments:  payload.stats?.total_departments ?? 0,
        totalPosts:        payload.stats?.total_posts ?? 0,
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to load application summary report');
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
    { name: 'advertisement', label: 'Advertisement', type: 'select', options: filterOptions?.advertisements || [] },
    { name: 'postName',      label: 'Post / Designation', type: 'select', options: filterOptions?.posts || [] },
    { name: 'department',    label: 'Department', type: 'select', options: filterOptions?.departments || [] },
    { name: 'category',      label: 'Category', type: 'select', options: filterOptions?.categories || [] },
    { name: 'gender',        label: 'Gender', type: 'select', options: filterOptions?.genders || [] },
    { name: 'district',      label: 'Domicile District', type: 'select', options: filterOptions?.districts || [] },
    { name: 'degree',        label: 'Degree', type: 'select', options: filterOptions?.degrees || [] },
    { name: 'university',    label: 'University', type: 'select', options: filterOptions?.universities || [] },
    { name: 'badge',         label: 'Badge', type: 'select', options: filterOptions?.badges || [] },
    { name: 'dateFrom',      label: 'Date From', type: 'date' },
    { name: 'dateTo',        label: 'Date To', type: 'date' },
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
    { field: 'advertisement', headerName: 'Advertisement', flex: 1, minWidth: 170 },
    { field: 'postName', headerName: 'Post Name', width: 150 },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 180 },
    { field: 'category', headerName: 'Category', width: 140 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    { field: 'district', headerName: 'District', width: 150 },
    { field: 'degree', headerName: 'Degree', width: 130 },
    { field: 'university', headerName: 'University', flex: 1, minWidth: 220 },
    { field: 'badge', headerName: 'Badge', width: 110 },
    { field: 'totalApplications', headerName: 'Total Applications', width: 160, type: 'number' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={FileBarChart2}
          title="Application Summary Report"
          subtitle="Application statistics across advertisements, posts, and departments"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Application & Candidate Reports' },
            { label: 'Application Summary Report' },
          ]}
        />

        {searching && rows.length === 0 ? (
          <StatCardsSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <SummaryCard label="Total Applications" value={stats.totalApplications.toLocaleString()} icon={Users} color="blue" />
            <SummaryCard label="Male Applicants" value={stats.maleApplicants.toLocaleString()} icon={UserRound} color="emerald" />
            <SummaryCard label="Female Applicants" value={stats.femaleApplicants.toLocaleString()} icon={UserRoundCheck} color="rose" />
            <SummaryCard label="Total Departments" value={stats.totalDepartments} icon={Building2} color="amber" />
            <SummaryCard label="Total Posts" value={stats.totalPosts} icon={Briefcase} color="violet" />
          </div>
        )}

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Applications"
          onSearch={handleSearch}
          searching={searching}
          showPdfExport={false}
        />

        <ReportTable
          rows={rows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by advertisement, post, department..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalCount}
          resultsLabel="rows"
          emptyTitle="No applications found"
          emptyDescription="Try adjusting your filters or search criteria to find application records."
        />
      </div>
    </div>
  );
};

export default ApplicationSummaryReport;
