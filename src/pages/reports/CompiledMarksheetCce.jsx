import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import PassFailBadge from 'components/reports/PassFailBadge';
import ReportsApi from 'api/reportsApi';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  optionalSubject: '',
};

const mapRow = (row, index) => ({
  id: `${row.roll_no || ''}-${index}`,
  srNo: row.sr_no,
  rollNo: row.roll_no,
  candidateName: row.candidate_name,
  advertisementNo: row.advertisement_no,
  post: row.post,
  optionalSubjects: row.optional_subjects || [],
  compulsorySubjects: row.compulsory_subjects || [],
  writtenMarks: row.written_marks,
  totalWrittenMarks: row.total_written_marks,
  vivaMarks: row.viva_marks,
  totalVivaMarks: row.total_viva_marks,
  aggregatePercent: row.aggregate_percent,
  result: row.result,
});

const CompiledMarksheetCce = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filterOptions, setFilterOptions] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [general, marks] = await Promise.all([ReportsApi.getFilters(), ReportsApi.getMarksFilters()]);
        setFilterOptions({ ...(general?.data ?? {}), ...(marks?.data ?? {}) });
      } catch (err) {
        toast.error(err?.message || 'Failed to load filter options');
        setFilterOptions({});
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPaginationModel((p) => ({ ...p, page: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const fetchReport = useCallback(async () => {
    setSearching(true);
    try {
      const result = await ReportsApi.getCceMarksheet({
        advertisement:    appliedFilters.advertisementNo,
        post_name:        appliedFilters.post,
        optional_subject: appliedFilters.optionalSubject,
        search:           debouncedSearchTerm,
        page:             paginationModel.page + 1,
        per_page:         paginationModel.pageSize,
      });
      const payload = result?.data ?? {};
      const items = Array.isArray(payload.data) ? payload.data : [];
      setRows(items.map(mapRow));
      setTotalCount(payload.total ?? items.length);
    } catch (err) {
      toast.error(err?.message || 'Failed to load CCE marksheet report');
      setRows([]);
      setTotalCount(0);
    } finally {
      setSearching(false);
    }
  }, [appliedFilters, debouncedSearchTerm, paginationModel]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filterConfig = useMemo(() => ([
    { name: 'advertisementNo', label: 'Advertisement', type: 'select', options: filterOptions?.advertisements || [] },
    { name: 'post',            label: 'Post', type: 'select', options: filterOptions?.posts || [] },
    { name: 'optionalSubject', label: 'Optional Subject', type: 'select', options: filterOptions?.optional_subjects || [] },
  ]), [filterOptions]);

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
    setAppliedFilters(filters);
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const columns = [
    { field: 'srNo', headerName: '#', width: 65 },
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    {
      field: 'optionalSubjects', headerName: 'Optional Subjects', flex: 1, minWidth: 200,
      renderCell: (p) => (Array.isArray(p.value) && p.value.length ? p.value.join(', ') : '—'),
    },
    {
      field: 'compulsorySubjects', headerName: 'Compulsory Subjects', flex: 1, minWidth: 260,
      renderCell: (p) => (Array.isArray(p.value) && p.value.length ? p.value.join(', ') : '—'),
    },
    { field: 'writtenMarks', headerName: 'Written Marks', width: 130, type: 'number',
      renderCell: (p) => (p.value != null ? `${p.value}/${p.row.totalWrittenMarks ?? '—'}` : '—') },
    { field: 'vivaMarks', headerName: 'Viva Marks', width: 120, type: 'number',
      renderCell: (p) => (p.value != null ? `${p.value}/${p.row.totalVivaMarks ?? '—'}` : 'Not interviewed') },
    { field: 'aggregatePercent', headerName: 'Aggregate', width: 120, renderCell: (p) => (p.value != null ? `${p.value}%` : '—') },
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
          searching={searching}
          showPdfExport
          showExcelExport={false}
        />

        <ReportTable
          rows={rows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by candidate name or roll no..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalCount}
          resultsLabel="candidates"
          emptyTitle="No CCE marksheet records found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default CompiledMarksheetCce;
