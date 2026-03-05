import React, { useState, useEffect } from 'react';
import { TextField, MenuItem, InputAdornment } from '@mui/material';
import toast from 'react-hot-toast';

const Step1JobDetails = ({ data, onNext, onSaveDraft, tempId, isEdit = false }) => {
  const [formData, setFormData] = useState({
    designation: data.designation || '',
    scale: data.scale || '',
    quota_percentage: data.quota_percentage || '',
    num_posts: data.num_posts || 1,
    vacancy_date: data.vacancy_date || '',
    test_type: data.test_type || '',
    service_rules: data.service_rules || null,
    syllabus: data.syllabus || null,
  });

  // Update form data when data prop changes (for edit mode)
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      console.log('🔄 Step1: Updating form with new data:', data);
      setFormData({
        designation: data.designation || '',
        scale: data.scale || '',
        quota_percentage: data.quota_percentage || '',
        num_posts: data.num_posts || 1,
        vacancy_date: data.vacancy_date || '',
        test_type: data.test_type || '',
        service_rules: data.service_rules || null,
        syllabus: data.syllabus || null,
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    
    // CRITICAL: Ensure we only get ONE file, never an array
    if (files && files.length > 1) {
      console.error('❌ Multiple files selected! Only one file allowed for', name);
      toast.error('Please select only one file');
      e.target.value = '';
      return;
    }
    
    const file = files && files.length > 0 ? files[0] : null;
    
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
      
      console.log(`📎 File selected for ${name}:`, file.name, 'Size:', file.size, 'Type:', file.type);
      
      setFormData(prev => ({
        ...prev,
        [name]: file  // This is a single File object, NEVER an array
      }));
    } else {
      // File input cleared
      console.log(`🗑️ File input cleared for ${name}`);
    }
  };

  const getCleanedFormData = () => {
    const cleanedFormData = { ...formData };

    if (Array.isArray(cleanedFormData.service_rules)) {
      console.warn('⚠️ Step1: service_rules is an array, converting:', cleanedFormData.service_rules);
      cleanedFormData.service_rules = cleanedFormData.service_rules.length > 0 ? cleanedFormData.service_rules[0] : null;
    }

    if (Array.isArray(cleanedFormData.syllabus)) {
      console.warn('⚠️ Step1: syllabus is an array, converting:', cleanedFormData.syllabus);
      cleanedFormData.syllabus = cleanedFormData.syllabus.length > 0 ? cleanedFormData.syllabus[0] : null;
    }

    return cleanedFormData;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedFormData = getCleanedFormData();
    
    console.log('📋 Step1 Form Data being submitted:', {
      ...cleanedFormData,
      service_rules: cleanedFormData.service_rules instanceof File ? `[File: ${cleanedFormData.service_rules.name}]` : cleanedFormData.service_rules,
      syllabus: cleanedFormData.syllabus instanceof File ? `[File: ${cleanedFormData.syllabus.name}]` : cleanedFormData.syllabus,
    });
    
    onNext(cleanedFormData);
  };

  const handleSaveDraftClick = () => {
    const cleanedFormData = getCleanedFormData();
    onSaveDraft?.(cleanedFormData);
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
            label="Percentage of Quota (Direct vs Promotion)"
            name="quota_percentage"
            value={formData.quota_percentage}
            onChange={handleChange}
            type="number"
            inputProps={{ min: 0, max: 100, step: 1 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>
            }}
          />
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

        {/* <div className="col-md-6 form-group">
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
        </div> */}

        <div className="col-md-6 form-group">
          <label>Service Rules <span style={{ color: '#dc3545', fontSize: '0.8em' }}>(PDF File Less than 2 MB)</span></label>
          <input
            type="file"
            name="service_rules"
            accept=".pdf"
            onChange={handleFileChange}
            className="form-control"
            multiple={false}
          />
          {data.service_rules && typeof data.service_rules === 'string' && (
            <small className="text-muted d-block mt-1">Previous file: {data.service_rules.split('/').pop()}</small>
          )}
        </div>

        <div className="col-md-6 form-group">
          <label>Approved Syllabus <span style={{ color: '#dc3545', fontSize: '0.8em' }}>(PDF File Less than 2 MB)</span></label>
          <input
            type="file"
            name="syllabus"
            accept=".pdf"
            onChange={handleFileChange}
            className="form-control"
            multiple={false}
          />
          {data.syllabus && typeof data.syllabus === 'string' && (
            <small className="text-muted d-block mt-1">Previous file: {data.syllabus.split('/').pop()}</small>
          )}
        </div>
      </div>

      <div className="navigation-buttons">
        <div></div>
        <div className="flex gap-2">
          <button type="button" onClick={handleSaveDraftClick} className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200">
            Save Draft
          </button>
          <button type="submit" className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
            Next
          </button>
        </div>
      </div>
    </form>
  );
};

export default Step1JobDetails;
