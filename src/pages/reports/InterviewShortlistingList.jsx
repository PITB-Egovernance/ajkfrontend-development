import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import ReportPageHeader from 'components/reports/ReportPageHeader';
import ReportFilterBar from 'components/reports/ReportFilterBar';
import ReportTable from 'components/reports/ReportTable';
import StatusBadge from 'components/reports/StatusBadge';
import reportsApi from 'api/reportsApi';
import { ADVERTISEMENTS, POSTS, GENDERS, DISTRICTS } from 'pages/reports/mockData';

const EMPTY_FILTERS = {
  advertisementNo: '',
  post: '',
  gender: '',
  district: '',
};

const InterviewShortlistingList = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const filterConfig = [
    { name: 'advertisementNo', label: 'Advertisement', type: 'select', options: ADVERTISEMENTS.map((a) => ({ value: a.label, label: a.label })) },
    { name: 'post',            label: 'Post', type: 'select', options: POSTS.map((p) => ({ value: p, label: p })) },
    { name: 'gender',          label: 'Gender', type: 'select', options: GENDERS.map((g) => ({ value: g, label: g })) },
    { name: 'district',        label: 'District', type: 'select', options: DISTRICTS.map((d) => ({ value: d, label: d })) },
  ];

  // Loads through the reportsApi service layer (currently mock-backed) so
  // swapping to a live endpoint later only changes reportsApi, not this page.
  const loadData = async (activeFilters) => {
    setLoading(true);
    try {
      const res = await reportsApi.getInterviewShortlist(activeFilters);
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
    { field: 'srNo', headerName: 'Sr No', width: 80 },
    { field: 'rollNo', headerName: 'Roll No', width: 130 },
    { field: 'candidateName', headerName: 'Candidate Name', flex: 1, minWidth: 170 },
    { field: 'fatherName', headerName: 'Father Name', flex: 1, minWidth: 170 },
    { field: 'district', headerName: 'District', width: 150 },
    { field: 'advertisementNo', headerName: 'Advertisement No', width: 170 },
    { field: 'post', headerName: 'Post Name', width: 140 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    { field: 'interviewDate', headerName: 'Interview Date', width: 140 },
    { field: 'interviewTime', headerName: 'Interview Time', width: 140 },
    {
      field: 'status', headerName: 'Status', width: 130, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={CalendarCheck}
          title="Interview Shortlisting List"
          subtitle="Candidates shortlisted for interview"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Interview Shortlisting List' },
          ]}
        />

        <ReportFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Candidates"
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
          resultsLabel="candidates"
          emptyTitle="No shortlisted candidates found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default InterviewShortlistingList;
