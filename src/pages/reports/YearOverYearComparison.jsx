import React, { useEffect, useMemo, useState } from 'react';
import { History, Users, CheckCircle2, Percent, Trophy, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportTable from 'components/reports/ReportTable';
import ExportButtons from 'components/reports/ExportButtons';
import LineChartCard from 'components/reports/LineChartCard';
import BarChartCard from 'components/reports/BarChartCard';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import ReportsApi from 'api/reportsApi';

const mapRow = (row, index) => ({
  id: row.year ?? index,
  year: row.year,
  advertisements: row.advertisements,
  applications: row.applications,
  qualified: row.qualified,
  selected: row.selected,
  passPercentage: row.pass_percentage,
  selectionPercentage: row.selection_percentage,
});

const YearOverYearComparison = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  // Small, unpaginated dataset (a handful of years) — fetched once in full
  // through the reportsApi service layer (currently mock-backed).
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await ReportsApi.getYearOverYearComparison();
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRows(items.map(mapRow));
      } catch (err) {
        toast.error(err?.message || 'Failed to load year-over-year comparison report');
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => String(r.year).includes(term));
  }, [rows, searchTerm]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    applications: acc.applications + r.applications,
    qualified: acc.qualified + r.qualified,
    selected: acc.selected + r.selected,
    advertisements: acc.advertisements + r.advertisements,
  }), { applications: 0, qualified: 0, selected: 0, advertisements: 0 }), [rows]);

  const overallPassRate = totals.applications ? Math.round((totals.qualified / totals.applications) * 10000) / 100 : 0;
  const overallSelectionRate = totals.applications ? Math.round((totals.selected / totals.applications) * 10000) / 100 : 0;

  const lineData = useMemo(() => rows.map((r) => ({
    year: r.year,
    applications: r.applications,
    selected: r.selected,
  })), [rows]);

  const growthData = useMemo(() => {
    const growth = [];
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];
      growth.push({
        year: curr.year,
        applicationsGrowth: prev.applications ? Math.round(((curr.applications - prev.applications) / prev.applications) * 10000) / 100 : 0,
        selectedGrowth: prev.selected ? Math.round(((curr.selected - prev.selected) / prev.selected) * 10000) / 100 : 0,
      });
    }
    return growth;
  }, [rows]);

  const columns = [
    { field: 'year', headerName: 'Year', width: 100 },
    { field: 'advertisements', headerName: 'Advertisements', width: 150, type: 'number' },
    { field: 'applications', headerName: 'Applications', width: 140, type: 'number' },
    { field: 'qualified', headerName: 'Qualified', width: 120, type: 'number' },
    { field: 'selected', headerName: 'Selected', width: 110, type: 'number' },
    { field: 'passPercentage', headerName: 'Pass Percentage', width: 150, renderCell: (p) => `${p.value}%` },
    { field: 'selectionPercentage', headerName: 'Selection Percentage', width: 180, renderCell: (p) => `${p.value}%` },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={History}
          title="Year-over-Year Comparison"
          subtitle="Recruitment performance compared across multiple years"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Administrative & Audit Reports' },
            { label: 'Year-over-Year Comparison' },
          ]}
          actions={<ExportButtons showExcel showPdf={false} />}
        />

        {loading && rows.length === 0 ? (
          <StatCardsSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <SummaryCard label="Applications" value={totals.applications.toLocaleString()} icon={Users} color="blue" />
            <SummaryCard label="Pass Rate" value={`${overallPassRate}%`} icon={CheckCircle2} color="emerald" />
            <SummaryCard label="Selection Rate" value={`${overallSelectionRate}%`} icon={Percent} color="violet" />
            <SummaryCard label="Total Recruitments" value={totals.selected.toLocaleString()} icon={Trophy} color="amber" />
            <SummaryCard label="Total Advertisements" value={totals.advertisements.toLocaleString()} icon={Megaphone} color="blue" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <LineChartCard
            title="Applications vs Selected (Trend)"
            data={lineData}
            xKey="year"
            lines={[
              { dataKey: 'applications', name: 'Applications', color: '#2563eb' },
              { dataKey: 'selected', name: 'Selected', color: '#059669' },
            ]}
          />
          <BarChartCard
            title="Advertisements per Year"
            data={rows}
            xKey="year"
            bars={[{ dataKey: 'advertisements', name: 'Advertisements', color: '#7c3aed' }]}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <BarChartCard
            title="Growth Comparison (YoY %)"
            data={growthData}
            xKey="year"
            bars={[
              { dataKey: 'applicationsGrowth', name: 'Applications Growth %', color: '#2563eb' },
              { dataKey: 'selectedGrowth', name: 'Selected Growth %', color: '#059669' },
            ]}
          />
        </div>

        <ReportTable
          rows={filteredRows}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by year..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="years"
          emptyTitle="No comparison data found"
          emptyDescription="No recruitment cycle data is currently available."
        />
      </div>
    </div>
  );
};

export default YearOverYearComparison;
