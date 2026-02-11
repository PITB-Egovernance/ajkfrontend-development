import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { InlineLoader } from 'components/ui/Loader';

const ApprovedRequisitions = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const fetchApproved = async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from advertisements endpoint
      const adsRes = await fetch(`${API_BASE}/advertisements/approved-requisitions?page=${pageNum + 1}`, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
          'Authorization': `Bearer ${TOKEN}`,
        },
      });

      // Fetch from psc/requisitions endpoint
      const pscRes = await fetch(`${API_BASE}/psc/requisitions`, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
          'Authorization': `Bearer ${TOKEN}`,
        },
      });

      let allJobs = [];
      let totalCount = 0;

      if (adsRes.ok) {
        const adsResult = await adsRes.json();
        if (adsResult.success && adsResult.data && adsResult.data.jobs && Array.isArray(adsResult.data.jobs.data)) {
          allJobs = adsResult.data.jobs.data.map((item, index) => ({
            id: item.hash_id || item.id || `approved-req-${pageNum}-${index}`,
            hash_id: item.hash_id,
            designation: item.designation,
            scale: item.scale,
            quota_percentage: item.quota_percentage,
            num_posts: item.num_posts,
            vacancy_date: item.vacancy_date,
            status: item.status || 'Approved',
            created_at: item.created_at,
            updated_at: item.updated_at,
          }));
          totalCount = adsResult.data.jobs.total ?? allJobs.length;
        }
      }

      if (pscRes.ok) {
        const pscResult = await pscRes.json();
        if (pscResult.success && pscResult.data && Array.isArray(pscResult.data.data)) {
          const pscApproved = pscResult.data.data
            .filter(item => item.status?.toLowerCase() === 'approved')
            .map((item, index) => ({
              id: item.hash_id || item.id || `psc-approved-${index}`,
              hash_id: item.hash_id,
              designation: item.designation,
              scale: item.scale,
              quota_percentage: item.quota_percentage,
              num_posts: item.num_posts,
              vacancy_date: item.vacancy_date || '-',
              status: item.status || 'Approved',
              created_at: item.created_at,
              updated_at: item.updated_at,
            }));

          // Merge and avoid duplicates by hash_id
          const existingIds = new Set(allJobs.map(j => j.hash_id).filter(id => id));
          const uniquePscApproved = pscApproved.filter(j => !j.hash_id || !existingIds.has(j.hash_id));

          allJobs = [...allJobs, ...uniquePscApproved];
          totalCount += uniquePscApproved.length;
        }
      }

      setRows(allJobs);
      setTotal(totalCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproved(paginationModel.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page]);

  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved')) return 'bg-green-100 text-green-700';
    if (statusLower.includes('rejected')) return 'bg-red-100 text-red-700';
    if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const columns = [
    { field: 'id', headerName: 'Ref', width: 90 },
    { field: 'designation', headerName: 'Designation', flex: 1, minWidth: 200 },
    { field: 'scale', headerName: 'Scale', width: 140 },
    { field: 'quota_percentage', headerName: 'Quota %', width: 110 },
    { field: 'num_posts', headerName: 'Posts', width: 100 },
    { field: 'vacancy_date', headerName: 'Vacancy Date', width: 140 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const status = params.value || 'Approved';
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
            {status.toUpperCase()}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Approved Requisitions</h3>
      <p className="text-slate-500">Approved requisitions list.</p>

      <div style={{ width: '100%' }} className="mt-4">
        {loading ? (
          <InlineLoader text="Loading approved requisitions..." variant="ring" size="lg" />
        ) : error ? (
          <div className="text-red-600 text-center py-8">Error: {error}</div>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 75, 100]}
            pagination
            paginationMode="server"
            rowCount={total}
            loading={loading}
            disableSelectionOnClick
            autoHeight
            sx={{
              '& .MuiDataGrid-row': {
                minHeight: '52px !important',
              },
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ApprovedRequisitions;
