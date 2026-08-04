import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import StatusBadge from 'components/reports/StatusBadge';
import ReportsApi from 'api/reportsApi';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  gender: '',
  district: '',
};

const mapRow = (row) => ({
  id: row.roll_no,
  srNo: row.sr_no,
  rollNo: row.roll_no,
  candidateName: row.candidate_name,
  fatherName: row.father_name,
  district: row.district,
  advertisementNo: row.advertisement_no,
  post: row.post,
  gender: row.gender,
  finalRejectionReason: row.final_rejection_reason,
  finalStatus: row.final_status,
});

const FinalRejectedCandidateList = () => {
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
        const result = await ReportsApi.getFilters();
        setFilterOptions(result?.data ?? {});
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
      const result = await ReportsApi.getFinalRejectedCandidates({
        advertisement: appliedFilters.advertisementNo,
        post_name:     appliedFilters.post,
        gender:        appliedFilters.gender,
        district:      appliedFilters.district,
        search:        debouncedSearchTerm,
        page:          paginationModel.page + 1,
        per_page:      paginationModel.pageSize,
      });
      const payload = result?.data ?? {};
      const items = Array.isArray(payload.data) ? payload.data : [];
      setRows(items.map(mapRow));
      setTotalCount(payload.total ?? items.length);
    } catch (err) {
      toast.error(err?.message || 'Failed to load final rejected candidate list');
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
    { name: 'gender',          label: 'Gender', type: 'select', options: filterOptions?.genders || [] },
    { name: 'district',        label: 'District', type: 'select', options: filterOptions?.districts || [] },
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
    { field: 'srNo', headerName: 'Sr No', width: 80 },
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 170 },
    { field: 'district', headerName: 'District', width: 150 },
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 170 },
    { field: 'post', headerName: 'Post Name', width: 140 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    { field: 'finalRejectionReason', headerName: 'Final Rejection Reason', flex: 1, minWidth: 260 },
    {
      field: 'finalStatus', headerName: 'Final Status', width: 150, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={ShieldAlert}
          title="Final Rejected Candidate List"
          subtitle="Candidates finally rejected after the appeal process"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Final Rejected Candidate List' },
          ]}
        />

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Candidates"
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
          resultsLabel="candidates"
          emptyTitle="No finally rejected candidates found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default FinalRejectedCandidateList;
