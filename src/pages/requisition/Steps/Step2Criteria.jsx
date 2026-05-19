import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TextField, MenuItem, Box, Chip, Checkbox, ListItemText } from '@mui/material';
import { useLocalSettings, localSettingsApi } from 'hooks/useLocalSettings';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import toast from 'react-hot-toast';

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
    eligible_degrees:         '', // Stores comma-separated degree names
  });

  // Ref to prevent useEffect from overwriting user changes after initialization
  const isInitializedRef = useRef(false);

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [allDegrees, setAllDegrees] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(false);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  // Fetch all degrees to handle grouping
  useEffect(() => {
    const fetchAllDegrees = async () => {
      setLoadingDegrees(true);
      try {
        const response = await fetch(`${API_BASE}/settings/degrees?per_page=1000`, {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/json',
            'X-API-KEY': API_KEY,
          },
        });
        const result = await response.json();
        if (result.success || result.status === 200) {
          const degrees = Array.isArray(result.data?.data) ? result.data.data : result.data || [];
          setAllDegrees(degrees);
        }
      } catch (error) {
        console.error('Error fetching degrees:', error);
      } finally {
        setLoadingDegrees(false);
      }
    };
    fetchAllDegrees();
  }, [API_BASE, TOKEN, API_KEY]);

  // Group degrees by their group name
  const groupedDegrees = useMemo(() => {
    const grouped = {};
    allDegrees.forEach(d => {
      const groupName = d.degree_group || 'Other';
      if (!grouped[groupName]) grouped[groupName] = [];
      const code = d.degree_code || d.name || d.hash_id || d.id || '';
      grouped[groupName].push({
        id: d.hash_id || d.id,
        name: d.degree_name || d.name || '',
        code: String(code),
        group: groupName
      });
    });
    return grouped;
  }, [allDegrees]);

  // Helper to get selected degree names as array (trim whitespace for robust matching)
  const selectedDegreeList = useMemo(() => {
    return formData.eligible_degrees
      ? formData.eligible_degrees.split(',').map(d => d ? String(d).trim() : '').filter(d => d)
      : [];
  }, [formData.eligible_degrees]);

  // Handle group selection change from dropdown
  const handleGroupChange = (event) => {
    const newGroups = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
    
    // Find groups that were just added
    const addedGroups = newGroups.filter(g => !selectedGroups.includes(g));
    // Find groups that were just removed
    const removedGroups = selectedGroups.filter(g => !newGroups.includes(g));

    let updatedDegrees = [...selectedDegreeList];

    // If a group was added, add all its degrees by default
    addedGroups.forEach(groupName => {
      const groupDegrees = groupedDegrees[groupName] || [];
      groupDegrees.forEach(d => {
        if (!updatedDegrees.includes(d.name)) {
          updatedDegrees.push(d.name);
        }
      });
    });

    // If a group was removed, remove all its degrees
    removedGroups.forEach(groupName => {
      const groupDegreeNames = (groupedDegrees[groupName] || []).map(d => d.name);
      updatedDegrees = updatedDegrees.filter(name => !groupDegreeNames.includes(name));
    });

    setSelectedGroups(newGroups);
    setFormData(prev => ({ ...prev, eligible_degrees: updatedDegrees.join(',') }));
  };

  // Handle individual degree checkbox toggle
  const handleDegreeCheckboxToggle = (degreeName) => {
    if (!degreeName) return;
    const trimmedName = String(degreeName).trim();
    setFormData(prev => {
      const current = prev.eligible_degrees
        ? prev.eligible_degrees.split(',').map(d => d ? String(d).trim() : '').filter(d => d)
        : [];
      const index = current.indexOf(trimmedName);

      let updated;
      if (index > -1) {
        updated = current.filter(c => c !== trimmedName);
      } else {
        updated = [...current, trimmedName];
      }

      const newEligibleDegrees = updated.join(',');
      return { ...prev, eligible_degrees: newEligibleDegrees };
    });
  };

  // ── Tree-select helpers (Select All / per-group / per-degree) ────────────
  const allDegreeNames = useMemo(
    () => Object.values(groupedDegrees).flat().map((d) => d.name),
    [groupedDegrees]
  );

  const isGroupFullySelected = (groupName) => {
    const group = groupedDegrees[groupName] || [];
    return group.length > 0 && group.every((d) => selectedDegreeList.includes(d.name));
  };

  const isGroupPartiallySelected = (groupName) => {
    const group = groupedDegrees[groupName] || [];
    const some  = group.some((d) => selectedDegreeList.includes(d.name));
    return some && !isGroupFullySelected(groupName);
  };

  const allSelected     = allDegreeNames.length > 0 && allDegreeNames.every((n) => selectedDegreeList.includes(n));
  const someSelected    = selectedDegreeList.length > 0 && !allSelected;

  const handleToggleAll = () => {
    setFormData((prev) => ({
      ...prev,
      eligible_degrees: allSelected ? '' : allDegreeNames.join(','),
    }));
  };

  const handleToggleGroup = (groupName) => {
    const groupDegreeNames = (groupedDegrees[groupName] || []).map((d) => d.name);
    setFormData((prev) => {
      const current = prev.eligible_degrees
        ? prev.eligible_degrees.split(',').map((d) => d ? String(d).trim() : '').filter(Boolean)
        : [];
      const fullySelected = groupDegreeNames.every((n) => current.includes(n));
      const next = fullySelected
        ? current.filter((n) => !groupDegreeNames.includes(n))           // unselect all in group
        : Array.from(new Set([...current, ...groupDegreeNames]));        // select all in group
      return { ...prev, eligible_degrees: next.join(',') };
    });
  };

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
    if (data && Object.keys(data).length > 0 && !isInitializedRef.current) {
      isInitializedRef.current = true;

      // Decode degree_equivalence (stored as comma-separated degree names, e.g. "MSCS,MCS")
      const raw = data.degree_equivalence || '';
      const degreeNames = raw.split(',').map(d => d ? String(d).trim() : '').filter(d => d);

      setFormData({
        academic_qualification:   data.academic_qualification   || '',
        equivalent_qualification: data.equivalent_qualification || '',
        authority_certificate:    data.authority_certificate    || '',
        degree_equivalence:       degreeNames.length > 0 ? degreeNames.join(',') : (data.degree_equivalence || ''),
        any_other_qualification:  data.any_other_qualification  || '',
        training_institute:       data.training_institute       || '',
        experience_type:          data.experience_type          || '',
        experience_length:        data.experience_length        || 0,
        min_qualification:        data.min_qualification        || '',
        eligible_degrees:         degreeNames.length > 0 ? degreeNames.join(',') : (data.eligible_degrees || ''),
      });
      setShowAuthority(data.equivalent_qualification === 'Yes');
    }
  }, [data]);

  // Separate effect for selectedGroups — runs after allDegrees are available
  useEffect(() => {
    if (isInitializedRef.current && formData.eligible_degrees && allDegrees.length > 0 && selectedGroups.length === 0) {
      const names = formData.eligible_degrees.split(',').map(d => d ? String(d).trim() : '').filter(d => d);
      const groupsFound = new Set();
      names.forEach(name => {
        // Match by degree_name or degree_code
        const deg = allDegrees.find(d => (d.degree_name || d.name) === name || (d.degree_code || d.name) === name);
        if (deg?.degree_group) groupsFound.add(deg.degree_group);
      });
      const groups = Array.from(groupsFound);
      if (groups.length > 0) {
        setSelectedGroups(groups);
      }
    }
  }, [allDegrees, formData.eligible_degrees]);

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
      return;
    }

    setShowOther((prev) => ({ ...prev, [name]: false }));

    // Handle side effects outside of setFormData callback
    if (name === 'equivalent_qualification') {
      setShowAuthority(value === 'Yes');
    }
    if (name === 'academic_qualification') {
      setCustomDegree('');
    }

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: name === 'experience_length' ? parseInt(value) || 0 : value,
      };

      if (name === 'equivalent_qualification') {
        if (value !== 'Yes') {
          newData.authority_certificate = '';
          newData.degree_equivalence = '';
          newData.eligible_degrees = '';
        }
      }

      // Reset degree filter when qualification changes.
      if (name === 'academic_qualification') {
        newData.degree_equivalence = '';
        newData.eligible_degrees = '';
      }

      // Auto-select all degrees in group when group is selected in Equivalence dropdown
      if (name === 'degree_equivalence') {
        if (value !== OTHER && value !== '') {
          const groupDegrees = groupedDegrees[value] || [];
          newData.eligible_degrees = groupDegrees.map(d => d.name).join(',');
        } else {
          newData.eligible_degrees = '';
        }
      }

      return newData;
    });
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

  // ── Build submit payload ──────────────────────────────────────────────────
  //  degree_equivalence stores only the checked degree names (e.g. "MSCS,MCS")
  //  No group name is stored — only the checkbox selections.

  const buildSubmitData = () => {
    const submitData = { ...formData };
    if (selectedDegreeList.length > 0) {
      submitData.degree_equivalence = selectedDegreeList.join(',');
    }
    return submitData;
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

    onNext(buildSubmitData());
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

        {/* Degree of Equivalence — nested checkbox dropdown (matches sibling fields) */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            select
            label={
              formData.equivalent_qualification === 'Yes'
                ? 'Name Degree of Equivalence *'
                : 'Name Degree of Equivalence (Optional)'
            }
            value={selectedDegreeList}
            SelectProps={{
              multiple: true,
              onChange: () => { /* manual state via item onClick to keep menu open */ },
              renderValue: (selected) => {
                if (!selected || selected.length === 0) return '';
                if (selected.length <= 3) {
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                      {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                    </Box>
                  );
                }
                return `${selected.length} degrees selected`;
              },
              MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
            }}
          >
            {/* Master "Select All" */}
            <MenuItem dense onClick={(e) => { e.preventDefault(); handleToggleAll(); }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
              <Checkbox size="small" checked={allSelected} indeterminate={someSelected}
                sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }} />
              <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
            </MenuItem>

            {/* Groups with nested degree checkboxes */}
            {Object.keys(groupedDegrees).sort().flatMap((groupName) => [
              <MenuItem
                key={`grp-${groupName}`}
                dense
                onClick={(e) => { e.preventDefault(); handleToggleGroup(groupName); }}
                sx={{ bgcolor: '#f8fafc', '&:hover': { bgcolor: '#f1f5f9' } }}
              >
                <Checkbox
                  size="small"
                  checked={isGroupFullySelected(groupName)}
                  indeterminate={isGroupPartiallySelected(groupName)}
                  sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
                />
                <ListItemText primary={groupName} primaryTypographyProps={{ fontSize: 12.5, fontWeight: 600, color: '#064e3b' }} />
              </MenuItem>,
              ...groupedDegrees[groupName].map((d) => (
                <MenuItem
                  key={d.id ?? d.name}
                  dense
                  onClick={(e) => { e.preventDefault(); handleDegreeCheckboxToggle(d.name); }}
                  sx={{ pl: 5 }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedDegreeList.includes(d.name)}
                    sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                  />
                  <ListItemText primary={d.name} primaryTypographyProps={{ fontSize: 12 }} />
                </MenuItem>
              )),
            ])}

            {/* Other (custom) */}
            <MenuItem
              dense
              onClick={(e) => { e.preventDefault(); setShowOther((p) => ({ ...p, degree_equivalence: true })); }}
              sx={{ borderTop: '1px solid #e2e8f0', color: 'text.secondary', fontStyle: 'italic' }}
            >
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

          {Object.keys(groupedDegrees).length === 0 && !showOther.degree_equivalence && (
            <p className="text-xs text-slate-400 mt-1">
              No degrees found — select "Other" to enter one.
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
            onClick={() => onSaveDraft?.(buildSubmitData())}
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
