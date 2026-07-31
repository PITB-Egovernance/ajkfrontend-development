import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import PassFailBadge from 'components/reports/PassFailBadge';
import reportsApi from 'api/reportsApi';
import { ADVERTISEMENTS, POSTS, CCE_OPTIONAL_SUBJECTS } from 'pages/reports/mockData';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  optionalSubject: '',
};

const CompiledMarksheetCce = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: 'advertisementNo', label: 'Advertisement', type: 'select', options: ADVERTISEMENTS.map((a) => ({ value: a.label, label: a.label })) },
    { name: 'post',            label: 'Post', type: 'select', options: POSTS.map((p) => ({ value: p, label: p })) },
    { name: 'optionalSubject', label: 'Optional Subject', type: 'select', options: CCE_OPTIONAL_SUBJECTS.map((s) => ({ value: s, label: s })) },
  ];

  // Loads through the reportsApi service layer (currently mock-backed) so
  // swapping to a live endpoint later only changes reportsApi, not this page.
  const loadData = async (activeFilters) => {
    setLoading(true);
    try {
      const res = await reportsApi.getCceMarksheet(activeFilters);
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
    return rows.filter((r) => `${r.rollNo} ${r.candidateName}`.toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const columns = [
    { field: 'srNo', headerName: '#', width: 65 },
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    {
      field: 'optionalSubjects', headerName: 'Optional Subjects', flex: 1, minWidth: 200,
      renderCell: (p) => (Array.isArray(p.value) ? p.value.join(', ') : p.value),
    },
    {
      field: 'compulsorySubjects', headerName: 'Compulsory Subjects', flex: 1, minWidth: 260,
      renderCell: (p) => (Array.isArray(p.value) ? p.value.join(', ') : p.value),
    },
    { field: 'writtenMarks', headerName: 'Written Marks', width: 130, type: 'number',
      renderCell: (p) => `${p.value}/${p.row.totalWrittenMarks}` },
    { field: 'vivaMarks', headerName: 'Viva Marks', width: 120, type: 'number',
      renderCell: (p) => `${p.value}/${p.row.totalVivaMarks}` },
    { field: 'aggregatePercent', headerName: 'Aggregate', width: 120, renderCell: (p) => `${p.value}%` },
    {
      field: 'result', headerName: 'Result', width: 110, sortable: false,
      renderCell: (p) => <PassFailBadge value={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={BookOpen}
          title="Compiled Marksheet (CCE)"
          subtitle="Per-candidate CCE subject-wise marks with aggregate and result"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Compiled Marksheet (CCE)' },
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
          showExcelExport={false}
        />

        <ReportTable
          rows={filteredRows}
          columns={columns}
          loading={loading}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by candidate name or roll no..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          resultsLabel="candidates"
          emptyTitle="No CCE marksheet records found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default CompiledMarksheetCce;
