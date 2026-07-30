import React, { useMemo, useState } from 'react';
import { PieChart, Building2, Users, Sunrise, Sunset } from 'lucide-react';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import {
  candidateDistributionRows,
  ADVERTISEMENTS,
  POSTS,
  EXAM_CENTERS,
  SHIFTS,
} from 'pages/reports/mockData';

const EMPTY_FILTERS = {
  advertisement: '',
  postName: '',
  examinationCenter: '',
  shift: '',
  date: '',
};

const CandidateDistributionReport = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: 'advertisement',     label: 'Advertisement', type: 'select', options: ADVERTISEMENTS },
    { name: 'postName',          label: 'Post', type: 'select', options: POSTS.map((p) => ({ value: p, label: p })) },
    { name: 'examinationCenter', label: 'Examination Center', type: 'select', options: EXAM_CENTERS.map((c) => ({ value: c, label: c })) },
    { name: 'shift',             label: 'Shift', type: 'select', options: SHIFTS.map((s) => ({ value: s, label: s })) },
    { name: 'date',              label: 'Date', type: 'date' },
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
    setTimeout(() => {
      setAppliedFilters(filters);
      setSearching(false);
    }, 500);
  };

  const filteredRows = useMemo(() => {
    return candidateDistributionRows.filter((r) => {
      if (appliedFilters.advertisement && r.advertisementNo !== ADVERTISEMENTS.find((a) => a.value === appliedFilters.advertisement)?.label) return false;
      if (appliedFilters.postName && r.postName !== appliedFilters.postName) return false;
      if (appliedFilters.examinationCenter && r.centerName !== appliedFilters.examinationCenter) return false;
      if (appliedFilters.shift && r.shift !== appliedFilters.shift) return false;
      if (appliedFilters.date && r.date !== appliedFilters.date) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const haystack = [r.centerName, r.advertisementNo, r.postName, r.shift].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [appliedFilters, searchTerm]);

  const stats = useMemo(() => {
    const totalCenters = new Set(filteredRows.map((r) => r.centerName)).size;
    const totalCandidates = filteredRows.reduce((sum, r) => sum + r.totalCandidates, 0);
    const morningShift = filteredRows.filter((r) => r.shift === 'Morning').reduce((sum, r) => sum + r.totalCandidates, 0);
    const eveningShift = filteredRows.filter((r) => r.shift === 'Evening').reduce((sum, r) => sum + r.totalCandidates, 0);
    return { totalCenters, totalCandidates, morningShift, eveningShift };
  }, [filteredRows]);

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

        {searching ? (
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
          rows={filteredRows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by center, advertisement, shift..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="entries"
          emptyTitle="No distribution data found"
          emptyDescription="Try adjusting your filters or search criteria to find distribution records."
        />
      </div>
    </div>
  );
};

export default CandidateDistributionReport;
