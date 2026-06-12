import React, { useState, useEffect, useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Typography, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { MoreVertical, Eye, Upload, Pencil, Trash2, X, ArrowRight } from 'lucide-react';
import { InlineLoader } from 'components/ui/Loader';
import { useNavigate, Link } from 'react-router-dom';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import RequisitionApi from 'api/requisitionApi';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
import AdvancedFilter from 'components/tables/AdvancedFilter';

const isDraftStatusValue = (status) => {
  return (status || '').toLowerCase().includes('draft');
};

const hasDraftIdentity = (row) => {
  return Boolean(row?.temp_id) || Boolean(row?.current_step);
};

const RequisitionList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [uploadingJobId, setUploadingJobId] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localDraftMeta, setLocalDraftMeta] = useState(null);
  // Grades list — fetched once on mount from /settings/grades so the
  // "Scale" column can display the actual grade name (e.g. "BPS-17")
  // rather than the raw hash_id stored in the requisition record.
  const [gradeOptions, setGradeOptions] = useState([]);
  const [filters, setFilters] = useState({
    id: '',
    designation: '',
    scale: '',
    num_posts: '',
    status: ''
  });

  const filterConfig = [
    { name: 'id', label: 'Ref', type: 'text', placeholder: 'Filter by ref' },
    { name: 'designation', label: 'Designation', type: 'text', placeholder: 'Filter by designation' },
    { name: 'scale', label: 'Scale', type: 'text', placeholder: 'Filter by scale' },
    { name: 'num_posts', label: 'Posts', type: 'text', placeholder: 'Filter by posts' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'Approved', label: 'Approved' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Rejected', label: 'Rejected' },
        { value: 'Draft', label: 'Draft' }
      ]
    }
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      id: '',
      designation: '',
      scale: '',
      num_posts: '',
      status: ''
    });
  };

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
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

  useEffect(() => {
    try {
      const rawDraftMeta = localStorage.getItem('requisitionDraftMeta');
      if (!rawDraftMeta) {
        return;
      }

      const parsedDraftMeta = JSON.parse(rawDraftMeta);
      if (parsedDraftMeta?.temp_id) {
        setLocalDraftMeta(parsedDraftMeta);
      }
    } catch (error) {
      console.warn('Unable to load local draft meta:', error);
    }
  }, []);

  // Fetch the grades list once on mount so the "Scale" column can render
  // the actual grade name (e.g. "BPS-17") instead of the raw hash_id
  // stored in the requisition record.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/settings/grades?per_page=200`, {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept:        'application/json',
            'X-API-KEY':   API_KEY,
          },
        });
        const result = await res.json();
        if (result.success || result.status === 200) {
          const list = result.data?.data ?? result.data ?? [];
          setGradeOptions(
            list
              .filter((g) => (g.status ?? 'active') === 'active')
              .map((g) => ({ id: g.hash_id || g.id, name: g.name }))
          );
        }
      } catch (e) { /* silent */ }
    })();
  }, []);

  // Resolve a stored scale value (hash_id or string) to the grade name
  // from the loaded gradeOptions. Falls back to the raw value if no
  // match.
  const getScaleName = (rawScale) => {
    if (rawScale === null || rawScale === undefined || rawScale === '') return '';
    if (typeof rawScale === 'object') {
      return rawScale.name || rawScale.hash_id || rawScale.id || '';
    }
    const str = String(rawScale).trim();
    const matched = gradeOptions.find((g) => g.id === str || g.name === str);
    return matched ? matched.name : str;
  };

  const fetchRequisitions = async (pageNum = 0, pageSize = 10) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/requisitions?page=${pageNum + 1}&per_page=${pageSize}`;
      console.log('🔍 Fetching requisitions from:', url);
      console.log('📡 API_BASE:', API_BASE);
      console.log('🌐 Environment:', process.env.NODE_ENV);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch requisitions: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Handle different response structures from the API
      const data = result.data || result;
      const dataArray = Array.isArray(data) ? data : (data.data || []);
      const total = result.meta?.total || result.total || (Array.isArray(dataArray) ? dataArray.length : 0);
      console.log('Data Array', dataArray)
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        const requisitions = dataArray.map((item, index) => ({
          id: item.hash_id || item.id || item.temp_id || item.tempId || `temp-${index}-${Date.now()}`,
          hash_id: item.hash_id,
          temp_id: item.temp_id || item.tempId || item.tempID || item.draft_temp_id || '',
          current_step: item.current_step || item.step || item.currentStep || null,
          designation: item.designation,
          scale: item.scale,
          num_posts: item.num_posts,
          status: item.status || (item.temp_id ? 'Draft' : 'Pending'),
        }));
        setRows(requisitions);
        setTotal(total);
      } else {
        setRows([]);
        setTotal(0);
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch requisitions';
      console.error('❌ Error fetching requisitions:', {
        message: errorMsg,
        error: err,
        timestamp: new Date().toISOString()
      });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions(paginationModel.page, paginationModel.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize]);


  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filters.id && !String(row.id).toLowerCase().includes(filters.id.toLowerCase())) {
        return false;
      }
      if (filters.designation && !row.designation?.toLowerCase().includes(filters.designation.toLowerCase())) {
        return false;
      }
      if (filters.scale && !String(row.scale).toLowerCase().includes(filters.scale.toLowerCase())) {
        return false;
      }
      if (filters.num_posts && !String(row.num_posts).toLowerCase().includes(filters.num_posts.toLowerCase())) {
        return false;
      }
      if (filters.status && row.status?.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [rows, filters]);

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
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed. Please upload a PDF file (Max size: 2MB)');
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

  // const handleUploadSubmit = async () => {
  //   if (!uploadingJobId) {
  //     toast.error('No requisition selected');
  //     return;
  //   }

  //   if (!uploadForm.requisition_form) {
  //     toast.error('Requisition form is required');
  //     return;
  //   }

  //   if (!uploadForm.confirm_upload) {
  //     toast.error('Please confirm the upload');
  //     return;
  //   }

  //   setUploading(true);

  //   try {
  //     const formData = new FormData();
  //     formData.append('job_id', uploadingJobId);
  //     formData.append('requisition_form', uploadForm.requisition_form);
      
  //     if (uploadForm.annex_a_form) {
  //       formData.append('annex_a_form', uploadForm.annex_a_form);
  //     }
      
  //     if (uploadForm.other_attachment) {
  //       formData.append('other_attachment', uploadForm.other_attachment);
  //     }
      
  //     formData.append('confirm_upload', uploadForm.confirm_upload ? '1' : '0');
      
  //     if (uploadForm.remarks) {
  //       formData.append('remarks', uploadForm.remarks);
  //     }

  //     console.log('Uploading files for job_id:', uploadingJobId);

  //     const response = await fetch(`${API_BASE}/requisitions/upload`, {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Bearer ${TOKEN}`,
  //         'X-API-KEY': API_KEY,
  //         'Accept':'application/json'
  //       },
  //       body: formData
  //     });

  //     const result = await response.json();
  //     console.log('Upload response:', result);

  //     if (result.success) {
  //       toast.success(result.message || 'Files uploaded successfully!');
  //       handleCloseUploadModal();
  //       fetchRequisitions(paginationModel.page, paginationModel.pageSize);
  //     } else {
  //       toast.error(result.message || result.error || 'File upload failed');
  //     }
  //   } catch (error) {
  //     toast.error('Error uploading files: ' + error.message);
  //     console.error('Upload error:', error);
  //   } finally {
  //     setUploading(false);
  //   }
  // };

  const handleUploadSubmit = async () => {
  if (!uploadingJobId) {
    toast.error("No requisition selected");
    return;
  }

  if (!uploadForm.requisition_form) {
    toast.error("Requisition form is required");
    return;
  }

  if (!uploadForm.confirm_upload) {
    toast.error("Please confirm the upload");
    return;
  }

  setUploading(true);

  try {
    const formData = new FormData();
    formData.append("job_id", uploadingJobId);
    formData.append("requisition_form", uploadForm.requisition_form);

    if (uploadForm.annex_a_form) {
      formData.append("annex_a_form", uploadForm.annex_a_form);
    }

    if (uploadForm.other_attachment) {
      formData.append("other_attachment", uploadForm.other_attachment);
    }

    formData.append("confirm_upload", uploadForm.confirm_upload ? "1" : "0");

    if (uploadForm.remarks) {
      formData.append("remarks", uploadForm.remarks);
    }

    console.log("Uploading files for job_id:", uploadingJobId);

    const response = await fetch(`${API_BASE}/requisitions/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "X-API-KEY": API_KEY,
        Accept: "application/json",
      },
      body: formData,
    });

    // 🔹 Try to safely parse JSON
    let result = null;
    try {
      result = await response.json();
    } catch {
      throw new Error("Invalid server response");
    }

    // console.log("Upload response:", result);

    // 🔹 Handle HTTP errors
    if (!response.ok) {
      throw new Error(result?.message || "Server returned an error");
    }

    // 🔹 Success
    if (result.success || result.status === 200) {
      toast.success(result.message || "Files uploaded successfully!");

      handleCloseUploadModal();
      navigate('/dashboard/psc-table')
    } else {
      toast.error(result.message || result.error || "Upload failed");
    }

  } catch (error) {
    console.error("Upload error:", error);

    // 🔹 Network error
    if (error.name === "TypeError") {
      toast.error("Network error. Please check internet connection.");
    } else {
      toast.error(error.message || "File upload failed");
    }

  } finally {
    setUploading(false);
  }
};

  const handleEdit = () => {
    if (selectedRow) {
      // Use hash_id for editing to match API endpoint
      const editId = selectedRow.hash_id || selectedRow.id;
      console.log('📝 Editing requisition:', editId);
      navigate(`/dashboard/requisitions/edit/${editId}`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    
    handleMenuClose();
    
    if (!await confirmDelete({ title: 'Delete Requisition', identifier: `#${selectedRow.id}` })) return;
    setLoading(true);
    try {
      const deleteId = selectedRow.hash_id || selectedRow.id;
      console.log('🗑️ Deleting requisition:', deleteId);
      
      const result = await RequisitionApi.delete(deleteId);
      console.log('🗑️ Delete response:', result);
      
      if (result.success) {
        toast.success(result.message || 'Requisition deleted successfully');
        fetchRequisitions(paginationModel.page, paginationModel.pageSize);
      } else {
        toast.error(result.error || result.message || 'Failed to delete requisition');
      }
    } catch (error) {
      toast.error(error.message || 'Error deleting requisition');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
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
    {
      field: 'scale', headerName: 'Scale', width: 150,
      // Resolve the stored hash_id (e.g. "pOzq4kYWBm9l") to the actual
      // grade name (e.g. "BPS-17") via the loaded gradeOptions list.
      // Falls back to the raw value if no match.
      renderCell: (params) => <span>{getScaleName(params.value) || '—'}</span>,
    },
    { field: 'num_posts', headerName: 'Posts', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(params.value)}`}>
          {params.value === "approved"
          ? "APPROVED"
          : params.value === "pending"
          ? "PENDING"
          : params.value === "rejected"
          ? "REJECTED"
          : params.value}
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
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">List of Requisitions</h1>
            <p className="text-sm text-slate-500 mt-1">All requisitions are shown below.</p>
          </div>
          <div className="flex items-center gap-3">
            {localDraftMeta?.temp_id && (
              <Link
                to={`/dashboard/requisitions/create?temp_id=${encodeURIComponent(localDraftMeta.temp_id)}&step=${localDraftMeta.step || 1}`}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition-all duration-200"
              >
                <ArrowRight className="w-4 h-4" /> Resume Draft
              </Link>
            )}
            <button
              onClick={() => navigate('create')}
              className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              + Add New
            </button>
          </div>
        </div>

        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
        />

        <div className="bg-white rounded-lg shadow-sm mt-4">
          <div style={{ width: '100%', height: 'auto' }}>
            {loading ? (
              <InlineLoader text="Loading requisitions..." variant="ring" size="lg" />
            ) : error ? (
              <div className="text-red-600 text-center py-8">
                Error: {error}
              </div>
            ) : (
              <DataGrid
                rows={filteredRows}
                columns={columns}
                getRowId={(row) => row.id}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50]}
                paginationMode="server"
                rowCount={total}
                loading={loading}
                disableRowSelectionOnClick
                autoHeight
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid #f1f5f9',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: '#f8fafc',
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontWeight: 'bold',
                    color: '#475569',
                  },
                }}
              />
        )}
        </div>
      </div>
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
        {selectedRow && (isDraftStatusValue(selectedRow.status) || hasDraftIdentity(selectedRow)) && (
            <MenuItem onClick={() => {
              const draftId = selectedRow.temp_id || selectedRow.hash_id || selectedRow.id;
              const stepQuery = selectedRow.current_step ? `&step=${selectedRow.current_step}` : '';
              navigate(`/dashboard/requisitions/create?temp_id=${encodeURIComponent(draftId)}${stepQuery}`);
              handleMenuClose();
            }}>
              <Pencil size={18} style={{ marginRight: '8px' }} />
              Resume Draft
            </MenuItem>
          )}
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
                accept=".pdf"
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
                accept=".pdf"
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
                accept=".pdf"
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
              * Only PDF files accepted (Max size: 2MB)
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
            disabled={uploading || !uploadForm.requisition_form || !uploadForm.confirm_upload}
            startIcon={uploading ? <InlineLoader variant="ring" size="sm" /> : <Upload size={18} />}
            sx={{
              background: 'linear-gradient(to bottom right, #022c22, #064e3b, #022c22)',
              color: '#fff',
              fontWeight: 500,
              textTransform: 'none',
              borderRadius: '8px',
              px: 3,
              py: 1.25,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
              '&:hover': {
                background: 'linear-gradient(to bottom right, #064e3b, #022c22)',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              },
              '&.Mui-disabled': {
                background: 'linear-gradient(to bottom right, #022c22, #064e3b, #022c22)',
                opacity: 0.5,
                color: '#fff',
              },
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RequisitionList;