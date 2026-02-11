import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  MenuItem,
  Alert,
} from '@mui/material';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const DispatchSentAddNew = () => {
  const navigate = useNavigate();

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    to: '',
    from: '',
    diary_outward_no: '',
    dispatch_no: '',
    date_dispatch: '',
    time_dispatch: '',
    priority: 'Normal',
    confidentiality_level: 'Normal',
    subject: '',
    summary: '',
    related_module: '',
    department_party_name: '',
    dispatch_method_detail: '',
    consignment_no: '',
    assign_to_section_officer: '',
    archive_dispose: '',
    no_pages: '',
    status: 'Open',
  });

  const [files, setFiles] = useState({
    scan_upload_document: null,
    proof_of_delivery: null,
    barcode_qr_code: null,
    attachments: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user types
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    const file = fileList[0] || null;
    setFiles((prev) => ({ ...prev, [name]: file }));
    
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${name.replace(/_/g, ' ')} is too large. Maximum 10MB allowed.`);
        e.target.value = '';
        return;
      }
      toast.success(`${file.name} uploaded successfully`);
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.to.trim()) errors.push('"To" field is required');
    if (!formData.from.trim()) errors.push('"From" field is required');
    if (!formData.diary_outward_no.trim()) errors.push('"Diary Outward No." is required');
    if (!formData.date_dispatch) errors.push('"Date Dispatched" is required');
    if (!formData.subject.trim()) errors.push('"Subject" is required');
    if (!files.scan_upload_document) errors.push('"Scanned Document" is required');

    if (errors.length > 0) {
      errors.forEach((error, index) => {
        setTimeout(() => {
          toast.error(error);
        }, index * 150);
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    toast.loading('Submitting dispatched form...');

    const data = new FormData();

    // Append all text fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    // Append files
    Object.entries(files).forEach(([key, file]) => {
      if (file) data.append(key, file);
    });

    try {
      const response = await fetch(`${API_BASE}/dispatched-forms`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
          // Don't set Content-Type — browser sets it with boundary
        },
        body: data,
      });

      const result = await response.json();
      toast.dismiss();

      if (response.ok && result.success) {
        toast.success('Dispatched form submitted successfully!');
        setTimeout(() => {
          navigate('/dashboard/dispatch/sent');
        }, 1000);
      } else {
        const errors = result.errors || {};
        if (Object.keys(errors).length > 0) {
          Object.entries(errors).forEach(([field, messages], index) => {
            setTimeout(() => {
              const fieldName = field.replace(/_/g, ' ');
              messages.forEach((msg) => {
                toast.error(`${fieldName}: ${msg}`);
              });
            }, index * 150);
          });
        } else {
          toast.error(result.message || 'Failed to submit form');
        }
        setError(result.message || 'Please check the form and try again.');
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Network error. Please check your connection and try again.');
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="p-8 max-w-[1200px] mx-auto bg-white rounded-lg shadow-md">

      <Box className="flex justify-between items-center mb-8">
        <Typography variant="h5" fontWeight="bold">
          Add New Dispatched Form
        </Typography>
        <Link to="/dashboard/dispatch/sent">
          <Button variant="outlined">← Back to List</Button>
        </Link>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Row 1 */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="To"
              name="to"
              value={formData.to}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="From"
              name="from"
              value={formData.from}
              onChange={handleChange}
              required
            />
          </Grid>

          {/* Row 2 */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Diary Outward No."
              name="diary_outward_no"
              value={formData.diary_outward_no}
              onChange={handleChange}
              placeholder="e.g. D.O.No-2025/145"
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Dispatch No."
              name="dispatch_no"
              value={formData.dispatch_no}
              onChange={handleChange}
            />
          </Grid>

          {/* Row 3 */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date Dispatched *"
              name="date_dispatch"
              type="date"
              value={formData.date_dispatch}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Time Dispatched"
              name="time_dispatch"
              type="time"
              value={formData.time_dispatch}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Priority & Confidentiality */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <MenuItem value="Normal">Normal</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Confidentiality Level"
              name="confidentiality_level"
              value={formData.confidentiality_level}
              onChange={handleChange}
            >
              <MenuItem value="Normal">Normal</MenuItem>
              <MenuItem value="Confidential">Confidential</MenuItem>
              <MenuItem value="Secret">Secret</MenuItem>
              <MenuItem value="Top Secret">Top Secret</MenuItem>
            </TextField>
          </Grid>

          {/* Subject */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Subject *"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              multiline
              rows={2}
            />
          </Grid>

          {/* Summary */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Summary"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              multiline
              rows={4}
            />
          </Grid>

          {/* Other Fields */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Related Module"
              name="related_module"
              value={formData.related_module}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Department/Party Name"
              name="department_party_name"
              value={formData.department_party_name}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Dispatch Method Detail"
              name="dispatch_method_detail"
              value={formData.dispatch_method_detail}
              onChange={handleChange}
              placeholder="e.g. Courier - TCS"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="no pages"
              name="no_pages"
              value={formData.no_pages}
              onChange={handleChange}
              placeholder="e.g. Courier - TCS"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="In progress">In progress</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Consignment No."
              name="consignment_no"
              value={formData.consignment_no}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Assign To Section/Officer"
              name="assign_to_section_officer"
              value={formData.assign_to_section_officer}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Archive/Dispose"
              name="archive_dispose"
              value={formData.archive_dispose}
              onChange={handleChange}
              placeholder="e.g. Archive after 5 years"
            />
          </Grid>

          {/* File Uploads */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Attachments
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button variant="outlined" component="label" fullWidth>
              Upload Scanned Document / Letter *
              <input
                type="file"
                name="scan_upload_document"
                hidden
                required
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </Button>
            {files.scan_upload_document && (
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'success.main' }}>
                ✓ {files.scan_upload_document.name}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button variant="outlined" component="label" fullWidth>
              Proof of Delivery (PDF)
              <input
                type="file"
                name="proof_of_delivery"
                hidden
                accept=".pdf"
                onChange={handleFileChange}
              />
            </Button>
            {files.proof_of_delivery && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {files.proof_of_delivery.name}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button variant="outlined" component="label" fullWidth>
              Barcode / QR Code (Image)
              <input
                type="file"
                name="barcode_qr_code"
                hidden
                accept="image/*"
                onChange={handleFileChange}
              />
            </Button>
            {files.barcode_qr_code && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {files.barcode_qr_code.name}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button variant="outlined" component="label" fullWidth>
              Additional Attachments (PDF)
              <input
                type="file"
                name="attachments"
                hidden
                accept=".pdf"
                onChange={handleFileChange}
              />
            </Button>
            {files.attachments && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {files.attachments.name}
              </Typography>
            )}
          </Grid>
        </Grid>

        <Box className="mt-10 text-right flex gap-4 justify-end">
          <Link to="/dashboard/dispatch/sent">
            <Button variant="outlined" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={
              loading && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )
            }
          >
            {loading ? 'Submitting...' : 'Submit Dispatched Form'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default DispatchSentAddNew;