import React, { useEffect, useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportTable from 'components/reports/ReportTable';
import ExportButtons from 'components/reports/ExportButtons';
import reportsApi from 'api/reportsApi';

const rowSx = {
  '& .tie-group-a': { backgroundColor: '#fffbeb' }, // amber-50
  '& .tie-group-b': { backgroundColor: '#eff6ff' }, // blue-50
};

const getRowClassName = (params) => `tie-group-${params.row.tieGroup % 2 === 0 ? 'a' : 'b'}`;

const TieBreakingReport = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  // Loads through the reportsApi service layer (currently mock-backed) so
  // swapping to a live endpoint later only changes reportsApi, not this page.
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await reportsApi.getTieBreaking();
        setRows(res.data.rows);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((r) => `${r.rollNo} ${r.candidateName} ${r.fatherName}`.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const columns = [
    { field: 'srNo', headerName: '#', width: 65 },
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 170 },
    { field: 'district', headerName: 'District', width: 150 },
    { field: 'advertisementNo', headerName: 'Adv. No', width: 170 },
    { field: 'post', headerName: 'Post Name', width: 140 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    { field: 'aggregate', headerName: 'Aggregate', width: 110 },
    { field: 'tieBreakRule', headerName: 'Tie Breaking Rule Applied', flex: 1, minWidth: 220 },
    { field: 'finalRank', headerName: 'Final Rank', width: 110 },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={Scale}
          title="Tie-Breaking Report"
          subtitle="Candidates with equal aggregate marks — earlier roll number ranks first"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Tie-Breaking Report' },
          ]}
          actions={<ExportButtons showPdf showExcel />}
        />

        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }} />
            Tie group
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }} />
            Tie group
          </span>
          <span>— shading groups candidates who share the same aggregate</span>
        </div>

        <ReportTable
          rows={filteredRows}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by candidate name, roll no, father name..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="tied candidates"
          emptyTitle="No tied candidates found"
          emptyDescription="No candidates currently share an equal aggregate score."
          getRowClassName={getRowClassName}
          rowSx={rowSx}
        />
      </div>
    </div>
  );
};

export default TieBreakingReport;
