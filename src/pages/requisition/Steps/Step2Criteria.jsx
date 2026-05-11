import React, { useState, useEffect } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { useLocalSettings, localSettingsApi } from 'hooks/useLocalSettings';

// Sentinel value used to detect "Other" selection in every dropdown.
const OTHER = '__other__';

const Step2Criteria = ({ data = {}, onNext, onBack, onSaveDraft }) => {
  const { activeQualifications, activeDegrees } = useLocalSettings();

  const [formData, setFormData] = useState({
    academic_qualification:   '',
    equivalent_qualification: '',
    authority_certificate:    '',
    degree_equivalence:       '',
    any_other_qualification:  '',
    training_institute:       '',
    experience_type:          '',
    experience_length:        0,
    min_qualification:        '',
  });

  // "Other" custom text inputs — one per dropdown that supports it.
  const [customAcademic, setCustomAcademic] = useState('');
  const [customDegree,   setCustomDegree]   = useState('');
  const [customMinQual,  setCustomMinQual]  = useState('');

  // Tracks which dropdowns are in "Other" mode.
  const [showOther, setShowOther] = useState({
    academic_qualification: false,
    degree_equivalence:     false,
    min_qualification:      false,
  });

  const [showAuthority, setShowAuthority] = useState(false);

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFormData({
        academic_qualification:   data.academic_qualification   || '',
        equivalent_qualification: data.equivalent_qualification || '',
        authority_certificate:    data.authority_certificate    || '',
        degree_equivalence:       data.degree_equivalence       || '',
        any_other_qualification:  data.any_other_qualification  || '',
        training_institute:       data.training_institute       || '',
        experience_type:          data.experience_type          || '',
        experience_length:        data.experience_length        || 0,
        min_qualification:        data.min_qualification        || '',
      });
      setShowAuthority(data.equivalent_qualification === 'Yes');
    }
  }, [data]);

  // Degrees filtered to match the selected academic qualification.
  const filteredDegrees = activeDegrees.filter((d) => {
    if (!formData.academic_qualification) return true;
    const matchingQual = activeQualifications.find(
      (q) => q.name === formData.academic_qualification
    );
    return matchingQual ? d.qualification_id === matchingQual.id : true;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (value === OTHER) {
      setShowOther((prev) => ({ ...prev, [name]: true }));
      // Keep the field's stored value as the previous value until confirmed.
      return;
    }

    setShowOther((prev) => ({ ...prev, [name]: false }));
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'experience_length' ? parseInt(value) || 0 : value,
    }));

    if (name === 'equivalent_qualification') {
      setShowAuthority(value === 'Yes');
      if (value !== 'Yes') {
        setFormData((prev) => ({ ...prev, authority_certificate: '', degree_equivalence: '' }));
        setShowOther((prev) => ({ ...prev, degree_equivalence: false }));
      }
    }

    // Reset degree filter when qualification changes.
    if (name === 'academic_qualification') {
      setFormData((prev) => ({ ...prev, degree_equivalence: '' }));
      setShowOther((prev) => ({ ...prev, degree_equivalence: false }));
      setCustomDegree('');
    }
  };

  // Confirms a custom "Other" value: saves it to localStorage and sets the field.
  const confirmCustom = (fieldName, customValue, setCustom) => {
    const trimmed = customValue.trim();
    if (!trimmed) return;

    // Persist to settings so it appears in future sessions.
    if (fieldName === 'academic_qualification' || fieldName === 'min_qualification') {
      const alreadyExists = activeQualifications.some(
        (q) => q.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyExists) {
        localSettingsApi.add('qualifications', { name: trimmed, status: 'active' });
      }
    } else if (fieldName === 'degree_equivalence') {
      const alreadyExists = activeDegrees.some(
        (d) => d.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyExists) {
        // Link to selected qualification if available.
        const matchingQual = activeQualifications.find(
          (q) => q.name === formData.academic_qualification
        );
        localSettingsApi.add('degrees', {
          name:             trimmed,
          qualification_id: matchingQual?.id ?? '',
          status:           'active',
        });
      }
    }

    setFormData((prev) => ({ ...prev, [fieldName]: trimmed }));
    setShowOther((prev) => ({ ...prev, [fieldName]: false }));
    setCustom('');
  };

  // ── Validation + submit ────────────────────────────────────────────────────

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.academic_qualification) {
      alert('Academic Qualification is required');
      return;
    }
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

  // ── Reusable "Other" reveal block ─────────────────────────────────────────

  const OtherInput = ({ fieldName, value, setValue, placeholder = 'Enter custom value…' }) => (
    <div className="mt-2 flex gap-2 items-center animate-in fade-in duration-200">
      <TextField
        fullWidth
        size="small"
        label={`Custom ${fieldName === 'degree_equivalence' ? 'Degree' : 'Qualification'}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            confirmCustom(fieldName, value, setValue);
          }
        }}
        autoFocus
      />
      <button
        type="button"
        onClick={() => confirmCustom(fieldName, value, setValue)}
        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg whitespace-nowrap"
      >
        Add &amp; Set
      </button>
      <button
        type="button"
        onClick={() => setShowOther((prev) => ({ ...prev, [fieldName]: false }))}
        className="px-3 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
      >
        Cancel
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit}>

      <h6 className="section-title">Qualification Required</h6>

      <div className="row">

        {/* Academic Qualification */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth required select
            label="Academic Qualification"
            name="academic_qualification"
            value={showOther.academic_qualification ? OTHER : formData.academic_qualification}
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            {activeQualifications.map((q) => (
              <MenuItem key={q.id} value={q.name}>{q.name}</MenuItem>
            ))}
            <MenuItem value={OTHER} sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              Other (specify)
            </MenuItem>
          </TextField>
          {showOther.academic_qualification && (
            <OtherInput
              fieldName="academic_qualification"
              value={customAcademic}
              setValue={setCustomAcademic}
              placeholder="e.g. Diploma in Engineering"
            />
          )}
        </div>

        {/* Equivalent Qualification */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth select
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

        {/* Authority Certificate (conditional) */}
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

        {/* Degree of Equivalence */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth select
            label={
              formData.equivalent_qualification === 'Yes'
                ? 'Name Degree of Equivalence *'
                : 'Name Degree of Equivalence (Optional)'
            }
            name="degree_equivalence"
            value={showOther.degree_equivalence ? OTHER : formData.degree_equivalence}
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            {filteredDegrees.map((d) => (
              <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
            ))}
            <MenuItem value={OTHER} sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              Other (specify)
            </MenuItem>
          </TextField>
          {showOther.degree_equivalence && (
            <OtherInput
              fieldName="degree_equivalence"
              value={customDegree}
              setValue={setCustomDegree}
              placeholder="e.g. BS Environmental Science"
            />
          )}
          {formData.academic_qualification && filteredDegrees.length === 0 && !showOther.degree_equivalence && (
            <p className="text-xs text-slate-400 mt-1">
              No degrees linked to this qualification — select "Other" to enter one.
            </p>
          )}
        </div>

        {/* Any Other Qualification */}
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
            fullWidth type="number"
            label="Length of Experience (in years)"
            name="experience_length"
            value={formData.experience_length}
            onChange={handleChange}
            inputProps={{ min: 0 }}
          />
        </div>

        {/* Minimum Qualification */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth select
            label="Minimum Qualification"
            name="min_qualification"
            value={showOther.min_qualification ? OTHER : formData.min_qualification}
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            {activeQualifications.map((q) => (
              <MenuItem key={q.id} value={q.name}>{q.name}</MenuItem>
            ))}
            <MenuItem value={OTHER} sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              Other (specify)
            </MenuItem>
          </TextField>
          {showOther.min_qualification && (
            <OtherInput
              fieldName="min_qualification"
              value={customMinQual}
              setValue={setCustomMinQual}
              placeholder="e.g. Associate Degree"
            />
          )}
        </div>
      </div>

      <div className="navigation-buttons">
        <button
          type="button"
          className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200"
          onClick={onBack}
        >
          Previous
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSaveDraft?.(formData)}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200"
          >
            Save Draft
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Next
          </button>
        </div>
      </div>

    </form>
  );
};

export default Step2Criteria;
