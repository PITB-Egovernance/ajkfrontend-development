import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import PassFailBadge from 'components/reports/PassFailBadge';
import reportsApi from 'api/reportsApi';
import { ADVERTISEMENTS, POSTS, WRITTEN_EXAM_SUBJECTS } from 'pages/reports/mockData';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  subject: '',
};

const CompiledMarksheetWritten = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: 'advertisementNo', label: 'Advertisement', type: 'select', options: ADVERTISEMENTS.map((a) => ({ value: a.label, label: a.label })) },
    { name: 'post',            label: 'Post', type: 'select', options: POSTS.map((p) => ({ value: p, label: p })) },
    { name: 'subject',         label: 'Subject', type: 'select', options: WRITTEN_EXAM_SUBJECTS.map((s) => ({ value: s, label: s })) },
  ];

  // Loads through the reportsApi service layer (currently mock-backed) so
  // swapping to a live endpoint later only changes reportsApi, not this page.
  const loadData = async (activeFilters) => {
    setLoading(true);
    try {
      const res = await reportsApi.getWrittenMarksheet(activeFilters);
      setRows(res.data.rows);
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

  const handleSearch = () => {
    setPaginationModel((p) => ({ ...p, page: 0 }));
    loadData(filters);
  };

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
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 170 },
    { field: 'post', headerName: 'Post', width: 140 },
    { field: 'subject', headerName: 'Subject', width: 170 },
    { field: 'obtainedMarks', headerName: 'Obtained Marks', width: 140, type: 'number' },
    { field: 'totalMarks', headerName: 'Total Marks', width: 120, type: 'number' },
    { field: 'percentage', headerName: 'Percentage', width: 120, renderCell: (p) => `${p.value}%` },
    { field: 'aggregate', headerName: 'Aggregate', width: 120, renderCell: (p) => `${p.value}%` },
    {
      field: 'result', headerName: 'Pass / Fail', width: 130, sortable: false,
      renderCell: (p) => <PassFailBadge value={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={FileSpreadsheet}
          title="Compiled Marksheet (Written Exam)"
          subtitle="Subject-wise marks with aggregate and pass/fail per candidate"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Compiled Marksheet (Written Exam)' },
          ]}
        />

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Marksheet"
          onSearch={handleSearch}
          searching={loading}
          showPdfExport
        />

        <ReportTable
          rows={filteredRows}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by candidate name, roll no, father name..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="rows"
          emptyTitle="No marksheet records found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default CompiledMarksheetWritten;
