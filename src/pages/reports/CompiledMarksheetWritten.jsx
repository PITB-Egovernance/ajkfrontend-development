import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import PassFailBadge from 'components/reports/PassFailBadge';
import ReportsApi from 'api/reportsApi';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  subject: '',
};

const mapRow = (row, index) => ({
  id: `${row.roll_no || ''}-${row.subject || ''}-${index}`,
  srNo: row.sr_no,
  rollNo: row.roll_no,
  candidateName: row.candidate_name,
  fatherName: row.father_name,
  advertisementNo: row.advertisement_no,
  post: row.post,
  subject: row.subject,
  obtainedMarks: row.obtained_marks,
  totalMarks: row.total_marks,
  percentage: row.percentage,
  aggregate: row.aggregate,
  result: row.result,
});

const CompiledMarksheetWritten = () => {
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
      const result = await ReportsApi.getWrittenMarksheet({
        advertisement: appliedFilters.advertisementNo,
        post_name:     appliedFilters.post,
        subject:       appliedFilters.subject,
        search:        debouncedSearchTerm,
        page:          paginationModel.page + 1,
        per_page:      paginationModel.pageSize,
      });
      const payload = result?.data ?? {};
      const items = Array.isArray(payload.data) ? payload.data : [];
      setRows(items.map(mapRow));
      setTotalCount(payload.total ?? items.length);
    } catch (err) {
      toast.error(err?.message || 'Failed to load written marksheet report');
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
    { name: 'subject',         label: 'Subject', type: 'select', options: filterOptions?.subjects || [] },
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
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 170 },
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 170 },
    { field: 'post', headerName: 'Post', width: 140 },
    { field: 'subject', headerName: 'Subject', width: 170 },
    { field: 'obtainedMarks', headerName: 'Obtained Marks', width: 140, type: 'number' },
    { field: 'totalMarks', headerName: 'Total Marks', width: 120, type: 'number' },
    { field: 'percentage', headerName: 'Percentage', width: 120, renderCell: (p) => (p.value != null ? `${p.value}%` : '—') },
    { field: 'aggregate', headerName: 'Aggregate', width: 120, renderCell: (p) => (p.value != null ? `${p.value}%` : '—') },
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
          searching={searching}
          showPdfExport
        />

        <ReportTable
          rows={rows}
          columns={columns}
          loading={searching}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          searchPlaceholder="Search by candidate name, roll no, father name..."
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={totalCount}
          resultsLabel="rows"
          emptyTitle="No marksheet records found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default CompiledMarksheetWritten;
