import { useState, useEffect } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

// Age limits aligned with AJK PSC / Pakistan government service:
// - 18 is the legal minimum employment age in Pakistan.
// - 60 is the mandatory civil-service retirement age; no entry age may
//   exceed it. Many posts cap at 28–35 with up to 5 years relaxation,
//   so 60 is a hard upper bound, not a practical default.
const AGE_MIN = 18;
const AGE_MAX = 60;

/**
 * Returns { min_age?: string, max_age?: string } with any error messages.
 * An empty object means the values are valid.
 */
const validateAges = (minRaw, maxRaw) => {
  const errors = {};
  const min    = minRaw === '' || minRaw === null ? null : Number(minRaw);
  const max    = maxRaw === '' || maxRaw === null ? null : Number(maxRaw);

  if (min !== null) {
    if (Number.isNaN(min) || !Number.isInteger(min)) errors.min_age = 'Enter a whole number';
    else if (min < AGE_MIN)                          errors.min_age = `Minimum age must be at least ${AGE_MIN}`;
    else if (min > AGE_MAX)                          errors.min_age = `Minimum age cannot exceed ${AGE_MAX}`;
  }
  if (max !== null) {
    if (Number.isNaN(max) || !Number.isInteger(max)) errors.max_age = 'Enter a whole number';
    else if (max < AGE_MIN)                          errors.max_age = `Maximum age must be at least ${AGE_MIN}`;
    else if (max > AGE_MAX)                          errors.max_age = `Maximum age cannot exceed ${AGE_MAX} (retirement age)`;
  }
  if (!errors.min_age && !errors.max_age && min !== null && max !== null) {
    if (min >= max) {
      errors.min_age = 'Must be less than maximum age';
      errors.max_age = 'Must be greater than minimum age';
    }
  }
  return errors;
};

