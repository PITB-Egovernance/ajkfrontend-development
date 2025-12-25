import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Typography, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { MoreVertical, Eye, Upload, Pencil, Trash2, X } from 'lucide-react';
import { InlineLoader } from '../../components/ui/Loader';
import { useNavigate } from 'react-router-dom';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';
import toast from 'react-hot-toast';

const RequisitionList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [uploadingJobId, setUploadingJobId] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [uploadForm, setUploadForm] = useState({
    requisition_form: null,
    annex_a_form: null,
    other_attachment: null,
    confirm_upload: false,
    remarks: ''
  });
  const navigate = useNavigate();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleView = () => {
    if (selectedRow) {
      navigate(`${selectedRow.id}`);
    }
    handleMenuClose();
  };

  const handleUpload = () => {
    if (selectedRow) {
      setUploadingJobId(selectedRow.id);
      setUploadModalOpen(true);
    } else {
      toast.error('No requisition selected');
    }
    handleMenuClose();
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setUploadingJobId(null);
    setUploadForm({
      requisition_form: null,
      annex_a_form: null,
      other_attachment: null,
      confirm_upload: false,
      remarks: ''
    });
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Only PDF, DOC, DOCX, JPG, PNG are allowed');
        e.target.value = '';
        return;
      }

      if (file.size > maxSize) {
        toast.error('File size must be less than 2MB');
        e.target.value = '';
        return;
      }

      setUploadForm(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadingJobId) {
      toast.error('No requisition selected');
      return;
    }

    if (!uploadForm.requisition_form) {
      toast.error('Requisition form is required');
      return;
    }

    if (!uploadForm.confirm_upload) {
      toast.error('Please confirm the upload');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('job_id', uploadingJobId);
      formData.append('requisition_form', uploadForm.requisition_form);
      
      if (uploadForm.annex_a_form) {
        formData.append('annex_a_form', uploadForm.annex_a_form);
      }
      
      if (uploadForm.other_attachment) {
        formData.append('other_attachment', uploadForm.other_attachment);
      }
      
      formData.append('confirm_upload', uploadForm.confirm_upload ? '1' : '0');
      
      if (uploadForm.remarks) {
        formData.append('remarks', uploadForm.remarks);
      }

      console.log('Uploading files for job_id:', uploadingJobId);

      const response = await fetch(`${API_BASE}/requisition/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
        body: formData
      });

      const result = await response.json();
      console.log('Upload response:', result);

      if (response.ok && result.status === 200) {
        toast.success('Files uploaded successfully!');
        handleCloseUploadModal();
        fetchRequisitions(page);
      } else {
        toast.error(result.error || 'File upload failed');
      }
    } catch (error) {
      toast.error('Error uploading files: ' + error.message);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = () => {
    if (selectedRow) {
      navigate(`/dashboard/requisitions/edit/${selectedRow.id}`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    
    handleMenuClose();
    
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold text-gray-800">Delete Requisition</p>
          <p className="text-sm text-gray-600 mt-1">
            Are you sure you want to delete requisition #{selectedRow.id}?
          </p>
          <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setLoading(true);
              try {
                const response = await fetch(`${API_BASE}/requisition/${selectedRow.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Accept': 'application/json',
                    'X-API-KEY': API_KEY,
                  },
                });
                
                const result = await response.json();
                
                if (result.status === 200) {
                  toast.success('Requisition deleted successfully');
                  fetchRequisitions(page);
                } else {
                  toast.error(result.error || 'Failed to delete requisition');
                }
              } catch (error) {
                toast.error('Error deleting requisition');
                console.error(error);
              } finally {
                setLoading(false);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
    });
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('draft')) return 'bg-gray-100 text-gray-700';
    if (statusLower.includes('pending') || statusLower.includes('submitted')) return 'bg-yellow-100 text-yellow-700';
    if (statusLower.includes('approved')) return 'bg-green-100 text-green-700';
    if (statusLower.includes('rejected')) return 'bg-red-100 text-red-700';
    if (statusLower.includes('completed')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const columns = [
    { field: 'id', headerName: 'Ref', width: 100 },
    { field: 'designation', headerName: 'Designation', flex: 1 },
    { field: 'scale', headerName: 'Scale', width: 150 },
    { field: 'num_posts', headerName: 'Posts', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(params.value)}`}>
          {params.value}
        </span>
      ),
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
        >
          <MoreVertical size={20} />
        </IconButton>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Typography variant="h6" className="font-semibold mb-2">
            List of Requisitions
          </Typography>
          <Typography variant="body2" className="text-slate-500">
            All requisitions are shown below.
          </Typography>
        </div>
        <button
          onClick={() => navigate('create')}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200"
        >
          + Add New
        </button>
      </div>

      <div style={{ width: '100%' }}>
        {loading ? (
          <InlineLoader text="Loading requisitions..." variant="ring" size="lg" />
        ) : error ? (
          <div className="text-red-600 text-center py-8">
            Error: {error}
          </div>
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
        <MenuItem onClick={handleView}>
          <Eye size={18} style={{ marginRight: '8px' }} />
          View
        </MenuItem>
        <MenuItem onClick={handleUpload}>
          <Upload size={18} style={{ marginRight: '8px' }} />
          Upload
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Pencil size={18} style={{ marginRight: '8px' }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Trash2 size={18} style={{ marginRight: '8px' }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Upload Modal */}
      <Dialog 
        open={uploadModalOpen} 
        onClose={handleCloseUploadModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="flex justify-between items-center">
          <span className="font-semibold">Upload Files for Requisition #{uploadingJobId || 'N/A'}</span>
          <IconButton onClick={handleCloseUploadModal} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <div className="space-y-4">
            {/* Requisition Form - Required */}
            <div>
              <Typography variant="body2" className="mb-2 font-medium">
                Requisition Form <span className="text-red-500">*</span>
              </Typography>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={(e) => handleFileChange(e, 'requisition_form')}
                className="w-full p-2 border border-gray-300 rounded"
              />
              {uploadForm.requisition_form && (
                <Typography variant="caption" className="text-green-600 mt-1 block">
                  Selected: {uploadForm.requisition_form.name}
                </Typography>
              )}
            </div>

            {/* Annex A Form - Optional */}
            <div>
              <Typography variant="body2" className="mb-2 font-medium">
                Annex A Form
              </Typography>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={(e) => handleFileChange(e, 'annex_a_form')}
                className="w-full p-2 border border-gray-300 rounded"
              />
              {uploadForm.annex_a_form && (
                <Typography variant="caption" className="text-green-600 mt-1 block">
                  Selected: {uploadForm.annex_a_form.name}
                </Typography>
              )}
            </div>

            {/* Other Attachment - Optional */}
            <div>
              <Typography variant="body2" className="mb-2 font-medium">
                Other Attachment
              </Typography>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={(e) => handleFileChange(e, 'other_attachment')}
                className="w-full p-2 border border-gray-300 rounded"
              />
              {uploadForm.other_attachment && (
                <Typography variant="caption" className="text-green-600 mt-1 block">
                  Selected: {uploadForm.other_attachment.name}
                </Typography>
              )}
            </div>

            {/* Remarks */}
            <TextField
              label="Remarks"
              multiline
              rows={3}
              fullWidth
              value={uploadForm.remarks}
              onChange={(e) => setUploadForm(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Add any remarks (max 500 characters)"
              inputProps={{ maxLength: 500 }}
              helperText={`${uploadForm.remarks.length}/500 characters`}
            />

            {/* Confirm Upload Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={uploadForm.confirm_upload}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, confirm_upload: e.target.checked }))}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  I confirm that the uploaded files are correct <span className="text-red-500">*</span>
                </Typography>
              }
            />

            <Typography variant="caption" className="text-gray-500 block mt-2">
              * Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max size: 2MB)
            </Typography>
          </div>
        </DialogContent>

        <DialogActions className="p-4">
          <Button 
            onClick={handleCloseUploadModal} 
            color="inherit"
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUploadSubmit}
            variant="contained"
            color="primary"
            disabled={uploading || !uploadForm.requisition_form || !uploadForm.confirm_upload}
            startIcon={uploading ? <InlineLoader variant="ring" size="sm" /> : <Upload size={18} />}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RequisitionList;
