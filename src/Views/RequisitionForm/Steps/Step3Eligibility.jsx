import { useState, useEffect } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { Plus, X } from 'lucide-react';

const Step3Eligibility = ({ data, onNext, onBack, isEdit = false }) => {
  const [formData, setFormData] = useState({
    min_age: data.min_age || 18,
    max_age: data.max_age || 40,
    age_relaxation: data.age_relaxation || '',
    relaxation_reason: data.relaxation_reason || '',
    relaxation_years: data.relaxation_years || '',
    nationality: data.nationality || '',
    domicile: data.domicile || '',
    other_conditions: data.other_conditions || '',
    gender_basis: data.gender_basis || '',
    district: data.district || [''],
    quota: data.quota || [''],
    post: data.post || [''],
  });

  const [showRelaxation, setShowRelaxation] = useState(data.age_relaxation === 'Yes');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'age_relaxation') {
      setShowRelaxation(value === 'Yes');
    }
  };

  const handleArrayChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addRow = () => {
    setFormData(prev => ({
      ...prev,
      district: [...prev.district, ''],
      quota: [...prev.quota, ''],
      post: [...prev.post, '']
    }));
  };

  const removeRow = (index) => {
    if (formData.district.length > 1) {
      setFormData(prev => ({
        ...prev,
        district: prev.district.filter((_, i) => i !== index),
        quota: prev.quota.filter((_, i) => i !== index),
        post: prev.post.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h6 className="section-title">Eligibility Criteria</h6>

      <div className="row">
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            type="number"
            label="Minimum Age"
            name="min_age"
            value={formData.min_age}
            onChange={handleChange}
            inputProps={{ min: 18 }}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            type="number"
            label="Maximum Age"
            name="max_age"
            value={formData.max_age}
            onChange={handleChange}
            inputProps={{ min: formData.min_age }}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            select
            label="Age Relaxation"
            name="age_relaxation"
            value={formData.age_relaxation}
            onChange={handleChange}
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
        </div>

        {showRelaxation && (
          <>
            <div className="col-md-6 form-group">
              <TextField
                fullWidth
                select
                label="Reason for Age Relaxation"
                name="relaxation_reason"
                value={formData.relaxation_reason}
                onChange={handleChange}
              >
                <MenuItem value="Disability">Disability</MenuItem>
                <MenuItem value="Government Employee">Government Employee</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </div>

            <div className="col-md-6 form-group">
              <TextField
                fullWidth
                type="number"
                label="Years of Relaxation"
                name="relaxation_years"
                value={formData.relaxation_years}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </div>
          </>
        )}

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            select
            label="Nationality"
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
          >
            <MenuItem value="Pakistani/AJK">Pakistani/AJK</MenuItem>
          </TextField>
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            label="Domicile (Name Districts/Units)"
            name="domicile"
            value={formData.domicile}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Any Other Conditions"
            name="other_conditions"
            value={formData.other_conditions}
            onChange={handleChange}
            multiline
            rows={2}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            select
            label="Gender"
            name="gender_basis"
            value={formData.gender_basis}
            onChange={handleChange}
          >
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
            <MenuItem value="Male/Female">Male or Female</MenuItem>
          </TextField>
        </div>
      </div>

      <h6 className="section-title" style={{ marginTop: '30px', marginBottom: '20px', fontSize: '1.05rem', fontWeight: '600' }}>Quota Wise Post Distribution</h6>

      <div className="table-responsive" style={{ marginTop: '15px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', width: '100%' }}>
        <table className="table table-bordered" style={{ marginBottom: 0, width: '100%' }}>
          <thead style={{ backgroundColor: '#006622' }}>
            <tr>
              <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem' }}>District</th>
              <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem' }}>Quota (%)</th>
              <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem' }}>Posts</th>
              <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem', width: '140px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {formData.district.map((_, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <TextField
                    fullWidth
                    required
                    size="small"
                    value={formData.district[index]}
                    onChange={(e) => handleArrayChange(index, 'district', e.target.value)}
                    placeholder="Enter District"
                  />
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    value={formData.quota[index]}
                    onChange={(e) => handleArrayChange(index, 'quota', e.target.value)}
                    placeholder="Quota %"
                    inputProps={{ min: 0, max: 100 }}
                  />
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    value={formData.post[index]}
                    onChange={(e) => handleArrayChange(index, 'post', e.target.value)}
                    placeholder="Posts"
                    inputProps={{ min: 0 }}
                  />
                </td>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      type="button"
                      onClick={() => addRow()} 
                      className="btn btn-sm"
                      style={{ backgroundColor: '#006622', color: 'white', padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: '500' }}
                      title="Add Row"
                    >
                      <Plus size={16} />
                    </button>
                    {formData.district.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeRow(index)} 
                        className="btn btn-sm"
                        style={{ backgroundColor: '#dc2626', color: 'white', padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: '500' }}
                        title="Remove Row"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'inline-block' }}>
        <small style={{ color: '#475569', fontWeight: '500', fontSize: '0.85rem' }}>Total Entries: {formData.district.length}</small>
      </div>

      <div className="navigation-buttons">
        <button type="button" className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200" onClick={onBack}>
          Previous
        </button>
        <button type="submit" className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
          Preview
        </button>
      </div>
    </form>
  );
};

export default Step3Eligibility;
