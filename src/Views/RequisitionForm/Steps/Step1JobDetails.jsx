import React, { useState } from 'react';
import { TextField, MenuItem } from '@mui/material';
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
      <div className="row">
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            label="Designation or Nomenclature of the Post(s)"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            label="Scale of the Post"
            name="scale"
            value={formData.scale}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            select
            label="Percentage of Quota (Direct vs Promotion)"
            name="quota_percentage"
            value={formData.quota_percentage}
            onChange={handleChange}
          >
            {[...Array(100)].map((_, i) => (
              <MenuItem key={i + 1} value={i + 1}>{i + 1}%</MenuItem>
            ))}
          </TextField>
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            type="number"
            label="Number of Posts"
            name="num_posts"
            value={formData.num_posts}
            onChange={handleChange}
            inputProps={{ min: 1 }}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            label="Date of Occurrence of Vacancy"
            name="vacancy_date"
            value={formData.vacancy_date}
            onChange={handleChange}
            placeholder="Day-Month-Year (e.g., 09-September-2025)"
            helperText="Format: DD-Month-YYYY"
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            select
            label="Test Type"
            name="test_type"
            value={formData.test_type}
            onChange={handleChange}
          >
            <MenuItem value="MCQs Base">MCQs Base</MenuItem>
            <MenuItem value="Competitive Base">Competitive Base</MenuItem>
          </TextField>
        </div>

        <div className="col-md-6 form-group">
          <label>Service Rules <span className="required">*</span> <span style={{ color: '#dc3545', fontSize: '0.8em' }}>(PDF File Less than 2 MB)</span></label>
          <input
            type="file"
            name="service_rules"
            accept=".pdf"
            onChange={handleFileChange}
            className="form-control"
          />
          {data.service_rules && typeof data.service_rules === 'string' && (
            <small className="text-muted d-block mt-1">Previous file: {data.service_rules.split('/').pop()}</small>
          )}
        </div>

        <div className="col-md-6 form-group">
          <label>Approved Syllabus <span className="required">*</span> <span style={{ color: '#dc3545', fontSize: '0.8em' }}>(PDF File Less than 2 MB)</span></label>
          <input
            type="file"
            name="syllabus"
            accept=".pdf"
            onChange={handleFileChange}
            className="form-control"
          />
          {data.syllabus && typeof data.syllabus === 'string' && (
            <small className="text-muted d-block mt-1">Previous file: {data.syllabus.split('/').pop()}</small>
          )}
        </div>
      </div>

      <div className="navigation-buttons">
        <div></div>
        <button type="submit" className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
          {isEdit ? 'Update & Continue' : 'Save & Continue'}
        </button>
      </div>
    </form>
  );
};

export default Step1JobDetails;
