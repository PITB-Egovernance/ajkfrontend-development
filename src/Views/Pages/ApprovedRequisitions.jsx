import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Chip } from '@mui/material';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';
import { InlineLoader } from '../../components/ui/Loader';

const ApprovedRequisitions = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const fetchApproved = async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/approved-requisitions?page=${pageNum + 1}`, {
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
          ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to fetch approved requisitions');
      const result = await res.json();
      if (result.status === 200 && result.data && Array.isArray(result.data.data)) {
        const mapped = result.data.data.map((item) => ({
          id: item.id,
          designation: item.designation,
          scale: item.scale,
          quota_percentage: item.quota_percentage,
          num_posts: item.num_posts,
          vacancy_date: item.vacancy_date,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        setRows(mapped);
        setTotal(result.data.total ?? mapped.length);
      } else {
        throw new Error(result.message || 'Invalid response');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproved(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
      renderCell: (params) => (
        <Chip
          label={params.value?.charAt(0).toUpperCase() + params.value?.slice(1) || 'N/A'}
          color="success"
          size="small"
          sx={{
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'capitalize',
          }}
        />
      ),
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
            pageSize={pageSize}
            rowsPerPageOptions={[10, 25, 50, 75, 100]}
            pagination
            paginationMode="server"
            rowCount={total}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
            loading={loading}
            disableSelectionOnClick
            autoHeight
          />
        )}
      </div>
    </div>
  );
};

export default ApprovedRequisitions;
