import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Trophy, UserRound, Accessibility, MapPin, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import SummaryCard from 'components/reports/SummaryCard';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportTable from 'components/reports/ReportTable';
import ExportButtons from 'components/reports/ExportButtons';
import PieChartCard from 'components/reports/PieChartCard';
import { StatCardsSkeleton } from 'components/reports/LoadingSkeleton';
import ReportsApi from 'api/reportsApi';

const mapRow = (row, index) => ({
  id: row.category || index,
  category: row.category,
  applicants: row.applicants,
  qualified: row.qualified,
  selected: row.selected,
  selectionRatio: row.selection_ratio,
  reservedSeats: row.reserved_seats,
  filledSeats: row.filled_seats,
  remainingSeats: row.remaining_seats,
});

const findSelected = (rows, category) => rows.find((r) => r.category === category)?.selected ?? 0;

const CategorySelectionRatio = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  // Small, unpaginated dataset (one row per reservation/quota category) —
  // fetched once in full through the reportsApi service layer (currently
  // mock-backed).
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await ReportsApi.getCategorySelectionRatio();
        const items = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRows(items.map(mapRow));
      } catch (err) {
        toast.error(err?.message || 'Failed to load category-wise selection ratio report');
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => r.category.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const totalSelected = useMemo(() => rows.reduce((sum, r) => sum + r.selected, 0), [rows]);

  const selectedByCategoryData = useMemo(() => rows.map((r) => ({ name: r.category, value: r.selected })), [rows]);

  const seatUtilizationData = useMemo(() => {
    const filled = rows.reduce((sum, r) => sum + r.filledSeats, 0);
    const remaining = rows.reduce((sum, r) => sum + r.remainingSeats, 0);
    return [
      { name: 'Filled Seats', value: filled },
      { name: 'Remaining Seats', value: remaining },
    ];
  }, [rows]);

  const columns = [
    { field: 'category', headerName: 'Category', width: 160 },
    { field: 'applicants', headerName: 'Applicants', width: 120, type: 'number' },
    { field: 'qualified', headerName: 'Qualified', width: 120, type: 'number' },
    { field: 'selected', headerName: 'Selected', width: 110, type: 'number' },
    { field: 'selectionRatio', headerName: 'Selection Ratio', width: 150,
      renderCell: (p) => (p.value === null || p.value === undefined ? <span className="text-slate-400 text-xs">—</span> : `${p.value}%`) },
    { field: 'reservedSeats', headerName: 'Reserved Seats', width: 150, type: 'number',
      renderCell: (p) => (p.value === null || p.value === undefined ? <span className="text-slate-400 text-xs">—</span> : p.value) },
    { field: 'filledSeats', headerName: 'Filled Seats', width: 130, type: 'number',
      renderCell: (p) => (p.value === null || p.value === undefined ? <span className="text-slate-400 text-xs">—</span> : p.value) },
    { field: 'remainingSeats', headerName: 'Remaining Seats', width: 160, type: 'number',
      renderCell: (p) => (p.value === null || p.value === undefined ? <span className="text-slate-400 text-xs">—</span> : p.value) },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={Layers}
          title="Category-wise Selection Ratio"
          subtitle="Recruitment statistics by reservation category and quota compliance"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Administrative & Audit Reports' },
            { label: 'Category-wise Selection Ratio' },
          ]}
          actions={<ExportButtons showPdf showExcel={false} />}
        />

        {loading && rows.length === 0 ? (
          <StatCardsSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <SummaryCard label="Total Selected" value={totalSelected.toLocaleString()} icon={Trophy} color="emerald" />
            <SummaryCard label="Women Quota" value={findSelected(rows, 'Women Quota').toLocaleString()} icon={UserRound} color="violet" />
            <SummaryCard label="Disabled Quota" value={findSelected(rows, 'Disabled Quota').toLocaleString()} icon={Accessibility} color="amber" />
            <SummaryCard label="District Quota" value={findSelected(rows, 'District Quota').toLocaleString()} icon={MapPin} color="blue" />
            <SummaryCard label="Open Merit" value={findSelected(rows, 'Open Merit').toLocaleString()} icon={Award} color="blue" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <PieChartCard title="Selected Distribution by Category (Doughnut)" data={selectedByCategoryData} innerRadius={55} />
          <PieChartCard title="Seat Utilization (Filled vs Remaining)" data={seatUtilizationData} colors={['#059669', '#e2e8f0']} />
        </div>

        <ReportTable
          rows={filteredRows}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by category..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="categories"
          emptyTitle="No category data found"
          emptyDescription="No reservation category data is currently available."
        />
      </div>
    </div>
  );
};

export default CategorySelectionRatio;
