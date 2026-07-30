import React, { useMemo, useState } from 'react';
import { FileBarChart2, Users, UserRound, UserRoundCheck, Building2, Briefcase } from 'lucide-react';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import {
  applicationSummaryRows,
  ADVERTISEMENTS,
  POSTS,
  DEPARTMENTS,
  CATEGORIES,
  GENDERS,
  DISTRICTS,
  DEGREES,
  UNIVERSITIES,
  BADGES,
} from 'pages/reports/mockData';

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

const ApplicationSummaryReport = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: 'advertisement', label: 'Advertisement', type: 'select', options: ADVERTISEMENTS },
    { name: 'postName',      label: 'Post / Designation', type: 'select', options: POSTS.map((p) => ({ value: p, label: p })) },
    { name: 'department',    label: 'Department', type: 'select', options: DEPARTMENTS.map((d) => ({ value: d, label: d })) },
    { name: 'category',      label: 'Category', type: 'select', options: CATEGORIES.map((c) => ({ value: c, label: c })) },
    { name: 'gender',        label: 'Gender', type: 'select', options: GENDERS.map((g) => ({ value: g, label: g })) },
    { name: 'district',      label: 'Domicile District', type: 'select', options: DISTRICTS.map((d) => ({ value: d, label: d })) },
    { name: 'degree',        label: 'Degree', type: 'select', options: DEGREES.map((d) => ({ value: d, label: d })) },
    { name: 'university',    label: 'University', type: 'select', options: UNIVERSITIES.map((u) => ({ value: u, label: u })) },
    { name: 'badge',         label: 'Badge', type: 'select', options: BADGES.map((b) => ({ value: b, label: b })) },
    { name: 'dateFrom',      label: 'Date From', type: 'date' },
    { name: 'dateTo',        label: 'Date To', type: 'date' },
  ];

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
    setSearching(true);
    setPaginationModel((p) => ({ ...p, page: 0 }));
    // Simulated network/query delay so the loading state is visible against mock data.
    setTimeout(() => {
      setAppliedFilters(filters);
      setSearching(false);
    }, 500);
  };

  const filteredRows = useMemo(() => {
    return applicationSummaryRows.filter((r) => {
      if (appliedFilters.advertisement && r.advertisement !== ADVERTISEMENTS.find((a) => a.value === appliedFilters.advertisement)?.label) return false;
      if (appliedFilters.postName && r.postName !== appliedFilters.postName) return false;
      if (appliedFilters.department && r.department !== appliedFilters.department) return false;
      if (appliedFilters.category && r.category !== appliedFilters.category) return false;
      if (appliedFilters.gender && r.gender !== appliedFilters.gender) return false;
      if (appliedFilters.district && r.district !== appliedFilters.district) return false;
      if (appliedFilters.degree && r.degree !== appliedFilters.degree) return false;
      if (appliedFilters.university && r.university !== appliedFilters.university) return false;
      if (appliedFilters.badge && r.badge !== appliedFilters.badge) return false;
      if (appliedFilters.dateFrom && r.submittedDate < appliedFilters.dateFrom) return false;
      if (appliedFilters.dateTo && r.submittedDate > appliedFilters.dateTo) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const haystack = [r.advertisement, r.postName, r.department, r.category, r.district, r.degree, r.university].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [appliedFilters, searchTerm]);

  const stats = useMemo(() => {
    const totalApplications = filteredRows.reduce((sum, r) => sum + r.totalApplications, 0);
    const maleApplicants = filteredRows.filter((r) => r.gender === 'Male').reduce((sum, r) => sum + r.totalApplications, 0);
    const femaleApplicants = filteredRows.filter((r) => r.gender === 'Female').reduce((sum, r) => sum + r.totalApplications, 0);
    const totalDepartments = new Set(filteredRows.map((r) => r.department)).size;
    const totalPosts = new Set(filteredRows.map((r) => r.postName)).size;
    return { totalApplications, maleApplicants, femaleApplicants, totalDepartments, totalPosts };
  }, [filteredRows]);

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

        {searching ? (
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
          rows={filteredRows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by advertisement, post, department..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="rows"
          emptyTitle="No applications found"
          emptyDescription="Try adjusting your filters or search criteria to find application records."
        />
      </div>
    </div>
  );
};

export default ApplicationSummaryReport;
