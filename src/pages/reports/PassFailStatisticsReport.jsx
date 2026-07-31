import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Users, CheckCircle2, XCircle, LayoutGrid } from 'lucide-react';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import PieChartCard from 'components/reports/PieChartCard';
import BarChartCard from 'components/reports/BarChartCard';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import reportsApi from 'api/reportsApi';
import { ADVERTISEMENTS, POSTS, CATEGORIES } from 'pages/reports/mockData';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  category: '',
};

const pct = (num, den) => (den ? Math.round((num / den) * 10000) / 100 : 0);

const PassFailStatisticsReport = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: 'advertisementNo', label: 'Advertisement', type: 'select', options: ADVERTISEMENTS.map((a) => ({ value: a.label, label: a.label })) },
    { name: 'post',            label: 'Post', type: 'select', options: POSTS.map((p) => ({ value: p, label: p })) },
    { name: 'category',        label: 'Category', type: 'select', options: CATEGORIES.map((c) => ({ value: c, label: c })) },
  ];

  // Loads through the reportsApi service layer (currently mock-backed) so
  // swapping to a live endpoint later only changes reportsApi, not this page.
  const loadData = async (activeFilters) => {
    setLoading(true);
    try {
      const res = await reportsApi.getPassFailStatistics(activeFilters);
      setStats(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(EMPTY_FILTERS); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPaginationModel((p) => ({ ...p, page: 0 }));
    loadData(EMPTY_FILTERS);
  };

  const handleGenerateReport = () => {
    setPaginationModel((p) => ({ ...p, page: 0 }));
    loadData(filters);
  };

  const overallPassPercent = stats ? pct(stats.overall.pass, stats.overall.totalCandidates) : 0;
  const overallFailPercent = stats ? pct(stats.overall.fail, stats.overall.totalCandidates) : 0;

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Pass', value: stats.overall.pass },
      { name: 'Fail', value: stats.overall.fail },
    ];
  }, [stats]);

  const barData = useMemo(() => {
    if (!stats) return [];
    return stats.examTypes.map((e) => ({
      examType: e.examType,
      passPercent: pct(e.pass, e.totalCandidates),
      failPercent: pct(e.fail, e.totalCandidates),
    }));
  }, [stats]);

  const tableRows = useMemo(() => {
    if (!stats) return [];
    const overallRows = stats.examTypes.map((e) => ({
      id: `overall-${e.examType}`,
      examType: e.examType,
      subject: 'Overall Aggregate',
      totalCandidates: e.totalCandidates,
      pass: e.pass,
      fail: e.fail,
      passPercent: pct(e.pass, e.totalCandidates),
    }));
    const subjectRows = stats.subjectWise.map((s) => ({
      id: `${s.examType}-${s.subject}`,
      examType: s.examType,
      subject: s.subject,
      totalCandidates: s.totalCandidates,
      pass: s.pass,
      fail: s.fail,
      passPercent: pct(s.pass, s.totalCandidates),
    }));
    return [...overallRows, ...subjectRows];
  }, [stats]);

  const filteredTableRows = useMemo(() => {
    if (!searchTerm.trim()) return tableRows;
    const term = searchTerm.trim().toLowerCase();
    return tableRows.filter((r) => `${r.examType} ${r.subject}`.toLowerCase().includes(term));
  }, [tableRows, searchTerm]);

  const columns = [
    { field: 'examType', headerName: 'Exam Type', width: 170 },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 200 },
    { field: 'totalCandidates', headerName: 'Total Candidates', width: 160, type: 'number' },
    { field: 'pass', headerName: 'Passed', width: 110, type: 'number' },
    { field: 'fail', headerName: 'Failed', width: 110, type: 'number' },
    { field: 'passPercent', headerName: 'Pass %', width: 110, renderCell: (p) => `${p.value}%` },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={TrendingUp}
          title="Pass / Fail Statistics Report"
          subtitle="Examination pass/fail statistics across One Paper, Two Paper, Written, and CCE exams"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Pass / Fail Statistics Report' },
          ]}
        />

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Statistics"
          onSearch={handleGenerateReport}
          searching={loading}
          searchLabel="Generate Report"
          searchingLabel="Generating…"
          searchIcon={TrendingUp}
          showPdfExport
        />

        {loading && !stats ? (
          <StatCardsSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Total Candidates Evaluated" value={stats.overall.totalCandidates.toLocaleString()} icon={Users} color="blue" />
            <SummaryCard label="Overall Pass %" value={`${overallPassPercent}%`} icon={CheckCircle2} color="emerald" />
            <SummaryCard label="Overall Fail %" value={`${overallFailPercent}%`} icon={XCircle} color="rose" />
            <SummaryCard label="Exam Categories Covered" value={stats.examTypes.length} icon={LayoutGrid} color="violet" />
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <PieChartCard title="Overall Result Distribution" data={pieData} colors={['#059669', '#e11d48']} />
            <BarChartCard
              title="Pass % by Exam Type"
              data={barData}
              xKey="examType"
              bars={[{ dataKey: 'passPercent', name: 'Pass %', color: '#059669' }]}
            />
          </div>
        )}

        <ReportTable
          rows={filteredTableRows}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by exam type or subject..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="entries"
          emptyTitle="No statistics found"
          emptyDescription="Try adjusting your filters and generating the report again."
        />
      </div>
    </div>
  );
};

export default PassFailStatisticsReport;
