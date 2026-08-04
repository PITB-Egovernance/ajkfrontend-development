import React, { useEffect, useMemo, useState } from 'react';
import { GitCompare, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportTable from 'components/reports/ReportTable';
import StatusBadge from 'components/reports/StatusBadge';
import AlertCard from 'components/reports/AlertCard';
import ExportButtons from 'components/reports/ExportButtons';
import ReportsApi from 'api/reportsApi';

const rowSx = {
  '& .status-missing': { backgroundColor: '#fef2f2' },   // rose-50
  '& .status-duplicate': { backgroundColor: '#f5f3ff' }, // violet-50
  '& .status-modified': { backgroundColor: '#fffbeb' },  // amber-50
};

const getRowClassName = (params) => `status-${String(params.row.status).toLowerCase()}`;

const mapRow = (row, index) => ({
  id: `${row.roll_no || ''}-${index}`,
  candidateName: row.candidate_name,
  rollNo: row.roll_no,
  previousMarks: row.previous_marks,
  importedMarks: row.imported_marks,
  difference: row.difference,
  status: row.status,
});

const ImportDiscrepancyReport = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  // A MarkEdit row only ever exists when a re-import's marks conflicted with
  // an already-recorded result, so this is naturally a short list — fetched
  // in one page rather than wiring up server-side pagination for it.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await ReportsApi.getImportDiscrepancy({ per_page: 200 });
        const items = res?.data?.data ?? [];
        setRows(items.map(mapRow));
      } catch (err) {
        toast.error(err?.message || 'Failed to load import discrepancy report');
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => `${r.rollNo} ${r.candidateName}`.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const statusCounts = useMemo(() => {
    const counts = { Match: 0, Modified: 0, Missing: 0, Duplicate: 0 };
    rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [rows]);
  const issueCount = statusCounts.Modified + statusCounts.Missing + statusCounts.Duplicate;

  const columns = [
    { field: 'candidateName', headerName: 'Candidate', flex: 1, minWidth: 180 },
    { field: 'rollNo', headerName: 'Roll No', width: 140 },
    { field: 'previousMarks', headerName: 'Previous Marks', width: 150,
      renderCell: (p) => (p.value === null ? <span className="text-slate-400 text-xs">— none on file —</span> : p.value) },
    { field: 'importedMarks', headerName: 'Imported Marks', width: 150, type: 'number' },
    { field: 'difference', headerName: 'Difference', width: 130,
      renderCell: (p) => {
        if (p.value === null) return <span className="text-slate-400 text-xs">—</span>;
        const cls = p.value > 0 ? 'text-emerald-700' : p.value < 0 ? 'text-rose-700' : 'text-slate-600';
        return <span className={cls}>{p.value > 0 ? `+${p.value}` : p.value}</span>;
      } },
    {
      field: 'status', headerName: 'Status', width: 150, sortable: false,
      renderCell: (p) => (
        <span className="inline-flex items-center gap-1.5">
          {p.value !== 'Match' && <AlertTriangle size={13} className="text-amber-500" />}
          <StatusBadge status={p.value} />
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={GitCompare}
          title="Import Discrepancy Report"
          subtitle="Compares imported Excel records against previously recorded marks"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Import Discrepancy Report' },
          ]}
          actions={<ExportButtons showExcel showPdf={false} />}
        />

        {!loading && (
          issueCount > 0 ? (
            <AlertCard
              variant="warning"
              title={`${issueCount} record${issueCount === 1 ? '' : 's'} need attention`}
              description="These records differ from previously recorded marks, could not be matched, or appear more than once in the import. Review before finalizing."
            >
              <div className="flex flex-wrap gap-4 mt-2 text-xs font-medium">
                <span className="text-amber-800">{statusCounts.Modified} Modified</span>
                <span className="text-rose-800">{statusCounts.Missing} Missing</span>
                <span className="text-violet-800">{statusCounts.Duplicate} Duplicate</span>
                <span className="text-emerald-800">{statusCounts.Match} Match</span>
              </div>
            </AlertCard>
          ) : (
            <AlertCard
              variant="success"
              title="No discrepancies found"
              description="All imported records match the previously recorded marks."
            />
          )
        )}

        <ReportTable
          rows={filteredRows}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by candidate name or roll no..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="records"
          emptyTitle="No discrepancies found"
          emptyDescription="Import records match the previously recorded marks."
          getRowClassName={getRowClassName}
          rowSx={rowSx}
        />
      </div>
    </div>
  );
};

export default ImportDiscrepancyReport;
