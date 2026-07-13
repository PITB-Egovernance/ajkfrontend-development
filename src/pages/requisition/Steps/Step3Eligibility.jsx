import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import SearchableSelect from 'components/ui/SearchableSelect';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

// Project green theme: emerald-700 (#047857). Used for the
// Selection-Mode radio buttons so the checked dot and ring match the
// rest of the project (sidebar, primary buttons, action chips, etc.).
const EMERALD_700 = '#047857';

// Hardcoded fallback used until the live admin server has /settings/nationalities populated.
const FALLBACK_NATIONALITIES = ['Pakistani/AJK'];

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

const Step3Eligibility = ({ data, step1Data = {}, tempId, onNext, onBack, onSaveDraft, districtOptions = [], isEdit = false }) => {
  // Track the last data identity we've synced from. Only re-sync when the
  // identity actually changes (e.g. user navigates back to Step 3 with a
  // different temp_id). Without this guard, the useEffect would re-run
  // whenever the parent re-renders with a new data reference (e.g. after
  // a form state update), OVERWRITING the user's in-progress edits.
  const lastSyncedDataRef = useRef(null);

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
    // selection_mode toggles whether the quota distribution table is required.
    // 'open_merit'  → use Step 1 num_posts as-is, hide the table.
    // 'quota_based' → fill District Quota + Promotional Quota per district.
    selection_mode: data.selection_mode || 'quota_based',
    district: data.district || [''],
    quota: data.quota || [''],
    post: data.post || [''],                              // District Quota posts
    promotional_post: data.promotional_post || [''],      // Promotional Quota posts (per-district, paired)
  });

  const [showRelaxation, setShowRelaxation] = useState(data.age_relaxation === 'Yes');
  const [isOtherRelaxation, setIsOtherRelaxation] = useState(
    !!data.relaxation_reason && data.relaxation_reason !== 'Government Employee'
  );
  const [customRelaxation, setCustomRelaxation] = useState(
    data.relaxation_reason && data.relaxation_reason !== 'Government Employee' && data.relaxation_reason !== 'Other'
      ? data.relaxation_reason : ''
  );
  const [ageErrors,      setAgeErrors]      = useState({});
  const [nationalities,  setNationalities]  = useState(FALLBACK_NATIONALITIES);

  // When the user toggles between "Open Merit" and "Quota Based" in
  // Step 3, the per-district table only makes sense in Quota Based mode.
  // If they switch to Quota Based while the district array is empty
  // (e.g. they had previously saved with Open Merit and are now coming
  // back to switch to Quota Based), seed the array with a single empty
  // row so the table renders one editable row instead of zero rows.
  //
  // CRITICAL: Skip the first run so loaded data is not wiped on mount.
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (formData.selection_mode === 'quota_based') {
      setFormData((prev) => ({
        ...prev,
        district:         [''],
        quota:            [''],
        post:             [''],
        promotional_post: [''],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.selection_mode]);

  // ── Local persistence: cache form state in localStorage so the per-row
  // inputs (especially the Promotional Quota Posts column) survive any
  // navigation or "Back to Edit" round-trip. The cache is keyed by temp_id
  // so different requisitions don't bleed into each other.
  useEffect(() => {
    if (!tempId) return;
    try {
      const cached = localStorage.getItem(`step3_draft_${tempId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only restore the per-row arrays (district, post, promotional_post)
        // and the per-field values that the backend's preview endpoint
        // doesn't return reliably. Other fields (min_age, max_age, etc.) are
        // reloaded from the backend on remount.
        setFormData((prev) => ({
          ...prev,
          district:         Array.isArray(parsed.district)         ? parsed.district         : prev.district,
          post:             Array.isArray(parsed.post)             ? parsed.post             : prev.post,
          promotional_post: Array.isArray(parsed.promotional_post) ? parsed.promotional_post : prev.promotional_post,
          quota:            Array.isArray(parsed.quota)            ? parsed.quota            : prev.quota,
        }));
      }
    } catch (e) { /* ignore corrupt cache */ }
  }, [tempId]);

  // Persist form state on every change so the cached version is always
  // up-to-date with the user's edits.
  useEffect(() => {
    if (!tempId) return;
    try {
      localStorage.setItem(`step3_draft_${tempId}`, JSON.stringify({
        district:         formData.district,
        post:             formData.post,
        promotional_post: formData.promotional_post,
        quota:            formData.quota,
      }));
    } catch (e) { /* quota exceeded, ignore */ }
  }, [tempId, formData.district, formData.post, formData.promotional_post, formData.quota]);

  // Clear the cache when the requisition is confirmed (live API confirmed=true
  // indicates a successful save). RequisitionForm passes this via the
  // `confirmed` prop when the user clicks "Confirm & Save" on the preview.
  useEffect(() => {
    if (!tempId) return;
    const handleBeforeUnload = () => {
      // Don't clear on page refresh — keep the cache so the user doesn't
      // lose their work if they accidentally hit F5.
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tempId]);

  // Pull live nationality list from Settings. Fall back to hardcoded list on error
  // so a partial deploy (frontend updated before backend) does not break the wizard.
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`${Config.apiUrl}/settings/nationalities`, {
          headers: {
            Authorization: `Bearer ${AuthService.getToken()}`,
            Accept:        'application/json',
            'X-API-KEY':   Config.apiKey,
          },
        });
        const result = await res.json();
        if (aborted) return;
        if (res.ok && (result.success || result.status === 200)) {
          const list = result.data?.data ?? result.data ?? [];
          // The /settings/nationalities endpoint returns rows with
          // either `nationality_name` (canonical, used by the
          // Settings page) or `name` (legacy alias). The previous
          // code only read `n.name`, so any rows that used
          // `nationality_name` came back as `undefined` and the
          // dropdown rendered empty. Handle both, canonical first.
          const names = list
            .filter((n) => (n.status ?? 'active') === 'active')
            .map((n) => n.nationality_name || n.name)
            .filter(Boolean);
          if (names.length) setNationalities(names);
        }
      } catch { /* keep fallback */ }
    })();
    return () => { aborted = true; };
  }, []);

  // Update form data when data prop changes (for edit mode)
  useEffect(() => {
    // Only re-sync when the loaded data's content actually changes. Without
    // this guard the effect would re-run on every parent re-render and
    // OVERWRITE the user's in-progress edits (e.g. typing a number in the
    // promotional_post column) with the stale loaded data.
    const dataKey = data ? JSON.stringify(data) : '';
    if (lastSyncedDataRef.current === dataKey) return;

    // The backend stores district/domicile as NAMES (e.g. "Muzaffarabad")
    // but the Select's MenuItem value is the district hash_id, so they need
    // to be mapped via districtOptions before they can be applied to
    // formData. If districtOptions hasn't loaded yet, bail out WITHOUT
    // marking this data as synced — once districtOptions arrives (it's a
    // dependency below), this effect re-runs and completes the mapping.
    // Otherwise the mapping resolves to '' (no match), gets marked as
    // "synced", and never retries — leaving the District selects empty.
    const hasDistrictData = Boolean(data?.district) || Boolean(data?.domicile);
    if (hasDistrictData && districtOptions.length === 0) return;

    if (data && Object.keys(data).length > 0) {
      lastSyncedDataRef.current = dataKey;
    }

    // Districts and post counts are stored as comma-separated strings in the
    // backend (per the user's spec). Convert them back to arrays for the form.
    const splitCsv = (v) => {
      if (Array.isArray(v)) return v.map(String);
      if (v === null || v === undefined || v === '') return [''];
      return String(v).split(',').map((s) => s.trim());
    };

    // Resolve a stored district value (could be a hash_id already, a district
    // name, or a name with different casing/whitespace) to the hash_id used
    // by the Select's MenuItems. Falls back to the raw value so the
    // table/Select fallback MenuItem can still render it as selected.
    const resolveDistrictValue = (raw) => {
      if (!raw) return '';
      const trimmed = String(raw).trim();
      const byId = districtOptions.find((opt) => String(opt.id) === trimmed);
      if (byId) return byId.id;
      const byName = districtOptions.find(
        (opt) => String(opt.name).trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (byName) return byName.id;
      return trimmed;
    };

    const normalizedDistricts = splitCsv(data.district).map((d) => resolveDistrictValue(d));

    const normalizedDomicile = (() => {
      const raw = typeof data.domicile === 'object'
        ? data.domicile.id || data.domicile.hash_id || data.domicile.name || ''
        : data.domicile || '';
      return resolveDistrictValue(raw);
    })();

    if (data && Object.keys(data).length > 0) {
      const rawMode = data.selection_mode || data.merit_type || 'quota_based';
      // The live API stores the mode under `merit_type` as "quota_wise"
      // (see handleSubmit below), but the radio buttons use "quota_based".
      // Normalize so the correct radio stays checked after a "Back to
      // Edit" round trip.
      const loadedMode = rawMode === 'quota_wise' ? 'quota_based' : rawMode;
      // The live API returns an empty array (not a non-empty placeholder)
      // for users who picked Open Merit, so we explicitly seed one empty
      // district row whenever the user lands in Quota Based mode with an
      // empty array. Without this, the table renders zero rows and the
      // user is left staring at a blank "Quota Wise Post Distribution"
      // section with no way to add districts.
      const seedDistricts = loadedMode === 'quota_based' && normalizedDistricts.length === 0;
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
        selection_mode: loadedMode,
        district: seedDistricts ? [''] : normalizedDistricts,
        quota:    seedDistricts ? [''] : splitCsv(data.quota),
        post:     seedDistricts ? [''] : splitCsv(data.post),
        promotional_post: seedDistricts ? [''] : splitCsv(data.promotional_post || data.promotional_quota_post),
      });
      setShowRelaxation(data.age_relaxation === 'Yes');
    }
    // Use a string fingerprint of `data` as the dependency so this effect
    // only re-runs when the loaded data's content actually changes — not
    // on every parent re-render (which would otherwise overwrite the user's
    // in-progress edits in the per-row number inputs).
  }, [data && JSON.stringify(data), districtOptions]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    if (name === 'min_age' || name === 'max_age') {
      value = value.replace(/[^0-9]/g, '').slice(0, 2);
    }

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

  // Step 1's total — comes through the dedicated step1Data prop from
  // RequisitionForm (formData.step1.num_posts). Used as the upper bound on
  // per-district posts.
  const stepOneTotal = Number(step1Data?.num_posts) || Number(data?.num_posts) || 0;

  // How many rows have a post value entered? (Empty / null / undefined don't count.)
  const isPostFilled = (v) => v !== '' && v !== null && v !== undefined;
  const postsFilledCount = (formData.post || []).filter(isPostFilled).length;
  const someButNotAllPostsFilled =
    postsFilledCount > 0 && postsFilledCount < (formData.district?.length ?? 0);

  // Combined District Quota + Promotional Quota total — both columns count toward
  // Step 1's num_posts ceiling.
  const totalPostsEntered = (formData.post || [])
    .reduce((sum, p, i) => sum + (Number(p) || 0) + (Number(formData.promotional_post?.[i]) || 0), 0);

  const exceedsStepOneTotal =
    formData.selection_mode === 'quota_based' &&
    stepOneTotal > 0 &&
    totalPostsEntered > stepOneTotal;

  // ── Real-time row-level validation ──
  // - district required + unique across rows
  // - district_post + promotional_post (per row): if any row has a value, ALL
  //   rows must; non-negative int; running sum across both columns cannot
  //   exceed Step 1's num_posts
  const rowErrors = (() => {
    const districts = formData.district || [];
    const posts     = formData.post || [];
    const promo     = formData.promotional_post || [];
    const seen      = new Map();
    let runningSum  = 0;

    return districts.map((districtId, i) => {
      const errors = {};

      if (districtId && seen.has(districtId)) {
        errors.district = 'This district is already added in another row';
      } else if (districtId) {
        seen.set(districtId, i);
      }

      const validateCell = (raw, key) => {
        if (isPostFilled(raw)) {
          const n = Number(raw);
          if (!Number.isInteger(n) || n < 0) {
            errors[key] = 'Whole number 0 or more';
          } else {
            runningSum += n;
            if (stepOneTotal > 0 && runningSum > stepOneTotal) {
              errors[key] = `Total exceeds Step 1's ${stepOneTotal} posts`;
            }
          }
        } else if (key === 'post' && someButNotAllPostsFilled) {
          errors.post = 'Fill District Quota for every district, or leave them all empty';
        }
      };

      validateCell(posts[i], 'post');
      validateCell(promo[i], 'promotional_post');

      return errors;
    });
  })();

  // Disable the Preview/Update button while any validation error is showing
  // on this page (age limits, or — for Quota Based — duplicate districts /
  // bad post counts / totals exceeding Step 1's post count).
  const hasRowErrors =
    formData.selection_mode === 'quota_based' &&
    rowErrors.some((re) => Object.keys(re).length > 0);
  const hasValidationErrors = Object.keys(ageErrors).length > 0 || hasRowErrors;

  // Also gate on the required fields for this step. In Quota Based mode at
  // least one district row must be selected.
  const hasRequiredFields =
    formData.min_age !== '' && formData.min_age !== null && formData.min_age !== undefined &&
    formData.max_age !== '' && formData.max_age !== null && formData.max_age !== undefined &&
    !!formData.age_relaxation &&
    !!formData.nationality &&
    (formData.selection_mode !== 'quota_based' || (formData.district || []).some(Boolean));

  const isStep3Valid = hasRequiredFields && !hasValidationErrors;

  const addRow = () => {
    setFormData(prev => ({
      ...prev,
      district: [...prev.district, ''],
      quota: [...prev.quota, ''],
      post: [...prev.post, ''],
      promotional_post: [...(prev.promotional_post || []), '']
    }));
  };

  const removeRow = (index) => {
    if (formData.district.length > 1) {
      setFormData(prev => ({
        ...prev,
        district: prev.district.filter((_, i) => i !== index),
        quota: prev.quota.filter((_, i) => i !== index),
        post: prev.post.filter((_, i) => i !== index),
        promotional_post: (prev.promotional_post || []).filter((_, i) => i !== index)
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

    // Convert district hash_ids → district NAMES (the live API's
    // `district` field expects names like "Lahore", not hash_ids).
    const districtIds = Array.isArray(formData.district) ? formData.district : [];
    const districtNames = districtIds.map((idOrName) => {
      if (!idOrName) return '';
      const match = districtOptions.find((d) => (d.hash_id || d.id) === idOrName);
      return match ? match.name : idOrName;
    }).filter(Boolean);

    // Live API field aliases (Usama's v2.2.0 schema) — wire format confirmed
    // from the live API curl reference:
    //   - selection_mode → merit_type ("open_merit" | "quota_wise")
    //   - quota array defaults to one "Open Merit" entry per district row
    //     so the live API's array-length validation (quota.length must equal
    //     district.length) passes even though the Step 3 table doesn't
    //     expose a per-row quota selector.
    //
    // NOTE: The live API's Step 3 curl does NOT include `quota_promotion` at
    // all — that field is a Step 1 string field (the District Qouta
    // percentage like "20%"). Sending it as a per-district array from Step 3
    // triggers "The quota promotion field must be a string" validation. We
    // do NOT forward `quota_promotion` from Step 3.
    const meritType = formData.selection_mode === 'open_merit' ? 'open_merit' : 'quota_wise';

    // Open Merit ignores the per-district table — send empty arrays so the
    // backend doesn't try to persist quota rows that don't apply. The
    if (formData.selection_mode === 'open_merit') {
      const allDistrictNames = districtOptions.map((d) => d.name);
      onNext({
        min_age:             formData.min_age,
        max_age:             formData.max_age,
        age_relaxation:      formData.age_relaxation,
        relaxation_reason:   formData.relaxation_reason,
        relaxation_years:    formData.relaxation_years,
        nationality:         formData.nationality,
        domicile:            'AJK',
        gender_basis:        formData.gender_basis || 'Male/Female',
        merit_type:          meritType,
        district:            allDistrictNames,
        quota:               allDistrictNames.map(() => 'Open Merit'),
        post:                [],
        district_quota_post:     [],
        promotional_quota_post:  [],
        other_conditions:   formData.other_conditions || 'N/A',
      });
      return;
    }

    // Quota Based: build the live API's per-row arrays. The frontend collects
    // a `district` + `post` (+ optional `promotional_post`) per row but does
    // not surface a quota-type dropdown. The live API's Step 3 curl shows
    // `quota: ["Open Merit", "Women", "Minority"]` so we default each row's
    // quota to "Open Merit" to match the live array-length contract.
    const perRowQuota = districtNames.map(() => 'Open Merit');

    // Quota Based: block on row-level errors (duplicate districts, bad post numbers)
    const firstRowError = rowErrors.find((re) => Object.keys(re).length > 0);
    if (firstRowError) {
      toast.error(
        firstRowError.district ||
        firstRowError.post ||
        firstRowError.promotional_post ||
        'Fix the district / post rows'
      );
      return;
    }

    // Live API contract: per-district fields are JSON ARRAYS (not strings).
    // Field names per the live API's validator:
    //   - district              → array of district names
    //   - quota                 → array of quota types
    //   - post                  → array of post counts
    //   - district_quota_post   → array of post counts
    //   - promotional_quota_post → array of promotional post counts
    //   - gender_basis          → string (required)
    const postList = Array.isArray(formData.post) ? formData.post : [];
    const promoList = Array.isArray(formData.promotional_post) ? formData.promotional_post : [];

    onNext({
      // Strip the local-only fields (selection_mode, promotional_post) from
      // the spread — they were kept in form state for the UI but the live
      // API uses the live-API names (merit_type, promotional_quota_post).
      min_age:             formData.min_age,
      max_age:             formData.max_age,
      age_relaxation:      formData.age_relaxation,
      relaxation_reason:   formData.relaxation_reason,
      relaxation_years:    formData.relaxation_years,
      nationality:         formData.nationality,
      domicile:            'AJK',
      gender_basis:        formData.gender_basis || 'Male/Female', // required by live API for Step 3
      merit_type:          meritType,
      // The live API requires `district`, `quota`, and `post` as JSON arrays
      // (per the 422 error "District data must be an array").
      district:            districtNames,        // live API: JSON array
      quota:               perRowQuota,          // live API: JSON array
      post:                postList,             // live API: JSON array
      // The per-user spec: district_quota_post and promotional_quota_post are
      // stored as comma-separated strings (one value per district row), paired
      // with the corresponding district by index. The preview's "District/Posts"
      // and "Promotional Posts" rows split them back into per-district pairs
      // using the same index.
      district_quota_post:     postList.join(','),
      promotional_quota_post:  promoList.join(','),
      other_conditions:   formData.other_conditions || 'N/A',
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
          <SearchableSelect
            label="Age Relaxation"
            placeholder="Age Relaxation"
            name="age_relaxation"

            value={formData.age_relaxation}
            onChange={handleChange}
            required
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]}
          />
        </div>

        {showRelaxation && (
          <>
            <div className="col-md-6 form-group">
              <SearchableSelect
                label="Reason for Age Relaxation"
                name="relaxation_reason"
                value={isOtherRelaxation ? '__other__' : formData.relaxation_reason}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__other__') {
                    setIsOtherRelaxation(true);
                  } else {
                    setIsOtherRelaxation(false);
                    setCustomRelaxation('');
                    setFormData((prev) => ({ ...prev, relaxation_reason: val }));
                  }
                }}
                options={[
                  { value: 'Government Employee', label: 'Government Employee' },
                  ...(!isOtherRelaxation && formData.relaxation_reason && formData.relaxation_reason !== 'Government Employee'
                    ? [{ value: formData.relaxation_reason, label: formData.relaxation_reason }]
                    : []),
                  { value: '__other__', label: 'Other (specify)' },
                ]}
              />
              {isOtherRelaxation && (
                <div className="mt-2 flex gap-2 items-center animate-in fade-in duration-200">
                  <TextField
                    fullWidth
                    size="small"
                    label="Custom Reason"
                    value={customRelaxation}
                    onChange={(e) => setCustomRelaxation(e.target.value)}
                    placeholder="e.g. Ex-Serviceman"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = customRelaxation.trim();
                        if (trimmed) {
                          setFormData((prev) => ({ ...prev, relaxation_reason: trimmed }));
                          setIsOtherRelaxation(false);
                          setCustomRelaxation('');
                        }
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = customRelaxation.trim();
                      if (trimmed) {
                        setFormData((prev) => ({ ...prev, relaxation_reason: trimmed }));
                        setIsOtherRelaxation(false);
                        setCustomRelaxation('');
                      }
                    }}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg whitespace-nowrap"
                  >
                    Add &amp; Set
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtherRelaxation(false);
                      setCustomRelaxation('');
                    }}
                    className="px-3 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
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
          <SearchableSelect
            label="Nationality"
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            required
            placeholder="Select Nationality"
            options={[
              { value: '', label: 'Select Nationality' },
              ...nationalities.map((n) => ({ value: n, label: n })),
            ]}
          />
        </div>

        <div className="col-md-6 form-group">
          <SearchableSelect
            label="Gender"
            placeholder="Gender"
            name="gender_basis"
            value={formData.gender_basis}
            onChange={handleChange}
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Male/Female', label: 'Male and Female' },
            ]}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Any Other Conditions"
            placeholder="Any Other Conditions"
            name="other_conditions"
            value={formData.other_conditions}
            onChange={handleChange}
          />
        </div>
      </div>

      <h6 className="section-title" style={{ marginTop: '30px', marginBottom: '12px', fontSize: '1.05rem', fontWeight: '600' }}>Selection Mode</h6>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', padding: '14px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="selection_mode"
            value="open_merit"
            checked={formData.selection_mode === 'open_merit'}
            onChange={(e) => setFormData(prev => ({ ...prev, selection_mode: e.target.value }))}
            // Project theme: emerald-700 (#047857) for the checked
            // dot + ring. `accentColor` is a CSS property supported
            // across all modern browsers; we also set `accent-emerald-700`
            // as a Tailwind fallback in case the build pipeline strips
            // inline styles.
            style={{ accentColor: EMERALD_700 }}
            className="accent-emerald-700"
          />
          <span style={{ fontWeight: 500, color: '#1e293b' }}>Open Merit</span>
          <small style={{ color: '#64748b' }}>(uses Step 1's total posts)</small>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="selection_mode"
            value="quota_based"
            checked={formData.selection_mode === 'quota_based'}
            onChange={(e) => setFormData(prev => ({ ...prev, selection_mode: e.target.value }))}
            // Project theme: emerald-700 (#047857) for the checked
            // dot + ring. See note on `accentColor` above.
            style={{ accentColor: EMERALD_700 }}
            className="accent-emerald-700"
          />
          <span style={{ fontWeight: 500, color: '#1e293b' }}>Quota Based</span>
          <small style={{ color: '#64748b' }}>(per-district distribution required)</small>
        </label>
      </div>

      {formData.selection_mode === 'quota_based' && (<>
      <h6 className="section-title" style={{ marginTop: '20px', marginBottom: '20px', fontSize: '1.05rem', fontWeight: '600' }}>Quota Wise Post Distribution</h6>

      <div className="table-responsive" style={{ marginTop: '15px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', width: '100%' }}>
        <table className="table table-bordered" style={{ marginBottom: 0, width: '100%' }}>
          <thead style={{ backgroundColor: '#006622' }}>
            <tr>
              <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem' }}>District</th>
              <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem' }}>District Quota Posts</th>
              {/* Promotional Quota Posts column — disabled (not currently
                  functional end-to-end with the live backend). */}
              {/* <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem' }}>Promotional Quota Posts</th> */}
              <th style={{ color: 'white', padding: '12px 16px', fontWeight: '600', fontSize: '0.9rem', width: '140px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {formData.district.map((_, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <SearchableSelect
                    label="Select Districts"
                    value={formData.district[index] || ''}
                    onChange={(e) =>
                      handleArrayChange(index, 'district', e.target.value)
                    }
                    required
                    error={rowErrors[index]?.district}
                    placeholder="Select District"
                    options={[
                      { value: '', label: 'Select District' },
                      ...districtOptions
                        .filter((district) => {
                          const selectedInOtherRows = formData.district
                            .filter((_, i) => i !== index)
                            .includes(district.id);
                          return !selectedInOtherRows;
                        })
                        .map((district) => ({ value: district.id, label: district.name })),
                      // Fallback for previously-saved value that doesn't match any option
                      ...(formData.district[index] && !districtOptions.some((d) => d.id === formData.district[index])
                        ? [{ value: formData.district[index], label: formData.district[index] }]
                        : []),
                    ]}
                  />
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
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      handleArrayChange(index, 'post', val);
                    }}
                    onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === '-' || e.key === '+') e.preventDefault(); }}
                    inputProps={{ min: 0, step: 1 }}
                    error={!!rowErrors[index]?.post}
                    helperText={rowErrors[index]?.post || ''}
                  />
                </td>
                {/* Promotional Quota Posts input — disabled (not currently
                    functional end-to-end with the live backend). */}
                {/* <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    value={formData.promotional_post?.[index] ?? ''}
                    onChange={(e) => handleArrayChange(index, 'promotional_post', e.target.value)}
                    placeholder="Optional"
                    inputProps={{ min: 0 }}
                    error={!!rowErrors[index]?.promotional_post}
                    helperText={rowErrors[index]?.promotional_post || 'Decide later'}
                  />
                </td> */}
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
        {postsFilledCount > 0 && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: exceedsStepOneTotal ? '#fef2f2' : '#ecfdf5',
              border: `1px solid ${exceedsStepOneTotal ? '#fca5a5' : '#a7f3d0'}`,
            }}
          >
            <small style={{ color: exceedsStepOneTotal ? '#991b1b' : '#065f46', fontWeight: 500, fontSize: '0.85rem' }}>
              Posts entered: <strong>{totalPostsEntered}</strong>
              {stepOneTotal > 0 && <> / {stepOneTotal} (Step 1 total)</>}
              {exceedsStepOneTotal && <> &nbsp;— exceeds Step 1's total!</>}
            </small>
          </div>
        )}
        {someButNotAllPostsFilled && (
          <div style={{ padding: '8px 12px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px' }}>
            <small style={{ color: '#92400e', fontWeight: 500, fontSize: '0.85rem' }}>
              Fill posts for every district, or leave them all empty.
            </small>
          </div>
        )}
      </div>
      </>)}



      <div className="navigation-buttons">
        <button type="button" className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200" onClick={onBack}>
          Previous
        </button>
        <div className="flex gap-2">
          {!isEdit && (
            <button type="button" onClick={() => {
              const meritType = formData.selection_mode === 'open_merit' ? 'open_merit' : 'quota_wise';
              const allDistrictNames = districtOptions.map((d) => d.name);
              const draftData = {
                ...formData,
                merit_type: meritType,
                domicile: 'AJK',
              };
              if (formData.selection_mode === 'open_merit') {
                draftData.district = allDistrictNames;
                draftData.quota = allDistrictNames.map(() => 'Open Merit');
              }
              delete draftData.selection_mode;
              delete draftData.promotional_post;
              onSaveDraft?.(draftData);
            }} className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200">
              Save Draft
            </button>
          )}
          {/*
            The submit button label reflects the page mode. In
            Create flow this is the last step → "Preview" (the
            user expects to see the preview of their draft). In
            Edit flow this is the last step → "Update" (the user
            expects the changes to be saved in place). The parent
            passes `isEdit` so the label stays in sync with the
            form title ("Edit Requisition" vs "New Requisition").
          */}
          <button
            type="submit"
            disabled={!isStep3Valid}
            title={!isStep3Valid ? 'Fill in all required fields and resolve the validation errors above to continue' : undefined}
            className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-950 disabled:hover:to-emerald-950"
          >
            {isEdit ? 'Update' : 'Preview'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default Step3Eligibility;
