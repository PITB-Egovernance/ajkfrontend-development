import React, { useState, useEffect, useRef } from 'react';
import { TextField, MenuItem, InputAdornment } from '@mui/material';
import toast from 'react-hot-toast';

const Step1JobDetails = ({ data, onNext, onSaveDraft, tempId, isEdit = false, departmentOptions = [], gradeOptions = [] }) => {
  // Track the last data identity we've synced from. Only re-sync when the
  // identity actually changes (e.g. user navigates back with a new temp_id).
  // Without this guard, the data-sync useEffect would re-run on every
  // parent re-render and OVERWRITE the user's in-progress edits.
  const lastSyncedDataRef = useRef(null);

  const [formData, setFormData] = useState({
    department: data.department || '',
    designation: data.designation || '',
    scale: data.scale || '',
    // v2.2.0: live API (Usama's schema) uses a single `quota_percentage` field
    // (label: "Promotion Quota") for the promotion-quota split. The legacy
    // `direct_quota_percentage` and `district_quota_percentage` fields are no
    // longer collected here.
    quota_percentage: data.quota_percentage ?? '',
    num_posts: data.num_posts ?? '',
    vacancy_date: data.vacancy_date || '',
    // test_type is no longer collected in the UI (see getCleanedFormData
    // for the default value sent to the live API).
    quota_promotion: data.quota_promotion ?? '',
    service_rules: data.service_rules || null,
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

    // Live API expects quota_promotion as "<n>%" string. If the admin enters a
    // bare number, format it. If they already typed "20%", leave it as-is.
    const qp = cleanedFormData.quota_promotion;
    if (qp !== null && qp !== undefined && qp !== '' && !String(qp).includes('%')) {
      const n = Number(qp);
      if (!Number.isNaN(n)) cleanedFormData.quota_promotion = `${n}%`;
    }

    // Test Type is hidden in the UI but the live API marks it as required.
    // Send a default garbage value so the live backend's validator passes.
    // The admin-facing choice for test type happens later in the
    // advertisement creation flow (see AdvertisementCreateForm.jsx).
    cleanedFormData.test_type = cleanedFormData.test_type || 'MCQs Base';

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

  // Live validation for "Number of Posts": must be a whole number > 0 and < 1000.
  // Empty value shows the generic "required" state (no helper text).
  const numPostsError = (() => {
    if (formData.num_posts === '' || formData.num_posts === null || formData.num_posts === undefined) return '';
    const n = Number(formData.num_posts);
    if (!Number.isInteger(n))     return 'Number of Posts must be a whole number';
    if (n <= 0)                    return 'Number of Posts must be greater than 0';
    if (n >= 1000)                 return 'Number of Posts must be less than 1000';
    return '';
  })();

  // Gate the Next button on every required field in this step so the admin
  // can't advance with a half-filled form.
  const isStep1Valid =
    !!formData.department &&
    formData.num_posts !== '' && formData.num_posts !== null && formData.num_posts !== undefined && !numPostsError &&
    !!formData.scale &&
    !!String(formData.designation || '').trim() &&
    formData.quota_promotion !== '' && formData.quota_promotion !== null && formData.quota_promotion !== undefined &&
    formData.quota_percentage !== '' && formData.quota_percentage !== null && formData.quota_percentage !== undefined &&
    !!formData.vacancy_date &&
    hasServiceRules;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Block submit on Number of Posts validation
    if (formData.num_posts === '' || formData.num_posts === null || formData.num_posts === undefined) {
      toast.error('Number of Posts is required');
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
        {/* v2.2.0 — Field order per the user's spec:
            1. Department
            2. No of Posts
            3. Scale of the post
            4. Designation of post
            5. Direct Quota
            6. Promotion Qouta
            7. Approved Syllabus
            8. Service Rule
            9. Date of Occurrence of Vacancy */}

        {/* 1. Department */}
        <div className="col-md-6 form-group">
<TextField
             fullWidth
             required
             select
             label="Department"
             name="department"
             value={formData.department ?? ''}
             onChange={handleChange}
             helperText={departmentOptions.length === 0 ? 'No departments configured in Settings yet' : ' '}
           >
            <MenuItem value="">Select Department</MenuItem>
            {departmentOptions.map((d) => (
              // The MenuItem value is the department's NAME string (so
              // the wire format matches the live API curl example, which
              // sends `department=Punjab Education Department` rather than
              // a hash_id). The form state stores the name; on edit-mode
              // load the data-sync useEffect looks the name up in
              // `departmentOptions` and uses the matching id if needed.
              <MenuItem key={d.id ?? d.hash_id ?? d.name} value={d.name || d.id || ''}>
                {d.name || '(unnamed)'}
              </MenuItem>
            ))}
          </TextField>
        </div>

        {/* 2. No of Posts */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            type="number"
            label="Number of Posts"
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
          <TextField
            fullWidth
            required
            select
            label="Scale of the Post"
            name="scale"
            // Always coerce to a string — undefined / null would flip the
            // controlled Select into uncontrolled mode and trigger MUI's
            // "out-of-range value undefined" warning.
            value={formData.scale ?? ''}
            onChange={handleChange}
            helperText={gradeOptions.length === 0 ? 'No grades configured in Settings yet' : ' '}
          >
            <MenuItem value="">Select Scale</MenuItem>
            {gradeOptions.map((g) => (
              <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
            ))}
          </TextField>
        </div>

        {/* 4. Designation of post */}
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

        {/* 5. Direct Quota (live API: quota_promotion) */}
        {/* v2.2.0 — Live API (Usama's schema) `quota_promotion` field, sent as
            "<number>%" string. The frontend label was renamed from
            "District Qouta" to "Direct Quota" to better describe what
            this field actually represents: the share of the post(s)
            filled via direct recruitment (as opposed to promotion). */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            label="Direct Quota"
            name="quota_promotion"
            value={formData.quota_promotion ?? ''}
            onChange={handleChange}
            helperText="Enter a percentage (0-100)."
          />
        </div>

        {/* 6. Promotion Qouta (live API: quota_percentage) */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
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
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Approved Syllabus (PDF File Less than 2 MB)"
            value={data.syllabus && typeof data.syllabus === 'string' ? data.syllabus.split('/').pop() : ''}
            // Render the native file input inside the TextField's outlined
            // container so it picks up the same 56px height + label + border
            // style as the Department field above. We use a custom render
            // via InputProps so the file input is overlaid (clicking the
            // outlined region opens the file picker).
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
            // Show the actual file name below the field once selected
            helperText={
              (formData.syllabus && formData.syllabus instanceof File)
                ? `Selected: ${formData.syllabus.name}`
                : (data.syllabus && typeof data.syllabus === 'string'
                    ? `Previous file: ${data.syllabus.split('/').pop()}`
                    : 'No file chosen (optional)')
            }
            inputProps={{ readOnly: true }}
          />
        </div>

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

        {/* 9. Date of Occurrence of Vacancy */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            required
            type="date"
            label="Date of Occurrence of Vacancy"
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
        <div></div>
        <div className="flex gap-2">
          <button type="button" onClick={handleSaveDraftClick} className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200">
            Save Draft
          </button>
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
