import React, { useState } from 'react';
import { TextField, MenuItem } from '@mui/material';

const Step2Criteria = ({ data, onNext, onBack }) => {
  const [formData, setFormData] = useState({
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

  const [showAuthority, setShowAuthority] = useState(data.equivalent_qualification === 'Yes');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'equivalent_qualification') {
      setShowAuthority(value === 'Yes');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
            <MenuItem value="Matric">Matric</MenuItem>
            <MenuItem value="Intermediate">Intermediate</MenuItem>
            <MenuItem value="Bachelor">Bachelor</MenuItem>
            <MenuItem value="Master">Master</MenuItem>
            <MenuItem value="PhD">PhD</MenuItem>
          </TextField>
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            select
            label="Equivalent Qualification"
            name="equivalent_qualification"
            value={formData.equivalent_qualification}
            onChange={handleChange}
          >
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
            required
            select
            label="Name Degree of Equivalence"
            name="degree_equivalence"
            value={formData.degree_equivalence}
            onChange={handleChange}
          >
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
            label="Any Other Qualification under Rules"
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
            label="Training with the name of Training Institute"
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
            <MenuItem value="Bachelor">Bachelor</MenuItem>
            <MenuItem value="Master">Master</MenuItem>
            <MenuItem value="PhD">PhD</MenuItem>
          </TextField>
        </div>
      </div>

      <small className="d-block mt-3 text-muted">
        Note: Only those experience certificates shall be accepted which are in accordance with rule notification #AJKPSC/1-2017/1077-10AJKPSC.
      </small>

      <div className="navigation-buttons">
        <button type="button" className="btn btn-prev" onClick={onBack}>
          Previous
        </button>
        <button type="submit" className="btn btn-next">
          Save & Continue
        </button>
      </div>
    </form>
  );
};

export default Step2Criteria;
