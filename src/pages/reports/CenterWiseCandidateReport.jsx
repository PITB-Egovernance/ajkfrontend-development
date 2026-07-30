import React, { useMemo, useState } from 'react';
import { MapPin, Building2, Users, UserRound, UserRoundCheck } from 'lucide-react';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import {
  centerWiseCandidateRows,
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

const CenterWiseCandidateReport = () => {
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
    return centerWiseCandidateRows.filter((r) => {
      if (appliedFilters.advertisement && r.advertisementNo !== ADVERTISEMENTS.find((a) => a.value === appliedFilters.advertisement)?.label) return false;
      if (appliedFilters.postName && r.postName !== appliedFilters.postName) return false;
      if (appliedFilters.examinationCenter && r.examinationCenter !== appliedFilters.examinationCenter) return false;
      if (appliedFilters.shift && r.shift !== appliedFilters.shift) return false;
      if (appliedFilters.date && r.examDate !== appliedFilters.date) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const haystack = [r.rollNo, r.candidateName, r.fatherName, r.postName, r.examinationCenter, r.district].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [appliedFilters, searchTerm]);

  const stats = useMemo(() => {
    const totalCenters = new Set(filteredRows.map((r) => r.examinationCenter)).size;
    const totalCandidates = filteredRows.length;
    const maleCandidates = filteredRows.filter((r) => r.gender === 'Male').length;
    const femaleCandidates = filteredRows.filter((r) => r.gender === 'Female').length;
    return { totalCenters, totalCandidates, maleCandidates, femaleCandidates };
  }, [filteredRows]);

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

        {searching ? (
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
          rows={filteredRows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by roll no, name, center..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="candidates"
          emptyTitle="No candidates found"
          emptyDescription="Try adjusting your filters or search criteria to find candidate records."
        />
      </div>
    </div>
  );
};

export default CenterWiseCandidateReport;
