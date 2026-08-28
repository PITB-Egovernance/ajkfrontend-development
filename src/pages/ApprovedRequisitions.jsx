import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { Tooltip } from '@mui/material';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { InlineLoader } from 'components/ui/Loader';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import { formatDate } from 'utils/dateUtils';
import { hasPermission } from 'utils/permissions';
import { fetchPaginatedApiList } from 'utils/paginatedApiUtils';

const ApprovedRequisitions = () => {
  // Creating an advertisement from the job pool requires advertisement add rights.
  const canCreateAdvertisement = hasPermission('advertisement.advertisement.add');

  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [selectionModel, setSelectionModel] = useState([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [filters, setFilters] = useState({
    hash_id: '',
    designation: '',
    department: '',
    scale: '',
    quota_percentage: '',
    num_posts: '',
    vacancy_date: '',
  });

  const [gradeOptions, setGradeOptions] = useState([]);

  const filterConfig = [
    { name: 'hash_id', label: 'Ref', type: 'text', placeholder: 'Filter by ref' },
    { name: 'designation', label: 'Designation', type: 'text', placeholder: 'Filter by designation' },
    { name: 'department', label: 'Department', type: 'text', placeholder: 'Filter by department' },
    { name: 'scale', label: 'Scale', type: 'text', placeholder: 'Filter by scale' },
    { name: 'quota_percentage', label: 'Quota %', type: 'text', placeholder: 'Filter by quota' },
    { name: 'num_posts', label: 'Posts', type: 'text', placeholder: 'Filter by posts' },
    { name: 'vacancy_date', label: 'Vacancy Date', type: 'date' },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ hash_id: '', designation: '', department: '', scale: '', quota_percentage: '', num_posts: '', vacancy_date: '' });
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const fetchApproved = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {
        Accept: 'application/json',
        'X-API-KEY': API_KEY,
        Authorization: `Bearer ${TOKEN}`,
      };

      // Each source is walked page-by-page (not a single big per_page=N
      // request) — the backend doesn't always honor an overridden per_page,
      // so a one-shot request can silently return only its default page.
      const safeFetchList = async (url, opts) => {
        try {
          return await fetchPaginatedApiList(url, opts);
        } catch {
          return [];
        }
      };

      const [adsJobs, pscItems, advertisedList] = await Promise.all([
        safeFetchList(`${API_BASE}/advertisements/approved-requisitions`, {
          headers,
          // This endpoint's paginator is nested under data.jobs, not data directly.
          getPaginator: (result) => result?.data?.jobs,
        }),
        safeFetchList(`${API_BASE}/psc/requisitions`, { headers }),
        safeFetchList(`${API_BASE}/advertisements`, { headers }),
      ]);

      const mapJob = (item, prefix, index) => ({
        id: item.hash_id || item.id || `${prefix}-${index}`,
        hash_id: item.hash_id,
        designation: item.designation,
        department: typeof item.department === 'object' ? (item.department?.name || item.department?.department_name || '') : (item.department || ''),
        scale: item.scale,
        quota_percentage: item.quota_percentage,
        num_posts: item.num_posts,
        vacancy_date: item.vacancy_date || '-',
        status: item.status || 'Approved',
        created_at: item.created_at,
        updated_at: item.updated_at,
      });

      let allJobs = adsJobs.map((item, index) => mapJob(item, 'approved-req', index));

      const pscApproved = pscItems
        .filter(item => item.status?.toLowerCase() === 'approved')
        .map((item, index) => mapJob(item, 'psc-approved', index));

      // Merge and avoid duplicates by hash_id
      const existingIds = new Set(allJobs.map(j => j.hash_id).filter(Boolean));
      const uniquePscApproved = pscApproved.filter(j => !j.hash_id || !existingIds.has(j.hash_id));
      allJobs = [...allJobs, ...uniquePscApproved];

      // Exclude jobs already included in advertisements
      const included = new Set();
      advertisedList.forEach(ad => {
        if (Array.isArray(ad.job_details)) {
          ad.job_details.forEach(j => {
            if (j?.hash_id) included.add(j.hash_id);
            else if (j?.id) included.add(j.id);
            else if (j?.job_id) included.add(j.job_id);
          });
        }
      });
      allJobs = allJobs.filter(j => {
        const key = j.hash_id || j.id;
        return key ? !included.has(key) : true;
      });

      try {
        const localAdvertisedRaw = localStorage.getItem('advertised_job_ids');
        const localAdvertised = localAdvertisedRaw ? new Set(JSON.parse(localAdvertisedRaw)) : new Set();
        if (localAdvertised.size > 0) {
          allJobs = allJobs.filter(j => {
            const key = j.hash_id || j.id;
            return key ? !localAdvertised.has(key) : true;
          });
        }
      } catch {}

      // Newest approval first — the two source endpoints don't return a
      // consistent order once merged, so sort explicitly by approval date
      // (falling back to update/vacancy date for rows missing it).
      allJobs.sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || a.vacancy_date || 0).getTime();
        const dateB = new Date(b.created_at || b.updated_at || b.vacancy_date || 0).getTime();
        return dateB - dateA;
      });

      setRows(allJobs);
      setTotal(allJobs.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/grades?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.success || result.status === 200) {
        const list = result.data?.data ?? result.data ?? [];
        setGradeOptions(
          list
            .filter((g) => (g.status ?? 'active') === 'active')
            .map((g) => ({ id: g.hash_id || g.id, name: g.name }))
        );
      }
    } catch (err) {
    }
  };

  // Resolve a stored scale value (hash_id, number, or string) to the
  // human-readable grade name (e.g. "BPS-17"). Falls back to the raw
  // value if no match is found.
  const getScaleName = (rawScale) => {
    if (rawScale === null || rawScale === undefined || rawScale === '') return 'N/A';
    if (typeof rawScale === 'object') {
      return rawScale.name || rawScale.hash_id || rawScale.id || 'N/A';
    }
    const str = String(rawScale).trim();
    const matched = gradeOptions.find((g) => g.id === str || g.name === str);
    return matched ? matched.name : str;
  };

  useEffect(() => {
    fetchGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchApproved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = rows.filter((row) => {
    if (filters.hash_id && !row.hash_id?.toLowerCase().includes(filters.hash_id.toLowerCase())) {
      return false;
    }
    if (filters.designation && !row.designation?.toLowerCase().includes(filters.designation.toLowerCase())) {
      return false;
    }
    if (filters.department && !row.department?.toLowerCase().includes(filters.department.toLowerCase())) {
      return false;
    }
    if (filters.scale && !getScaleName(row.scale).toLowerCase().includes(filters.scale.toLowerCase())) {
      return false;
    }
    if (filters.quota_percentage && !String(row.quota_percentage).toLowerCase().includes(filters.quota_percentage.toLowerCase())) {
      return false;
    }
    if (filters.num_posts && !String(row.num_posts).toLowerCase().includes(filters.num_posts.toLowerCase())) {
      return false;
    }
    if (filters.vacancy_date && row.vacancy_date !== filters.vacancy_date) {
      return false;
    }
    return true;
  });

  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved')) return 'bg-green-100 text-green-700';
    if (statusLower.includes('rejected')) return 'bg-red-100 text-red-700';
    if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const tooltipCell = (params) => (
    <Tooltip title={params.value ?? ''} arrow placement="top">
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {params.value ?? ''}
      </span>
    </Tooltip>
  );

  const tooltipHeader = (short, full) => () => (
    <Tooltip title={full} arrow placement="top">
      <span style={{ fontWeight: 'bold', cursor: 'default' }}>{short}</span>
    </Tooltip>
  );

  const columns = [
    { field: 'id', headerName: 'Ref', width: 90, renderCell: tooltipCell },
    { field: 'designation', headerName: 'Designation', flex: 1, minWidth: 150, renderCell: tooltipCell },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 150, renderCell: tooltipCell },
    {
      field: 'scale',
      headerName: 'Scale',
      width: 120,
      renderCell: (params) => {
        const val = getScaleName(params.value);
        return (
          <Tooltip title={val} arrow placement="top">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
          </Tooltip>
        );
      },
    },
    { field: 'quota_percentage', headerName: 'Quota %', width: 110, renderCell: tooltipCell },
    { field: 'num_posts', headerName: 'Requisitioned Posts', width: 150, renderCell: tooltipCell },
    { field: 'vacancy_date', renderHeader: tooltipHeader('Req.Date', 'Requisition Date'), width: 140, renderCell: tooltipCell },
    {
      field: 'created_at', renderHeader: tooltipHeader('Appr.Date', 'Approved Date'), width: 140,
      renderCell: (params) => {
        const val = params.value ? formatDate(params.value) : '—';
        return (
          <Tooltip title={val} arrow placement="top">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
          </Tooltip>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const status = params.value || 'Approved';
        return (
          <Tooltip title={status} arrow placement="top">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
              {status.toUpperCase()}
            </span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Approved Requisitions</h3>
          <p className="text-slate-500">Approved requisitions list.</p>
        </div>
        {selectionModel.length > 0 && canCreateAdvertisement && (
          <button
            type="button"
            onClick={() => {
              const idsParam = encodeURIComponent(JSON.stringify(selectionModel));
              navigate(`/dashboard/advertisements/create?ids=${idsParam}`);
            }}
            className="w-fit px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            Add Advertisement
          </button>
        )}
      </div>

      <AdvancedFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterConfig={filterConfig}
      />

      <div style={{ width: '100%' }} className="mt-4">
        {loading ? (
          <InlineLoader text="Loading approved requisitions..." variant="ring" size="lg" />
        ) : error ? (
          <div className="text-red-600 text-center py-8">Error: {error}</div>
        ) : (
          <TooltipDataGrid
            rows={filteredRows}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 75, 100]}
            pagination
            paginationMode="client"
            rowCount={filteredRows.length}
            loading={loading}
            disableSelectionOnClick
            checkboxSelection
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
            autoHeight
            sx={{
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
              '& .MuiDataGrid-row': {
                minHeight: '52px !important',
              },
              '& .MuiDataGrid-checkboxInput svg': {
                color: '#064e3b',
              },
              '& .MuiDataGrid-checkboxInput:hover svg': {
                color: '#065f46',
              },
              '& .MuiDataGrid-checkboxInput.Mui-checked svg': {
                color: '#064e3b',
              },
              '& .MuiDataGrid-columnHeader--checkbox .MuiDataGrid-columnHeaderTitleContainer': {
                display: 'none',
              },
              '& .MuiCheckbox-root .MuiSvgIcon-root': {
                color: '#064e3b',
              },
              '& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root': {
                color: '#064e3b',
              },
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ApprovedRequisitions;
