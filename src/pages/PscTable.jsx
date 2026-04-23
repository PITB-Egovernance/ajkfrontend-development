import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Link, Typography, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { MoreVertical, CheckCircle, XCircle, Clock } from 'lucide-react';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import toast from 'react-hot-toast';

const PscTable = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [updatingRequisitionId, setUpdatingRequisitionId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const API_BASE = Config.apiUrl; // Use configured API URL
  const TOKEN = AuthService.getToken(); // Get token from AuthService
  const API_KEY = Config.apiKey;

  const fetchRequisitions = async (pageNum = 0, pageSize = 10) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/psc/requisitions`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Invalid or missing token. Please check your token.');
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const requisitions = result.data.data.map((item, index) => ({
          id: item.hash_id || item.id || `psc-${pageNum}-${index}`, // Use hash_id as primary ID
          hash_id: item.hash_id,
          designation: item.designation,
          requisition_form: item.requisition_form,
          annex_a_form: item.annex_a_form,
          other_attachment: item.other_attachment,
          remarks: item.remarks || '-',
          status: item.status || 'Pending',
        }));

        setRows(requisitions);
        setTotal(result.data.total);

        // Calculate stats from current page (best effort)
        const statuses = result.data.data.map(r => r.status || 'Pending');
        const pendingCount = statuses.filter(s => s.toLowerCase() === 'pending').length;
        const approvedCount = statuses.filter(s => s.toLowerCase() === 'approved').length;
        const rejectedCount = statuses.filter(s => s.toLowerCase() === 'rejected').length;

        setStats({
          total: result.data.total,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        });
      } else {
        throw new Error(result.message || 'Invalid response format');
      }
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions(paginationModel.page, paginationModel.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize]);

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
    setUpdatingRequisitionId(row.id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'rejected') {
      setRejectModalOpen(true);
      handleMenuClose();
      return;
    }

    await updateStatus(newStatus, null);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    await updateStatus('rejected', rejectionReason);
    setRejectModalOpen(false);
    setRejectionReason('');
  };

  const updateStatus = async (status, reason = null) => {
    if (!updatingRequisitionId) {
      toast.error('No requisition selected');
      return;
    }

    setUpdating(true);
    handleMenuClose();

    try {
      const payload = { status };
      if (reason) {
        payload.rejection_reason = reason;
      }

      const response = await fetch(`${API_BASE}/psc/requisitions/${updatingRequisitionId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Status Updated to ${status.toUpperCase()}`);
        fetchRequisitions(paginationModel.page); // Refresh the list
        setUpdatingRequisitionId(null);
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status: ' + error.message);
      console.error('Status update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const renderFileLink = (path) => {
    if (!path) return <span className="text-gray-400 italic">No file</span>;
    const rootUrl = Config.apiUrl.replace('/api/v1', '').replace('/v1', '');
    const fullUrl = `${rootUrl}/${path}`;
    const fileName = path.split('/').pop();
    const shortName = fileName.length > 35 ? fileName.substring(0, 35) + '...' : fileName;

    return (
      <Link href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {shortName}
      </Link>
    );
  };

  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved')) return 'bg-green-100 text-green-700';
    if (statusLower.includes('rejected')) return 'bg-red-100 text-red-700';
    if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const columns = [
    { field: 'requisition_form', headerName: 'Requisition Form', flex: 1, renderCell: (params) => renderFileLink(params.value) },
    { field: 'annex_a_form', headerName: 'Annex-A Form', flex: 1, renderCell: (params) => renderFileLink(params.value) },
    { field: 'other_attachment', headerName: 'Other Attachment', flex: 1, renderCell: (params) => renderFileLink(params.value) },
    { field: 'remarks', headerName: 'Remarks', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const status = params.value || 'pending';

        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(status)}`}>
            {status.toUpperCase()}
          </span>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => handleMenuOpen(e, params.row)}
          size="small"
          sx={{ color: 'text.secondary' }}
          disabled={updating}
        >
          <MoreVertical size={20} />
        </IconButton>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Typography variant="h6" className="font-semibold mb-2">
        Submitted Requisitions (PSC)
      </Typography>
      <Typography variant="body2" className="text-slate-500 mb-6">
        All submitted requisitions with document links and status.
      </Typography>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-3">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <Typography variant="h5" className="font-bold text-blue-700">{stats.total}</Typography>
          <Typography variant="caption" className="text-gray-600">Total</Typography>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <Typography variant="h5" className="font-bold text-yellow-700">{stats.pending}</Typography>
          <Typography variant="caption" className="text-gray-600">Pending</Typography>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <Typography variant="h5" className="font-bold text-green-700">{stats.approved}</Typography>
          <Typography variant="caption" className="text-gray-600">Approved</Typography>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <Typography variant="h5" className="font-bold text-red-700">{stats.rejected}</Typography>
          <Typography variant="caption" className="text-gray-600">Rejected</Typography>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ width: '100%' }}>
        {loading ? (
          <InlineLoader text="Loading requisitions..." variant="ring" size="lg" />
        ) : error ? (
          <div className="text-red-600 text-center py-10">
            <strong>Error:</strong> {error}
            <br />
            <small>Check console for details. Make sure token is valid and backend is running.</small>
          </div>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pagination
            paginationMode="server"
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 75, 100]}
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

      {/* Status Update Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleStatusUpdate('pending')} disabled={updating}>
          <Clock size={18} style={{ marginRight: '8px' }} />
          Set Pending
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate('approved')} disabled={updating}>
          <CheckCircle size={18} style={{ marginRight: '8px', color: '#22c55e' }} />
          Approve
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate('rejected')} disabled={updating} sx={{ color: 'error.main' }}>
          <XCircle size={18} style={{ marginRight: '8px' }} />
          Reject
        </MenuItem>
      </Menu>

      {/* Rejection Reason Modal */}
      <Dialog 
        open={rejectModalOpen} 
        onClose={() => {
          setRejectModalOpen(false);
          setRejectionReason('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Requisition #{updatingRequisitionId || 'N/A'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a reason for rejection..."
            helperText={`${rejectionReason.length}/1000 characters`}
            inputProps={{ maxLength: 1000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setRejectModalOpen(false);
              setRejectionReason('');
            }}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRejectSubmit}
            variant="contained"
            color="error"
            disabled={updating || !rejectionReason.trim()}
          >
            {updating ? 'Rejecting...' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PscTable;