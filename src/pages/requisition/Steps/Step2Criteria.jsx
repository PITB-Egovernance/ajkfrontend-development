import React, { useState, useEffect } from 'react';
import { TextField, MenuItem } from '@mui/material';

const Step2Criteria = ({ data = {}, onNext, onBack, onSaveDraft }) => {

  const [formData, setFormData] = useState({
    academic_qualification: '',
    equivalent_qualification: '',
    authority_certificate: '',
    degree_equivalence: '',
    any_other_qualification: '',
    training_institute: '',
    experience_type: '',
    experience_length: 0,
    min_qualification: '',
  });

  const [showAuthority, setShowAuthority] = useState(false);

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFormData({
        academic_qualification: data.academic_qualification || '',
        equivalent_qualification: data.equivalent_qualification || '',
        authority_certificate: data.authority_certificate || '',
        degree_equivalence: data.degree_equivalence || '',
        any_other_qualification: data.any_other_qualification || '',
        training_institute: data.training_institute || '',
        experience_type: data.experience_type || '',
        experience_length: data.experience_length || 0,
        min_qualification: data.min_qualification || '',
      });

      setShowAuthority(data.equivalent_qualification === 'Yes');
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'experience_length'
        ? parseInt(value) || 0
        : value
    }));

    if (name === 'equivalent_qualification') {

      if (value === 'Yes') {
        setShowAuthority(true);
      } else {
        setShowAuthority(false);

        // Clear dependent fields
        setFormData(prev => ({
          ...prev,
          authority_certificate: '',
          degree_equivalence: ''
        }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Academic always required
    if (!formData.academic_qualification) {
      alert('Academic Qualification is required');
      return;
    }

    // Only when Yes
    if (formData.equivalent_qualification === 'Yes') {

      if (!formData.authority_certificate) {
        alert('Authority Certificate is required when Equivalent Qualification is Yes');
        return;
      }

      if (!formData.degree_equivalence) {
        alert('Name Degree of Equivalence is required when Equivalent Qualification is Yes');
        return;
      }
    }

    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit}>

      <h6 className="section-title">Qualification Required</h6>

      <div className="row">

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            select
            label="Academic Qualification"
            name="academic_qualification"
            value={formData.academic_qualification}
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="Matric">Matric</MenuItem>
            <MenuItem value="Intermediate">Intermediate</MenuItem>
            <MenuItem value="Bachelor">Bachelor</MenuItem>
            <MenuItem value="Master">Master</MenuItem>
            <MenuItem value="PhD">PhD</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            select
            label="Equivalent Qualification"
            name="equivalent_qualification"
            value={formData.equivalent_qualification}
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
        </div>

        {showAuthority && (
          <div className="col-md-6 form-group">
            <TextField
              fullWidth
              label="Authority for Equivalent Certificate"
              name="authority_certificate"
              value={formData.authority_certificate}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            select
            label={
              formData.equivalent_qualification === 'Yes'
                ? 'Name Degree of Equivalence *'
                : 'Name Degree of Equivalence (Optional)'
            }
            name="degree_equivalence"
            value={formData.degree_equivalence}
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="B.Sc">B.Sc</MenuItem>
            <MenuItem value="B.A">B.A</MenuItem>
            <MenuItem value="B.Com">B.Com</MenuItem>
            <MenuItem value="BBA">BBA</MenuItem>
            <MenuItem value="BS Computer Science">BS Computer Science</MenuItem>
            <MenuItem value="BS Information Technology">BS Information Technology</MenuItem>
            <MenuItem value="M.Sc">M.Sc</MenuItem>
            <MenuItem value="M.A">M.A</MenuItem>
            <MenuItem value="M.Com">M.Com</MenuItem>
            <MenuItem value="MBA">MBA</MenuItem>
            <MenuItem value="MS Computer Science">MS Computer Science</MenuItem>
            <MenuItem value="M.Phil">M.Phil</MenuItem>
            <MenuItem value="PhD">PhD</MenuItem>
          </TextField>
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Any Other Qualification under Rules (Optional)"
            name="any_other_qualification"
            value={formData.any_other_qualification}
            onChange={handleChange}
          />
        </div>
      </div>

      <h6 className="section-title">Experience Required</h6>

      <div className="row">

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Training Institute Name (Optional)"
            name="training_institute"
            value={formData.training_institute}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Type of Experience Required"
            name="experience_type"
            value={formData.experience_type}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            type="number"
            label="Length of Experience (in years)"
            name="experience_length"
            value={formData.experience_length}
            onChange={handleChange}
            inputProps={{ min: 0 }}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            select
            label="Minimum Qualification"
            name="min_qualification"
            value={formData.min_qualification}
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="Bachelor">Bachelor</MenuItem>
            <MenuItem value="Master">Master</MenuItem>
            <MenuItem value="PhD">PhD</MenuItem>
          </TextField>
        </div>
      </div>

      <div className="navigation-buttons">
        <button type="button" className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200" onClick={onBack}>
          Previous
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => onSaveDraft?.(formData)} className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200">
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

export default Step2Criteria;