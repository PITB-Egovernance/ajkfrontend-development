import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from 'components/ui/SearchableSelect';
import { TextField, InputAdornment } from '@mui/material';
import toast from 'react-hot-toast';

const OTHER_DESIGNATION = '__other__';
const OTHER_DESIGNATION_OPTION = { id: OTHER_DESIGNATION, name: 'Other (specify)' };

// Ascending, natural-order sort — handles both plain alphabetical names
// (departments, designations) and numbered scale names (e.g. "BPS-2" before
// "BPS-10", which a plain string sort would get wrong).
const byNameAscending = (a, b) =>
  (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' });

const Step1JobDetails = ({ data, onNext, onSaveDraft, tempId, isEdit = false, departmentOptions = [], gradeOptions = [], designationOptions = [] }) => {
  // Track the last data identity we've synced from. Only re-sync when the
  // identity actually changes (e.g. user navigates back with a new temp_id).
  // Without this guard, the data-sync useEffect would re-run on every
  // parent re-render and OVERWRITE the user's in-progress edits.
  const lastSyncedDataRef = useRef(null);

  const initialDesignation = data.designation || '';
  const isInitialOther = initialDesignation && designationOptions.length > 0
    && !designationOptions.some((d) => d.name === initialDesignation);

  const [isOtherDesignation, setIsOtherDesignation] = useState(false);
  const [customDesignation, setCustomDesignation] = useState(isInitialOther ? initialDesignation : '');

  const [formData, setFormData] = useState({
    department: data.department || '',
    designation: isInitialOther ? OTHER_DESIGNATION : initialDesignation,
    scale: data.scale || '',
    // v2.2.0: live API (Usama's schema) uses a single `quota_percentage` field
    // (label: "Promotion Quota") for the promotion-quota split. The legacy
    // `direct_quota_percentage` and `district_quota_percentage` fields are no
    // longer collected here.
    quota_percentage: data.quota_percentage ?? '',
    num_posts: data.num_posts ?? '',
    vacancy_date: data.vacancy_date || '',
    // test_type is not collected here — it's chosen later per-job in the
    // Advertisement create/edit flow (see AdvertisementCreateForm.jsx) and
    // saved on the advertisement_job_detail pivot, not on job_details.
    quota_promotion: data.quota_promotion ?? '',
    service_rules: data.service_rules || null,
    service_rules_text: data.service_rules_text || data.service_rule_text || '',
    syllabus: data.syllabus || null,
  });

  // Department and grade option lists are fetched once by the parent
  // (RequisitionForm) and passed down as props. Fetching them here as well
  // meant every step-navigation remount (key={`step1-${dataVersion}`})
  // re-issued /settings/departments and /settings/grades requests, which
  // could trip the live API's rate limiter and leave these dropdowns empty
  // ("No departments/grades configured") after a step round trip.

  // When the grades list finishes loading AFTER the form data was
  // already populated from the API, re-normalize `formData.scale` so
  // its value matches a real MenuItem hash_id. Without this, the
  // data-sync useEffect runs while `gradeOptions === []` and falls back to
  // the raw string (e.g. "BPS-17"), so the Select ends up in an
  // out-of-range state and MUI logs a warning.
   useEffect(() => {
     if (gradeOptions.length === 0) return;
     if (!formData.scale) return;
     const str = String(formData.scale).trim();
     const matched = gradeOptions.find(
       (g) => g.name === str || g.id === str
     );
     // Only update if matched; keep raw value otherwise to display it
     if (matched && matched.id !== formData.scale && matched.id !== str) {
       setFormData((prev) => ({ ...prev, scale: matched.id }));
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [gradeOptions]);

  useEffect(() => {
    if (designationOptions.length === 0) return;
    if (!formData.designation || formData.designation === OTHER_DESIGNATION) return;
    const str = String(formData.designation).trim();
    const matched = designationOptions.find((d) => d.name === str);
    if (matched) {
      setFormData((prev) => ({ ...prev, designation: matched.name }));
      setIsOtherDesignation(false);
    } else if (str) {
      setFormData((prev) => ({ ...prev, designation: OTHER_DESIGNATION }));
      setCustomDesignation(str);
      setIsOtherDesignation(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designationOptions]);

// Same fix for the Department field: if the data-sync useEffect
   // ran before `departmentOptions` was populated, `formData.department`
   // may still be the raw string instead of the canonical id. After
   // the department list loads, normalise to the matching id (or
   // leave the raw string if there's no match — the MenuItem
   // options are built from `departmentOptions` so a stale value will
   // produce the same MUI warning).
   useEffect(() => {
     if (departmentOptions.length === 0) return;
     if (!formData.department) return;
     const str = String(formData.department).trim();
     const matched = departmentOptions.find(
       (d) => d.id === str || d.name === str
     );
     // MenuItem values are department names, so we must set the name
     // if there's a match, otherwise leave the string as-is.
     if (matched && matched.name !== formData.department) {
       setFormData((prev) => ({ ...prev, department: matched.name }));
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [departmentOptions]);

  // Update form data when data prop changes (for edit mode)
  useEffect(() => {
    // Only re-sync when the loaded data's content actually changes. Without
    // this guard the effect would re-run on every parent re-render and
    // OVERWRITE the user's in-progress edits with the stale loaded data.
    const dataKey = data ? JSON.stringify(data) : '';
    if (lastSyncedDataRef.current === dataKey) return;
    if (data && Object.keys(data).length > 0) {
      lastSyncedDataRef.current = dataKey;
    }
    if (data && Object.keys(data).length > 0) {
      // Normalize scale: backend may return it as a number ("16"), a
      // string ("BPS-16"), a grade hash_id, or a nested object. Map it
      // back to the grade hash_id so the Select shows the right option.
      const rawScale = data.scale;
      let scaleValue = '';
      if (rawScale !== null && rawScale !== undefined) {
        if (typeof rawScale === 'object') {
          scaleValue = rawScale.hash_id || rawScale.id || rawScale.name || '';
        } else {
          const str = String(rawScale).trim();
          // Try to match a loaded grade by name (e.g. "BPS-16") or by
          // hash_id, otherwise fall back to the raw string so the form
          // can still display it.
          const matched = gradeOptions.find(
            (g) => g.name === str || g.id === str
          );
          scaleValue = matched ? matched.id : str;
        }
      }
      // Normalize department: the wire format sends the department's
      // NAME string (per the live API's curl example), so the
      // MenuItem value is the name. The loaded value may come back as
      // a name string, a hash_id, or a relation object — handle all.
      const rawDept = data.department;
      let departmentValue = '';
      if (rawDept !== null && rawDept !== undefined) {
        if (typeof rawDept === 'object') {
          departmentValue = rawDept.name || rawDept.department_name || rawDept.hash_id || rawDept.id || '';
        } else {
          const str = String(rawDept).trim();
          // If it looks like a hash_id, try matching by id; otherwise
          // use the string as-is (the live wire format sends the name).
          const matched = departmentOptions.find(
            (d) => d.id === str || d.name === str
          );
          departmentValue = matched ? matched.name : str;
        }
      }
      setFormData({
        department: departmentValue,
        designation: data.designation || '',
        scale: scaleValue,
        quota_percentage: data.quota_percentage ?? '',
        num_posts: data.num_posts ?? '',
        vacancy_date: data.vacancy_date || '',
        // test_type intentionally omitted from UI; see getCleanedFormData.
        quota_promotion: data.quota_promotion ?? '',
        service_rules: data.service_rules || null,
        service_rules_text: data.service_rules_text || data.service_rule_text || '',
        syllabus: data.syllabus || null,
      });
    }
  }, [data && JSON.stringify(data)]);

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
      
      setFormData(prev => ({
        ...prev,
        [name]: file  // This is a single File object, NEVER an array
      }));
    } else {
      // File input cleared
    }
  };

  const getCleanedFormData = () => {
    const cleanedFormData = { ...formData };

    if (cleanedFormData.designation === OTHER_DESIGNATION) {
      cleanedFormData.designation = customDesignation.trim();
    }

    if (Array.isArray(cleanedFormData.service_rules)) {
      cleanedFormData.service_rules = cleanedFormData.service_rules.length > 0 ? cleanedFormData.service_rules[0] : null;
    }

    if (Array.isArray(cleanedFormData.syllabus)) {
      cleanedFormData.syllabus = cleanedFormData.syllabus.length > 0 ? cleanedFormData.syllabus[0] : null;
    }

    // Live API expects quota_promotion as "<n>%" string. If the admin enters a
    // bare number, format it. If they already typed "20%", leave it as-is.
    const qp = cleanedFormData.quota_promotion;
    if (qp !== null && qp !== undefined && qp !== '' && !String(qp).includes('%')) {
      const n = Number(qp);
      if (!Number.isNaN(n)) cleanedFormData.quota_promotion = `${n}%`;
    }

    // Do NOT default test_type here — it must stay null/absent until the
    // admin picks a real TestType later in the Advertisement flow. A
    // placeholder value here used to get saved verbatim to job_details.test_type
    // (no backend validation catches it), which then permanently broke test-type
    // lookups for that job on the Advertisement and Roll Number pages, since
    // nothing could ever match a fake value against the real TestType table.
    cleanedFormData.service_rules_text = formData.service_rules_text || '';

    return cleanedFormData;
  };

  // If this is an existing draft (tempId set, so Step 1 has been saved at
  // least once) and the previously uploaded service_rules file path can no
  // longer be resolved from the loaded data — e.g. the backend returned an
  // empty placeholder after a later re-save — require the admin to
  // re-upload the file rather than silently continuing without one.
  // Approved Syllabus is optional, so it gets no such check.
  const serviceRulesMissing = !!tempId
    && !(formData.service_rules instanceof File)
    && !(data.service_rules && typeof data.service_rules === 'string');

  const hasServiceRules = (formData.service_rules instanceof File)
    || (typeof data.service_rules === 'string' && data.service_rules.trim() !== '');

  // Live validation for "No. of Posts Requisitioned": must be a whole number > 0 and < 1000.
  // Empty value shows the generic "required" state (no helper text).
  const numPostsError = (() => {
    if (formData.num_posts === '' || formData.num_posts === null || formData.num_posts === undefined) return '';
    const n = Number(formData.num_posts);
    if (!Number.isInteger(n))     return 'No. of Posts Requisitioned must be a whole number';
    if (n <= 0)                    return 'No. of Posts Requisitioned must be greater than 0';
    if (n >= 1000)                 return 'No. of Posts Requisitioned must be less than 1000';
    return '';
  })();

  // Ascending, searchable dropdown option lists (Autocomplete gives free-text
  // filtering out of the box).
  const sortedDepartmentOptions = useMemo(
    () => [...departmentOptions].sort(byNameAscending),
    [departmentOptions]
  );
  const sortedGradeOptions = useMemo(
    () => [...gradeOptions].sort(byNameAscending),
    [gradeOptions]
  );
  const sortedDesignationOptions = useMemo(
    () => [...designationOptions].sort(byNameAscending),
    [designationOptions]
  );
  // Designation list plus the "Other (specify)" sentinel, and — if the
  // loaded value isn't in the configured list — the stale value itself, so
  // the Autocomplete always has a matching option to display.
  const designationSelectOptions = useMemo(() => {
    const options = [...sortedDesignationOptions];
    if (!isOtherDesignation && formData.designation
        && !options.some((d) => d.name === formData.designation)) {
      options.push({ id: formData.designation, name: formData.designation });
      options.sort(byNameAscending);
    }
    return [...options, OTHER_DESIGNATION_OPTION];
  }, [sortedDesignationOptions, formData.designation, isOtherDesignation]);

  // Gate the Next button on every required field in this step so the admin
  // can't advance with a half-filled form.
  const navigate = useNavigate();

  const isStep1Valid =
    !!formData.department &&
    formData.num_posts !== '' && formData.num_posts !== null && formData.num_posts !== undefined && !numPostsError &&
    !!formData.scale &&
    !!(!isOtherDesignation ? String(formData.designation || '').trim() : customDesignation.trim()) &&
    hasServiceRules &&
    !!formData.service_rules_text?.trim();

  const handleSubmit = (e) => {
    e.preventDefault();

    // Block submit on No. of Posts Requisitioned validation
    if (formData.num_posts === '' || formData.num_posts === null || formData.num_posts === undefined) {
      toast.error('No. of Posts Requisitioned is required');
      return;
    }
    if (numPostsError) {
      toast.error(numPostsError);
      return;
    }

    if (serviceRulesMissing) {
      toast.error('Service Rule file could not be found — please re-upload it to continue.');
      return;
    }

    if (!formData.service_rules_text?.trim()) {
      toast.error('Service Rule (Text) is required');
      return;
    }

    const cleanedFormData = getCleanedFormData();

    onNext(cleanedFormData);
  };

  const handleSaveDraftClick = () => {
    const cleanedFormData = getCleanedFormData();
    onSaveDraft?.(cleanedFormData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row">
        {/* v2.2.0 — Field order per the user's spec:
            1. Department
            2. No of Posts
            3. Scale of the post
            4. Designation of post
            5. Direct Quota
            6. Promotion Qouta
            7. Approved Syllabus
            8. Service Rule
            9. Date of Availability of Vacancy */}

        {/* 1. Department */}
        <div className="col-md-6 form-group">
          <SearchableSelect
            required
            label="Department"
            value={formData.department || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
            options={sortedDepartmentOptions.map((d) => ({ value: d.name, label: d.name }))}
            placeholder="— Select Department —"
            hint={departmentOptions.length === 0 ? 'No departments configured in Settings yet' : ''}
          />
        </div>

        {/* 2. No of Posts */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            type="number"
            label="No. of Posts Requisitioned"
            name="num_posts"
            value={formData.num_posts}
            onChange={handleChange}
            inputProps={{ min: 1, max: 999, step: 1 }}
            error={!!numPostsError}
            helperText={numPostsError || 'Enter a value greater than 0 and less than 1000'}
          />
        </div>

        {/* 3. Scale of the Post — sourced dynamically from /settings/grades */}
        <div className="col-md-6 form-group">
          <SearchableSelect
            required
            label="Scale of the Post"
            value={formData.scale || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, scale: e.target.value }))}
            options={sortedGradeOptions.map((g) => ({ value: g.id, label: g.name }))}
            placeholder="— Select Grade —"
            hint={gradeOptions.length === 0 ? 'No grades configured in Settings yet' : ''}
          />
        </div>

        {/* 4. Designation of post — sourced dynamically from /settings/designations */}
        <div className="col-md-6 form-group">
          <SearchableSelect
            required
            label="Designation or Nomenclature of the Post(s)"
            value={isOtherDesignation ? OTHER_DESIGNATION : (formData.designation ? (designationSelectOptions.find((d) => d.name === formData.designation)?.id || '') : '')}
            onChange={(e) => {
              const val = e.target.value;
              if (!val || val === OTHER_DESIGNATION) {
                setIsOtherDesignation(!!val);
                if (!val) {
                  setCustomDesignation('');
                  setFormData((prev) => ({ ...prev, designation: '' }));
                }
              } else {
                setIsOtherDesignation(false);
                setCustomDesignation('');
                const opt = designationSelectOptions.find((d) => d.id === val);
                setFormData((prev) => ({ ...prev, designation: opt?.name || '' }));
              }
            }}
            options={designationSelectOptions.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="— Select Designation —"
            hint={designationOptions.length === 0 ? 'No designations configured in Settings yet' : ''}
          />
          {isOtherDesignation && (
            <div className="mt-2 flex gap-2 items-center animate-in fade-in duration-200">
              <TextField
                fullWidth
                size="small"
                label="Custom Designation"
                value={customDesignation}
                onChange={(e) => setCustomDesignation(e.target.value)}
                placeholder="e.g. Assistant Director"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = customDesignation.trim();
                    if (trimmed) {
                      setFormData((prev) => ({ ...prev, designation: trimmed }));
                      setIsOtherDesignation(false);
                      setCustomDesignation('');
                    }
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = customDesignation.trim();
                  if (trimmed) {
                    setFormData((prev) => ({ ...prev, designation: trimmed }));
                    setIsOtherDesignation(false);
                    setCustomDesignation('');
                  }
                }}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg whitespace-nowrap"
              >
                Add &amp; Set
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOtherDesignation(false);
                  setCustomDesignation('');
                }}
                className="px-3 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* 5. Direct Quota (live API: quota_promotion) */}
        {/* v2.2.0 — Live API (Usama's schema) `quota_promotion` field, sent as
            "<number>%" string. The frontend label was renamed from
            "District Qouta" to "Direct Quota" to better describe what
            this field actually represents: the share of the post(s)
            filled via direct recruitment (as opposed to promotion). */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Direct Quota"
            name="quota_promotion"
            value={formData.quota_promotion ?? ''}
            onChange={handleChange}
            type="number"
            inputProps={{ min: 0, max: 100, step: 1 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>
            }}
            helperText="Enter a percentage (0-100)."
          />
        </div>

        {/* 6. Promotion Qouta (live API: quota_percentage) */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Promotion Qouta"
            name="quota_percentage"
            value={formData.quota_percentage ?? ''}
            onChange={handleChange}
            type="number"
            inputProps={{ min: 0, max: 100, step: 1 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>
            }}
            helperText="Percentage reserved for promotion quota"
          />
        </div>

        {/* 7. Approved Syllabus (optional) */}
        {/*<div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Approved Syllabus (PDF File Less than 2 MB)"
            value={data.syllabus && typeof data.syllabus === 'string' ? data.syllabus.split('/').pop() : ''}
            
            InputProps={{
              readOnly: true,
              startAdornment: (
                <InputAdornment position="start">
                  <input
                    type="file"
                    name="syllabus"
                    accept=".pdf"
                    onChange={handleFileChange}
                    multiple={false}
                    style={{ display: 'none' }}
                    id="syllabus-input"
                  />
                  <label
                    htmlFor="syllabus-input"
                    className="px-3 py-1 bg-emerald-700 text-white text-sm font-medium rounded cursor-pointer hover:bg-emerald-800 whitespace-nowrap"
                  >
                    Choose File
                  </label>
                </InputAdornment>
              ),
            }}
            
            helperText={
              (formData.syllabus && formData.syllabus instanceof File)
                ? `Selected: ${formData.syllabus.name}`
                : (data.syllabus && typeof data.syllabus === 'string'
                    ? `Previous file: ${data.syllabus.split('/').pop()}`
                    : 'No file chosen (optional)')
            }
            inputProps={{ readOnly: true }}
          />
        </div>*/}

        {/* 8. Service Rule */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            label="Service Rule (PDF File Less than 2 MB)"
            value={data.service_rules && typeof data.service_rules === 'string' ? data.service_rules.split('/').pop() : ''}
            InputProps={{
              readOnly: true,
              startAdornment: (
                <InputAdornment position="start">
                  <input
                    type="file"
                    name="service_rules"
                    accept=".pdf"
                    onChange={handleFileChange}
                    multiple={false}
                    style={{ display: 'none' }}
                    id="service_rules-input"
                  />
                  <label
                    htmlFor="service_rules-input"
                    className="px-3 py-1 bg-emerald-700 text-white text-sm font-medium rounded cursor-pointer hover:bg-emerald-800 whitespace-nowrap"
                  >
                    Choose File
                  </label>
                </InputAdornment>
              ),
            }}
            helperText={
              (formData.service_rules && formData.service_rules instanceof File)
                ? `Selected: ${formData.service_rules.name}`
                : (data.service_rules && typeof data.service_rules === 'string'
                    ? `Previous file: ${data.service_rules.split('/').pop()}`
                    : (serviceRulesMissing ? 'Previous file not found — please re-upload (required)' : 'No file chosen'))
            }
            error={serviceRulesMissing}
            inputProps={{ readOnly: true }}
          />
        </div>

        {/* 9. Service Rule Text Area */}
        <div className="col-md-12 form-group">
          <TextField
            fullWidth
            multiline
            required
            label="Service Rule (Text)"
            name="service_rules_text"
            value={formData.service_rules_text}
            onChange={handleChange}
            minRows={4}
            variant="outlined"
            error={!formData.service_rules_text?.trim()}
            helperText={
              !formData.service_rules_text?.trim()
                ? 'Service Rule (Text) is required'
                : 'Enter service rule details here'
            }
            sx={{
    '& .MuiInputBase-root': {
      fontSize: '1rem',
      lineHeight: '1.5',
    },
    '& .MuiInputBase-multiline': {
      minHeight: '80px',
      padding: '8px 8px',
      fontSize: '1rem',
      lineHeight: '1.5',
    },
    '& .MuiInputBase-inputMultiline': {
      fontSize: '1rem !important',
      lineHeight: '1.5 !important',
    }
  }}
          />
          {/* Footnote */}
          <div className="footnote-container" style={{ marginTop: '12px', marginBottom: '8px' }}>
            <span className="footnote-label">Note:</span>
            <p className="footnote-text">
              The service rules/qualification, and other eligibility criteria for the requisitioned posts shall be incorporated strictly in accordance with the relevant govt. notification.
            </p>
          </div>
        </div>

        {/* 10. Date of Availability of Vacancy */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            type="date"
            label="Date of Availability of Vacancy"
            name="vacancy_date"
            value={formData.vacancy_date}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            helperText="Pick the date from the calendar"
          />
        </div>

        {/* Test Type is removed from the visible UI but the live API still
            expects the field, so we hardcode a default value and send it in
            `getCleanedFormData()` below. Do not render a TextField here. */}
      </div>



      <div className="navigation-buttons">
        <div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/requisitions')}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
        <div className="flex gap-2">
          {!isEdit && (
            <button type="button" onClick={handleSaveDraftClick} className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200">
              Save Draft
            </button>
          )}
          <button
            type="submit"
            disabled={!isStep1Valid}
            title={!isStep1Valid ? 'Fill in all required fields to continue' : undefined}
            className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-950 disabled:hover:to-emerald-950"
          >
            Next
          </button>
        </div>
      </div>
    </form>
  );
};

export default Step1JobDetails;
