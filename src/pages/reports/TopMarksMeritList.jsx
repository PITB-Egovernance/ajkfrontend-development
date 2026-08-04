import React, { useEffect, useMemo, useState } from 'react';
import { Medal } from 'lucide-react';
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

const TopMarksMeritList = () => {
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
      const res = await reportsApi.getTopMarksMerit(activeFilters);
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
    { field: 'marks', headerName: 'Marks', width: 100, type: 'number' },
    {
      field: 'status', headerName: 'Status', width: 170, sortable: false,
      renderCell: (p) => <StatusBadge status={p.value} />,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6" style={{ minWidth: '-webkit-fill-available' }}>
        <ReportPageHeader
          icon={Medal}
          title="Top Marks Merit Candidate List"
          subtitle="Highest scoring candidates eligible for document verification"
          breadcrumbs={[
            { label: 'Reporting & Analytics' },
            { label: 'Marks & Result Reports' },
            { label: 'Top Marks Merit Candidate List' },
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
          emptyTitle="No candidates found"
          emptyDescription="Try adjusting your filters or search criteria."
        />
      </div>
    </div>
  );
};

export default TopMarksMeritList;
