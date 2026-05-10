import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { TextField, MenuItem, IconButton, Menu } from '@mui/material';
import { Eye, Download, MoreVertical, RefreshCw, FilterX, Search, ArrowLeft } from 'lucide-react';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import { InlineLoader, DataGridLoader } from 'components/ui/Loader';
import ResultsApi from 'api/resultsApi';
import StatusBadge from 'components/results/StatusBadge';
import CnicCell from 'components/results/CnicCell';
import toast from 'react-hot-toast';

/**
 * ResultsViewPage
 * Public-facing (authenticated) result grid with search and unmasking capabilities
 */

const ResultsViewPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const [filters, setFilters] = useState({
    roll_number: '',
    cnic: '',
    status: '',
  });

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const fetchResults = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = {
        job_post_id: jobId,
        page: paginationModel.page + 1,
        per_page: paginationModel.pageSize,
        roll_number: filters.roll_number,
        cnic: filters.cnic,
        status: filters.status
      };
      
      const response = await ResultsApi.searchResults(params);
      
      // Handle both { data: [...] } and direct array [...] responses
      let data = [];
      let totalCount = 0;

      if (response && response.data) {
        if (Array.isArray(response.data)) {
          data = response.data;
          totalCount = response.total || response.meta?.total || data.length;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          data = response.data.data;
          totalCount = response.data.total || response.data.meta?.total || data.length;
        }
      } else if (Array.isArray(response)) {
        data = response;
        totalCount = data.length;
      }

      const formattedRows = data.map(item => ({
        id: item.hash_id || item.id,
        roll_number: item.application?.roll_number || item.application?.application_number || item.roll_no || item.roll_number || 'N/A',
        candidate_name: item.application?.candidate_name || item.application?.full_name || item.name || item.candidate_name || 'N/A',
        cnic_masked: item.cnic_masked || item.application?.cnic || item.application?.cnic_masked || item.cnic || 'N/A',
        total_marks: `${item.obtained_marks || 0} / ${item.total_max_marks || 100}`,
        percentage: `${item.percentage || 0}%`,
        status: item.status || 'N/A',
        original_data: item
      }));

      setRows(formattedRows);
      setTotal(totalCount || formattedRows.length);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  }, [jobId, paginationModel, filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchResults]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ roll_number: '', cnic: '', status: '' });
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleDownloadSlip = async () => {
    if (!selectedRow) return;
    try {
      toast.loading('Generating slip...', { id: 'slip-download' });
      const blob = await ResultsApi.downloadSlip(selectedRow.id);
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Result_Slip_${selectedRow.roll_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Slip downloaded', { id: 'slip-download' });
    } catch (error) {
      toast.error('Failed to download slip', { id: 'slip-download' });
    }
    handleMenuClose();
  };

  const columns = [
    { field: 'roll_number', headerName: 'Roll No', width: 120, headerClassName: 'bg-slate-50 font-black' },
    { field: 'candidate_name', headerName: 'Candidate Name', flex: 1, headerClassName: 'bg-slate-50 font-black' },
    { 
      field: 'cnic_masked', 
      headerName: 'CNIC', 
      width: 200,
      headerClassName: 'bg-slate-50 font-black',
      renderCell: (params) => (
        <CnicCell resultId={params.row.id} maskedCnic={params.value} />
      )
    },
    { field: 'total_marks', headerName: 'Total Marks', width: 150, headerClassName: 'bg-slate-50 font-black' },
    { field: 'percentage', headerName: '%', width: 100, headerClassName: 'bg-slate-50 font-black' },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 140,
      headerClassName: 'bg-slate-50 font-black',
      renderCell: (params) => <StatusBadge status={params.value} />
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      headerClassName: 'bg-slate-50 font-black',
      renderCell: (params) => (
        <IconButton onClick={(e) => handleMenuOpen(e, params.row)} size="small" className="hover:bg-emerald-50 text-slate-400 hover:text-emerald-600">
          <MoreVertical size={20} />
        </IconButton>
      ),
    },
  ];

  if (!jobId) {
    return (
      <div className="p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Search size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select a Job Post</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Please choose a job from the Results Dashboard to view its specific candidate results.
          </p>
          <Button 
            onClick={() => navigate('/dashboard/results')}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 font-black text-xs uppercase tracking-[0.2em]"
          >
            Go to Results Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 transition-all text-slate-600 hover:text-emerald-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Job Results</h1>
              <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-widest">
                Viewing candidates for Job Post ID: <span className="text-emerald-600 font-bold">#{jobId}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="border-none shadow-sm overflow-visible bg-white/80 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              <TextField
                label="Roll Number"
                size="small"
                variant="outlined"
                name="roll_number"
                value={filters.roll_number}
                onChange={handleFilterChange}
                fullWidth
                placeholder="Ex: 50412"
              />
              <TextField
                label="CNIC (Full/Masked)"
                size="small"
                variant="outlined"
                name="cnic"
                value={filters.cnic}
                onChange={handleFilterChange}
                fullWidth
                placeholder="XXXXX-XXXXXXX-X"
              />
              <TextField
                select
                label="Result Status"
                size="small"
                variant="outlined"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                fullWidth
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pass" className="text-emerald-600 font-bold">Pass</MenuItem>
                <MenuItem value="fail" className="text-red-600 font-bold">Fail</MenuItem>
                <MenuItem value="withheld" className="text-amber-600 font-bold">Withheld</MenuItem>
                <MenuItem value="absent" className="text-slate-500 font-bold">Absent</MenuItem>
              </TextField>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex-1 py-2.5 border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs uppercase tracking-widest"
                >
                  <FilterX size={16} className="mr-2" /> Reset
                </Button>
                <Button
                  variant="primary"
                  onClick={fetchResults}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 font-bold text-xs uppercase tracking-widest"
                >
                  <Search size={16} className="mr-2" /> Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DataGrid Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <DataGrid
            rows={rows}
            columns={columns}
            paginationMode="server"
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight
            loading={loading}
            className="border-none"
            sx={{
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: '900 !important',
                textTransform: 'uppercase',
                fontSize: '10px',
                letterSpacing: '0.1em',
                color: '#64748b'
              },
              '& .MuiDataGrid-cell': {
                borderColor: '#f1f5f9',
                fontSize: '13px',
                fontWeight: '500',
                color: '#334155'
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f8fafc',
              },
            }}
            slots={{
              loadingOverlay: DataGridLoader,
              noRowsOverlay: () => (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <Search size={40} strokeWidth={1} />
                  <p className="text-sm font-bold uppercase tracking-widest">No results found matching your criteria</p>
                </div>
              )
            }}
          />
        </div>
      </div>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          className: 'shadow-xl border border-slate-100 rounded-xl mt-2 min-w-[180px]'
        }}
      >
        <MenuItem 
          onClick={() => {
            if (selectedRow) navigate(`/dashboard/results/detail/${selectedRow.id}`);
            handleMenuClose();
          }} 
          className="gap-3 py-3 font-bold text-slate-700 text-sm"
        >
          <Eye size={18} className="text-blue-600" /> View Details
        </MenuItem>
        <MenuItem onClick={handleDownloadSlip} className="gap-3 py-3 font-bold text-slate-700 text-sm border-t border-slate-50">
          <Download size={18} className="text-emerald-600" /> Download Slip
        </MenuItem>
      </Menu>
    </div>
  );
};

export default ResultsViewPage;
