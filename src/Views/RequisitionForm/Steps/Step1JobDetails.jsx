import React, { useState } from 'react';
import { TextField, MenuItem, Button, Grid, Typography, Paper } from '@mui/material';
import { Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

const Step1JobDetails = ({ data, onNext, tempId, isEdit = false }) => {
  const [formData, setFormData] = useState({
    designation: data.designation || '',
    scale: data.scale || '',
    quota_percentage: data.quota_percentage || '',
    num_posts: data.num_posts || 1,
    vacancy_date: data.vacancy_date || '',
    test_type: data.test_type || '',
    service_rules: null,
    syllabus: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error(`${name === 'service_rules' ? 'Service Rules' : 'Syllabus'} must be a PDF file`);
        e.target.value = '';
        return;
      }
      if (file.size > 2048000) {
        toast.error(`${name === 'service_rules' ? 'Service Rules' : 'Syllabus'} must be less than 2MB`);
        e.target.value = '';
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: file
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Briefcase className="text-emerald-600" size={24} />
          </div>
          <div>
            <Typography variant="h6" className="font-semibold text-gray-800">
              Job Details
            </Typography>
            <Typography variant="caption" className="text-gray-600">
              Enter the basic information about the position
            </Typography>
          </div>
        </div>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Designation or Nomenclature of the Post(s)"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Scale of the Post"
            name="scale"
            value={formData.scale}
            onChange={handleChange}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Percentage of Quota (Direct vs Promotion)"
            name="quota_percentage"
            value={formData.quota_percentage}
            onChange={handleChange}
            size="small"
          >
            {[...Array(100)].map((_, i) => (
              <MenuItem key={i + 1} value={i + 1}>{i + 1}%</MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            type="number"
            label="Number of Posts"
            name="num_posts"
            value={formData.num_posts}
            onChange={handleChange}
            inputProps={{ min: 1 }}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Date of Occurrence of Vacancy"
            name="vacancy_date"
            value={formData.vacancy_date}
            onChange={handleChange}
            placeholder="Day-Month-Year (e.g., 09-September-2025)"
            size="small"
            helperText="Format: DD-Month-YYYY"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Test Type"
            name="test_type"
            value={formData.test_type}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="MCQs Base">MCQs Base</MenuItem>
            <MenuItem value="Competitive Base">Competitive Base</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="body2" className="mb-2">
            Service Rules <span className="text-red-500">(PDF File Less than 2 MB)</span>
          </Typography>
          <input
            type="file"
            name="service_rules"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
          />
          {data.service_rules && typeof data.service_rules === 'string' && (
            <Typography variant="caption" className="text-gray-600 mt-1">
              Previous file: {data.service_rules.split('/').pop()}
            </Typography>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="body2" className="mb-2">
            Approved Syllabus <span className="text-red-500">(PDF File Less than 2 MB)</span>
          </Typography>
          <input
            type="file"
            name="syllabus"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
          />
          {data.syllabus && typeof data.syllabus === 'string' && (
            <Typography variant="caption" className="text-gray-600 mt-1">
              Previous file: {data.syllabus.split('/').pop()}
            </Typography>
          )}
        </Grid>
      </Grid>

      <div className="flex justify-end mt-6">
        <Button
          type="submit"
          variant="contained"
          size="large"
          sx={{ 
            backgroundColor: '#059669', 
            '&:hover': { backgroundColor: '#047857' },
            paddingX: 4,
            paddingY: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: 3
          }}
        >
          {isEdit ? 'Update & Continue' : 'Save & Continue'}
        </Button>
      </div>
    </form>
  );
};

export default Step1JobDetails;
