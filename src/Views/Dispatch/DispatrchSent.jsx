import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import {
  Button,
  Box,
  Modal,
  Typography,
  Grid,
  Chip,
} from '@mui/material';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';

const DispatrchSent = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [pageSize] = useState(10);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const fetchHeaders = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
    'X-API-KEY': API_KEY,
  };

  const fetchForms = async (pageIndex = 0) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/dispatched-forms?page=${pageIndex + 1}`,
        { headers: fetchHeaders }
      );

      if (!response.ok) throw new Error('Failed to fetch');

      const result = await response.json();
      const rows = result.data.data.map((item) => ({
        ...item,
        id: item.id,
      }));

      setForms(rows);
      setTotalRows(result.data.total);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to load dispatched forms');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormDetails = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/dispatched-forms/${id}`, {
        headers: fetchHeaders,
      });
      if (!response.ok) throw new Error('Failed to fetch details');
      const result = await response.json();
      setSelectedForm(result.data);
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      alert('Failed to load details');
    }
  };

  useEffect(() => {
    fetchForms(page);
  }, [page]);

  const columns = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'to', headerName: 'To', width: 200 },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 300 },
    { field: 'diary_outward_no', headerName: 'Dispatch No', width: 180 },
    { field: 'date_dispatch', headerName: 'Date', width: 130 },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'High'
              ? 'error'
              : params.value === 'Medium'
              ? 'warning'
              : 'success'
          }
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => fetchFormDetails(params.row.id)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <>
    <Box sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">List of Dispatched</h2>
        <Link to="/dashboard/dispatch/sent/add">
          <button className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 ring-opacity-50 hover:ring-opacity-100">
            + Add New
          </button>
        </Link>
      </div>
        
      <Box sx={{ height: 700, width: '100%' }}>
        <DataGrid
          rows={forms}
          columns={columns}
          pageSize={pageSize}
          rowCount={totalRows}
          paginationMode="server"
          onPageChange={(newPage) => setPage(newPage)}
          loading={loading}
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-columnHeaders': { 
              backgroundColor: '#f5f5f5',
              fontSize: '0.813rem',
              fontWeight: 600
            },
            '& .MuiDataGrid-cell': {
              fontSize: '0.813rem',
              padding: '8px 12px'
            },
            '& .MuiDataGrid-row': {
              maxHeight: 'none !important'
            },
          }}
          components={{
            LoadingOverlay: () => (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: '5px solid #f3f3f3',
                    borderTop: '5px solid #2563eb',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <Typography sx={{ mt: 2, color: 'text.secondary' }}>
                  Loading dispatched forms...
                </Typography>
                <style jsx>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </Box>
            ),
          }}
        />
      </Box>

      {/* Full Details Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95%', sm: '90%', md: 900 },
            maxHeight: '90vh',
            bgcolor: 'background.paper',
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
            overflowY: 'auto',
          }}
        >
          <Typography variant="h6" component="h2" gutterBottom>
            Dispatch Details - ID: {selectedForm?.id}
          </Typography>

          <Grid container spacing={3}>
            {/* Row 1 */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">To</Typography>
              <Typography variant="body1">{selectedForm?.to || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">From</Typography>
              <Typography variant="body1">{selectedForm?.from || 'N/A'}</Typography>
            </Grid>

            {/* Row 2 */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Diary Outward No</Typography>
              <Typography variant="body1">{selectedForm?.diary_outward_no || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Dispatch No</Typography>
              <Typography variant="body1">{selectedForm?.dispatch_no || 'N/A'}</Typography>
            </Grid>

            {/* Row 3 */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Date Dispatched</Typography>
              <Typography variant="body1">
                {selectedForm?.date_received || selectedForm?.date_dispatch || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Time</Typography>
              <Typography variant="body1">{selectedForm?.time_received || 'N/A'}</Typography>
            </Grid>

            {/* Row 4 */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Priority</Typography>
              <Chip
                label={selectedForm?.priority || 'N/A'}
                color={
                  selectedForm?.priority === 'High'
                    ? 'error'
                    : selectedForm?.priority === 'Medium'
                    ? 'warning'
                    : 'success'
                }
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Confidentiality</Typography>
              <Chip
                label={selectedForm?.confidentiality_level || 'N/A'}
                color="secondary"
                size="small"
              />
            </Grid>

            {/* Full Width Fields */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Subject</Typography>
              <Typography variant="body1" fontWeight="medium">
                {selectedForm?.subject || 'N/A'}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Summary</Typography>
              <Typography variant="body1">
                {selectedForm?.summary || 'No summary provided.'}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Related Module</Typography>
              <Typography variant="body1">{selectedForm?.related_module || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Department/Party</Typography>
              <Typography variant="body1">{selectedForm?.department_party_name || 'N/A'}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Dispatch Method</Typography>
              <Typography variant="body1">{selectedForm?.dispatch_method_detail || 'N/A'}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Consignment No</Typography>
              <Typography variant="body1">{selectedForm?.consignment_no || 'N/A'}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Assigned To</Typography>
              <Typography variant="body1">{selectedForm?.assign_to_section_officer || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Archive Policy</Typography>
              <Typography variant="body1">{selectedForm?.archive_dispose || 'N/A'}</Typography>
            </Grid>

            {/* Scanned Document */}
            {selectedForm?.scan_upload_document && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Scanned Document</Typography>
                <Link
                  href={`http://127.0.0.1:8000/${selectedForm.scan_upload_document}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="primary"
                >
                  View PDF
                </Link>
              </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 5, textAlign: 'right' }}>
            <Button variant="contained" onClick={() => setModalOpen(false)}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  </>
  );
};

export default DispatrchSent;