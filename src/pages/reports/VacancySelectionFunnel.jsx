import React, { useEffect, useMemo, useState } from 'react';
import { Funnel as FunnelIcon, Briefcase, Users, UserCheck, CheckCircle2, Mic, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportTable from 'components/reports/ReportTable';
import ExportButtons from 'components/reports/ExportButtons';
import FunnelChartCard from 'components/reports/FunnelChartCard';
import BarChartCard from 'components/reports/BarChartCard';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import ReportsApi from 'api/reportsApi';

const EMPTY_TOTALS = {
  vacancies: 0,
  applications_received: 0,
  eligible: 0,
  written_qualified: 0,
  interview_qualified: 0,
  selected: 0,
};

const mapRow = (row, index) => ({
  id: `${row.advertisement_no || ''}-${row.post || ''}-${index}`,
  advertisementNo: row.advertisement_no,
  post: row.post,
  vacancies: row.vacancies,
  applicationsReceived: row.applications_received,
  eligible: row.eligible,
  writtenQualified: row.written_qualified,
  interviewQualified: row.interview_qualified,
  selected: row.selected,
  selectionPercentage: row.selection_percentage,
});

const VacancySelectionFunnel = () => {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  // Small, unpaginated dataset (a handful of postings per cycle) — fetched
  // once in full through the reportsApi service layer (currently mock-backed).
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await ReportsApi.getVacancySelectionFunnel();
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRows(items.map(mapRow));
        setTotals({ ...EMPTY_TOTALS, ...(res?.data?.totals ?? {}) });
      } catch (err) {
        toast.error(err?.message || 'Failed to load vacancy-to-selection funnel report');
        setRows([]);
        setTotals(EMPTY_TOTALS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => `${r.advertisementNo} ${r.post}`.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const funnelData = useMemo(() => ([
    { name: 'Vacancies', value: totals.vacancies },
    { name: 'Applicants', value: totals.applications_received },
    { name: 'Eligible', value: totals.eligible },
    { name: 'Written Qualified', value: totals.written_qualified },
    { name: 'Interview Qualified', value: totals.interview_qualified },
    { name: 'Selected', value: totals.selected },
  ]), [totals]);

  const barData = useMemo(() => rows.map((r) => ({
    post: r.post,
    selectionPercentage: r.selectionPercentage,
  })), [rows]);

  const columns = [
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 180 },
    { field: 'post', headerName: 'Post', width: 160 },
    { field: 'vacancies', headerName: 'Vacancies', width: 110, type: 'number' },
    { field: 'applicationsReceived', headerName: 'Applications Received', width: 190, type: 'number' },
    { field: 'eligible', headerName: 'Eligible', width: 110, type: 'number' },
    { field: 'writtenQualified', headerName: 'Written Qualified', width: 160, type: 'number' },
    { field: 'interviewQualified', headerName: 'Interview Qualified', width: 170, type: 'number' },
    { field: 'selected', headerName: 'Selected', width: 110, type: 'number' },
    { field: 'selectionPercentage', headerName: 'Selection Percentage', width: 180, renderCell: (p) => `${p.value}%` },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={FunnelIcon}
          title="Vacancy-to-Selection Funnel"
          subtitle="Complete recruitment funnel from vacancies to final selection"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Administrative & Audit Reports' },
            { label: 'Vacancy-to-Selection Funnel' },
          ]}
          actions={<ExportButtons showExcel showPdf={false} />}
        />

        {loading && rows.length === 0 ? (
          <StatCardsSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Vacancies" value={totals.vacancies.toLocaleString()} icon={Briefcase} color="blue" />
            <SummaryCard label="Total Applicants" value={totals.applications_received.toLocaleString()} icon={Users} color="violet" />
            <SummaryCard label="Eligible Candidates" value={totals.eligible.toLocaleString()} icon={UserCheck} color="amber" />
            <SummaryCard label="Qualified Candidates" value={totals.written_qualified.toLocaleString()} icon={CheckCircle2} color="emerald" />
            <SummaryCard label="Interviewed Candidates" value={totals.interview_qualified.toLocaleString()} icon={Mic} color="blue" />
            <SummaryCard label="Selected Candidates" value={totals.selected.toLocaleString()} icon={Trophy} color="emerald" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <FunnelChartCard title="Recruitment Funnel" data={funnelData} />
          <BarChartCard
            title="Selection % by Post"
            data={barData}
            xKey="post"
            bars={[{ dataKey: 'selectionPercentage', name: 'Selection %', color: '#059669' }]}
          />
        </div>

        <ReportTable
          rows={filteredRows}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by advertisement no or post..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="postings"
          emptyTitle="No funnel data found"
          emptyDescription="No recruitment postings are currently available for this cycle."
        />
      </div>
    </div>
  );
};

export default VacancySelectionFunnel;