const Step3Eligibility = ({ data, onNext, onBack, onSaveDraft,districtOptions = [], isEdit = false }) => {
  const [formData, setFormData] = useState({
    min_age: data.min_age || '',
    max_age: data.max_age || '',
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
  const [ageErrors,      setAgeErrors]      = useState({});

  // Update form data when data prop changes (for edit mode)
  useEffect(() => {
    
    const normalizedDistricts = Array.isArray(data.district)
      ? data.district.map(d =>
          typeof d === 'object'
            ? d.id || d.hash_id || ''
            : String(d)
        )
      : [''];

    const normalizedDomicile =
      typeof data.domicile === 'object'
        ? data.domicile.id || data.domicile.hash_id || ''
        : data.domicile || '';
    if (data && Object.keys(data).length > 0) {
      console.log('🔄 Step3: Updating form with new data:', data);
      setFormData({
        min_age: data.min_age || '',
        max_age: data.max_age || '',
        age_relaxation: data.age_relaxation || '',
        relaxation_reason: data.relaxation_reason || '',
        relaxation_years: data.relaxation_years || '',
        nationality: data.nationality || '',
        domicile: String(normalizedDomicile),
        other_conditions: data.other_conditions || '',
        gender_basis: data.gender_basis || '',
         district: normalizedDistricts.map(String),
        quota: data.quota || [''],
        post: data.post || [''],
      });
      setShowRelaxation(data.age_relaxation === 'Yes');
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'min_age' || name === 'max_age') {
        setAgeErrors(validateAges(next.min_age, next.max_age));
      }
      return next;
    });

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

  // ── Real-time row-level validation (district unique + post is a non-negative int) ──
  const rowErrors = (() => {
    const districts = formData.district || [];
    const posts     = formData.post || [];
    const seen      = new Map();   // districtId → first index seen
    return districts.map((districtId, i) => {
      const errors = {};
      if (districtId && seen.has(districtId)) {
        errors.district = 'This district is already added in another row';
      } else if (districtId) {
        seen.set(districtId, i);
      }
      const postRaw = posts[i];
      if (postRaw !== '' && postRaw !== null && postRaw !== undefined) {
        const n = Number(postRaw);
        if (!Number.isInteger(n) || n < 0) errors.post = 'Whole number 0 or more';
      }
      return errors;
    });
  })();

  // Sum of entered posts (just informational — Step 1's num_posts is final total)
  const totalPostsEntered = (formData.post || [])
    .reduce((sum, p) => sum + (Number(p) || 0), 0);

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

    const errs = validateAges(formData.min_age, formData.max_age);
    if (Object.keys(errs).length > 0) {
      setAgeErrors(errs);
      toast.error(errs.min_age || errs.max_age || 'Fix the age limits');
      return;
    }

    // Block on row-level errors (duplicate districts, bad post numbers)
    const firstRowError = rowErrors.find((re) => Object.keys(re).length > 0);
    if (firstRowError) {
      toast.error(firstRowError.district || firstRowError.post || 'Fix the district / post rows');
      return;
    }

    onNext({
      ...formData,
      other_conditions: formData.other_conditions || 'N/A',
    });
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
            inputProps={{ min: AGE_MIN, max: AGE_MAX - 1 }}
            error={!!ageErrors.min_age}
            helperText={ageErrors.min_age || `Must be between ${AGE_MIN} and ${AGE_MAX - 1}`}
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
            inputProps={{ min: AGE_MIN + 1, max: AGE_MAX }}
            error={!!ageErrors.max_age}
            helperText={ageErrors.max_age || `Must be greater than minimum age, up to ${AGE_MAX} (retirement age)`}
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
          {/* <TextField
            fullWidth
            required
            label="Domicile (Name Districts/Units)"
            name="domicile"
            value={formData.domicile}
            onChange={handleChange}
          /> */}
          <TextField
            fullWidth
            required
            select
            label="Select Domicile"
            name="domicile"
            value={formData.domicile || ''}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                domicile: e.target.value
              }))
            }
          >
            <MenuItem value="">Select District</MenuItem>

            {districtOptions.map((district) => (
              <MenuItem key={district.id} value={district.id}>
                {district.name}
              </MenuItem>
            ))}
          </TextField>
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
            <MenuItem value="Male/Female">Male and Female</MenuItem>
          </TextField>
        </div>
      </div>

      <h6 className="section-title" style={{ marginTop: '30px', marginBottom: '20px', fontSize: '1.05rem', fontWeight: '600' }}>Quota Wise Post Distribution</h6>

      <div className="table-responsive" style={{ marginTop: '15px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', width: '100%' }}>
        <table className="table table-bordered" style={{ marginBottom: 0, width: '100%' }}>
          <thead style={{ backgroundColor: '#006622' }}>
            <tr>
              <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem' }}>District</th>
              {/* <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem' }}>Quota Type</th> */}
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
                    select
                    label="Select Districts"
                    size="small"
                    value={formData.district[index] || ''}
                    onChange={(e) =>
                      handleArrayChange(index, 'district', e.target.value)
                    }
                    error={!!rowErrors[index]?.district}
                    helperText={rowErrors[index]?.district || ' '}
                  >
                    <MenuItem value="">Select District</MenuItem>

                    {districtOptions.map((district) => (
                      <MenuItem key={district.id} value={district.id}>
                        {district.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </td>
                {/* <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <TextField
                    fullWidth
                    required
                    select
                    size="small"
                    value={formData.quota[index]}
                    onChange={(e) => handleArrayChange(index, 'quota', e.target.value)}
                    placeholder="Select Quota Type"
                  >
                    <MenuItem value="Open Merit">Open Merit</MenuItem>
                    <MenuItem value="Women">Others</MenuItem>
                    <MenuItem value="Minority">Minority</MenuItem>
                    <MenuItem value="Disabled Persons">Disabled Persons</MenuItem>
                  </TextField>
                </td> */}
                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    value={formData.post[index] ?? ''}
                    onChange={(e) => handleArrayChange(index, 'post', e.target.value)}
                    placeholder="Optional"
                    inputProps={{ min: 0 }}
                    error={!!rowErrors[index]?.post}
                    helperText={rowErrors[index]?.post || 'Decide later'}
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
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
          <small style={{ color: '#475569', fontWeight: '500', fontSize: '0.85rem' }}>
            Districts added: <strong>{formData.district.filter(Boolean).length}</strong> / {formData.district.length}
          </small>
        </div>
        {totalPostsEntered > 0 && (
          <div style={{ padding: '8px 12px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
            <small style={{ color: '#065f46', fontWeight: '500', fontSize: '0.85rem' }}>
              Posts entered so far: <strong>{totalPostsEntered}</strong> (per-district allocation can be finalised later)
            </small>
          </div>
        )}
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
            Preview
          </button>
        </div>
      </div>
    </form>
  );
};

export default Step3Eligibility;
