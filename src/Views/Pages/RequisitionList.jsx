import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Typography } from '@mui/material';
import { DataGridLoader, InlineLoader } from '../../components/ui/Loader';
import { Link } from 'react-router-dom';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';

const RequisitionList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const fetchRequisitions = async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/requisitions?page=${pageNum + 1}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch requisitions');
      const result = await response.json();
      if (result.status === 200) {
        const requisitions = result.data.data.map((item) => ({
          id: item.id,
          designation: item.designation,
          scale: item.scale,
          num_posts: item.num_posts,
          status: item.status,
        }));
        setRows(requisitions);
        setTotal(result.data.total);
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
    fetchRequisitions(page);
  }, [page]);

  const columns = [
    { field: 'id', headerName: 'Ref', width: 100 },
    { field: 'designation', headerName: 'Designation', flex: 1 },
    { field: 'scale', headerName: 'Scale', width: 150 },
    { field: 'num_posts', headerName: 'Posts', width: 100 },
    { field: 'status', headerName: 'Status', width: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        // ← THIS IS THE FIX: relative path
        <Link to={`${params.row.id}`}>
          <Button variant="contained" size="small" color="primary">
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <Typography variant="h6" className="font-semibold mb-2">
        List of Requisitions
      </Typography>
      <Typography variant="body2" className="text-slate-500 mb-6">
        All requisitions are shown below.
      </Typography>

      <div style={{ height: 600, width: '100%' }}>
        {loading ? (
          <InlineLoader text="Loading requisitions..." variant="pulse" size="lg" />
        ) : error ? (
          <div className="text-red-600 text-center py-8">
            Error: {error}
          </div>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={pageSize}
            rowsPerPageOptions={[pageSize]}
            pagination
            paginationMode="server"
            rowCount={total}
            onPageChange={(newPage) => setPage(newPage)}
            loading={loading}
            disableSelectionOnClick
          />
        )}
      </div>
    </div>
  );
};

export default RequisitionList;