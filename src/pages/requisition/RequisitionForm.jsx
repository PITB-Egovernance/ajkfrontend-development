import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InlineLoader } from 'components/ui/Loader';
import { Briefcase, GraduationCap, UserCheck, Trash } from 'lucide-react';
import confirmDelete from 'components/ui/ConfirmDelete';
import Step1JobDetails from './Steps/Step1JobDetails';
import Step2Criteria from './Steps/Step2Criteria';
import Step3Eligibility from './Steps/Step3Eligibility';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import toast from 'react-hot-toast';
import { extractFilePath, persistDraftFilePath, getPersistedDraftFilePath, clearPersistedDraftFiles } from 'utils';
import { validateRequisitionStep } from 'schemas';
import { CheckCircle2 } from 'lucide-react';
import './RequisitionForm.css';

const steps = [
  { number: 0, icon: Briefcase, label: 'Job Details' },
  { number: 1, icon: GraduationCap, label: 'Criteria' },
  { number: 2, icon: UserCheck, label: 'Eligibility' }
];

// Fields that must never be sent to the live API from Step 1.
// test_type is collected in the form but the live API does not accept it.
const STEP1_SKIPPED_FIELDS = new Set(['test_type']);

const RequisitionForm = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStepParam = Number(searchParams.get('step'));
  const [districtOptions, setDistrictOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [activeStep, setActiveStep] = useState(
    Number.isInteger(initialStepParam) && initialStepParam >= 1 && initialStepParam <= steps.length
      ? initialStepParam - 1
      : 0
  );
  const [loading, setLoading] = useState(false);
  const [tempId, setTempId] = useState(searchParams.get('temp_id') || '');
  const [formData, setFormData] = useState({
    step1: {},
    step2: {},
    step3: {}
  });
  const [dataVersion, setDataVersion] = useState(0);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  // Fetch the dropdown option lists once on mount. These don't change
  // during the wizard, so they're fetched here (not inside each step's
  // remounting component) to avoid repeated /settings/* calls every time
  // the user navigates between steps — which was tripping the live API's
  // rate limiter and leaving "No departments/grades configured" after a
  // step round trip.
  useEffect(() => {
    fetchDistricts();
    fetchDepartments();
    fetchGrades();
    fetchDesignations();
  }, []);

  useEffect(() => {
    if (tempId) {
      loadTempData();
    }
  }, [tempId, searchParams.toString()]);

  const fetchDistricts = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/districts`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.success) {
        setDistrictOptions(
          result.data.data.map((d) => ({
            id: d.hash_id,
            name: d.name
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      toast.error('Failed to load districts');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/departments?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.success || result.status === 200) {
        const list = result.data?.data ?? result.data ?? [];
        setDepartmentOptions(
          list
            .filter((d) => (d.status ?? 'active') === 'active')
            .map((d) => ({
              id: d.hash_id || d.id,
              name: d.department_name || d.name,
            }))
        );
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/grades?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.success || result.status === 200) {
        const list = result.data?.data ?? result.data ?? [];
        setGradeOptions(
          list
            .filter((g) => (g.status ?? 'active') === 'active')
            .map((g) => ({ id: g.hash_id || g.id, name: g.name }))
        );
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/designations?per_page=200`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.success || result.status === 200) {
        const list = result.data?.data ?? result.data ?? [];
        setDesignationOptions(
          list
            .filter((d) => (d.status ?? 'active') === 'active')
            .map((d) => ({ id: d.hash_id || d.id, name: d.name }))
        );
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  const persistDraftMeta = (draftTempId, stepIndex) => {
    if (!draftTempId) return;
    try {
      localStorage.setItem('requisitionDraftMeta', JSON.stringify({
        temp_id: draftTempId,
        step: stepIndex + 1,
        updated_at: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Could not persist draft metadata:', error);
    }
  };

  // Keeps the URL's temp_id/step params in sync as the user moves through
  // the wizard. This does NOT persist to localStorage — "Resume Draft" on
  // the requisitions list should only appear after the user explicitly
  // clicks "Save Draft" (see persistDraftMeta / handleSaveDraft).
  const syncDraftUrl = (draftTempId, stepIndex) => {
    if (!draftTempId) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('temp_id', draftTempId);
    nextParams.set('step', String(stepIndex + 1));
    setSearchParams(nextParams, { replace: true });
  };

  const isStepCompleted = (stepIndex, stepData) => {
    const stepErrors = validateRequisitionStep(stepIndex, stepData || {});
    return Object.keys(stepErrors).length === 0;
  };

  const getNextPendingStep = (draftData) => {
    if (!isStepCompleted(0, draftData.step1)) return 0;
    if (!isStepCompleted(1, draftData.step2)) return 1;
    return 2;
  };

  const loadTempData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requisitions/form?temp_id=${tempId}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.success && result.data) {
        const step1Data = result.data.step1 || {};
        step1Data.service_rules = extractFilePath(step1Data.service_rules);
        step1Data.syllabus = extractFilePath(step1Data.syllabus);
        step1Data.service_rules_text = step1Data.service_rules_text || step1Data.service_rule_text || '';

        // Re-saving step 1 (e.g. clicking "Next" without re-uploading) sends
        // the request WITHOUT the service_rules/syllabus fields, since they're
        // existing file paths the backend is expected to keep. If a later
        // fetch comes back without them anyway (or with an empty `{}`
        // placeholder, normalized to `null` above), fall back to the
        // last-known file path so "Previous file: X" doesn't disappear after
        // navigating away from and back to step 1.
        if (!step1Data.service_rules && formData.step1?.service_rules) {
          step1Data.service_rules = formData.step1.service_rules;
        }
        if (!step1Data.syllabus && formData.step1?.syllabus) {
          step1Data.syllabus = formData.step1.syllabus;
        }

        // Final fallback: the backend's storeStep() may have permanently
        // dropped these fields from step1_data on a prior re-save (full
        // overwrite bug — see BACKEND_FIX_REQUISITION_FILE_DROP.md), and on
        // a fresh page load formData.step1 above is still empty too.
        // Recover the last-known path persisted locally when Step 1 was
        // first saved, so the file isn't treated as missing until the user
        // actually confirms on the Preview page.
        if (!step1Data.service_rules) {
          step1Data.service_rules = getPersistedDraftFilePath(tempId, 'service_rules');
        }
        if (!step1Data.syllabus) {
          step1Data.syllabus = getPersistedDraftFilePath(tempId, 'syllabus');
        }

        const updatedFormData = {
          step1: step1Data,
          step2: result.data.step2 || {},
          step3: result.data.step3 || {}
        };

        setFormData(updatedFormData);
        setDataVersion((v) => v + 1);

        const requestedStep = Number(searchParams.get('step'));
        if (Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= steps.length) {
          setActiveStep(requestedStep - 1);
          syncDraftUrl(tempId, requestedStep - 1);
        } else {
          const nextStep = getNextPendingStep(updatedFormData);
          setActiveStep(nextStep);
          syncDraftUrl(tempId, nextStep);
        }
      }
    } catch (error) {
      console.error('Error loading temp data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step, data) => {
    return validateRequisitionStep(step, data);
  };

  // Resolves a step1 "scale" value (grade hash_id, grade name, or raw
  // string) to the canonical grade hash_id. The baseline loaded from the
  // API may store the grade name while Step1JobDetails always resolves
  // `formData.scale` to the matching gradeOptions hash_id before calling
  // onNext — without this, the two representations of the same value would
  // look like a change on every comparison.
  const normalizeScale = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value).trim();
    const matched = gradeOptions.find((g) => g.id === str || g.name === str);
    return matched ? matched.id : str;
  };

  // Same idea for "department" — Step1JobDetails always resolves
  // formData.department to the matching departmentOptions name.
  const normalizeDepartment = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value).trim();
    const matched = departmentOptions.find((d) => d.id === str || d.name === str);
    return matched ? matched.name : str;
  };

  // getCleanedFormData() appends a trailing "%" to quota_promotion if it's
  // missing, so "20" (loaded) and "20%" (submitted) must compare equal.
  const normalizePercent = (value) => {
    if (value === null || value === undefined || value === '') return '';
    return String(value).replace(/%$/, '').trim();
  };

  // Treats null/undefined/'' as equivalent "empty", and numbers/numeric
  // strings as equal, so type differences between the raw API response and
  // a cleaned form submission (which the user didn't actually edit) don't
  // register as a "change".
  const normalizeForCompare = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return String(value);
    return value;
  };

  const isEqualForCompare = (a, b) => {
    const na = normalizeForCompare(a);
    const nb = normalizeForCompare(b);
    if (na === nb) return true;
    if (Array.isArray(na) && Array.isArray(nb)) {
      return na.length === nb.length && na.every((v, i) => isEqualForCompare(v, nb[i]));
    }
    if (na && nb && typeof na === 'object' && typeof nb === 'object') {
      const keys = new Set([...Object.keys(na), ...Object.keys(nb)]);
      return [...keys].every((k) => isEqualForCompare(na[k], nb[k]));
    }
    return false;
  };

  // Fields excluded from the generic per-key comparison below because they
  // need special handling: service_rules/syllabus may be File objects,
  // scale/department use different representations in the loaded baseline
  // vs. the cleaned submission, test_type is a constant injected by
  // getCleanedFormData() that never reflects a real edit, and
  // quota_promotion gets a "%" suffix appended by getCleanedFormData().
  const STEP1_SPECIAL_COMPARE_FIELDS = new Set(['service_rules', 'syllabus', 'scale', 'department', 'test_type', 'quota_promotion']);

  // Compares the data the user is about to submit for a step against the
  // last data that was successfully saved (or loaded) for that step. If
  // nothing changed, handleNext can skip the /requisitions/store call
  // entirely — re-saving identical data on every Back/Next round trip is
  // unnecessary and was the source of the file-drop bug in
  // BACKEND_FIX_REQUISITION_FILE_DROP.md.
  const hasStepDataChanged = (stepKey, stepData) => {
    const baseline = formData[stepKey];
    if (!baseline || Object.keys(baseline).length === 0) return true;

    // Only compare keys present in `stepData` — it's built from a fixed
    // object shape (getCleanedFormData / onNext), so it covers every
    // form-managed field. `baseline` (the raw API response) may carry extra
    // bookkeeping fields (id, hash_id, created_at, ...) that the form never
    // touches; comparing those would always look like a "change".
    const special = stepKey === 'step1' ? STEP1_SPECIAL_COMPARE_FIELDS : new Set();
    for (const key of Object.keys(stepData || {})) {
      if (special.has(key)) continue;
      if (!isEqualForCompare(stepData[key], baseline[key])) return true;
    }

    if (stepKey === 'step1') {
      if (normalizeScale(stepData?.scale) !== normalizeScale(baseline.scale)) return true;
      if (normalizeDepartment(stepData?.department) !== normalizeDepartment(baseline.department)) return true;
      if (normalizePercent(stepData?.quota_promotion) !== normalizePercent(baseline.quota_promotion)) return true;
      if (stepData?.service_rules_text !== baseline.service_rules_text) return true;

      // service_rules/syllabus may hold File objects, which JSON.stringify
      // would reduce to "{}" — compare via extractFilePath so a newly-picked
      // file is always detected as a change.
      if (extractFilePath(stepData?.service_rules) !== extractFilePath(baseline.service_rules)) return true;
      if (extractFilePath(stepData?.syllabus) !== extractFilePath(baseline.syllabus)) return true;
    }

    return false;
  };

  const saveStep = async (stepData, isDraft = false) => {
    const currentStepNumber = activeStep + 1;

    if (!isDraft) {
      const errors = validateStep(activeStep, stepData);
      if (Object.keys(errors).length > 0) {
        Object.values(errors).forEach(error => toast.error(error));
        return { success: false, tempId };
      }
    }

    if (currentStepNumber === 1) {
      if (Array.isArray(stepData.service_rules)) {
        stepData.service_rules = stepData.service_rules.length > 0 ? stepData.service_rules[0] : null;
      }
      if (Array.isArray(stepData.syllabus)) {
        stepData.syllabus = stepData.syllabus.length > 0 ? stepData.syllabus[0] : null;
      }
    }

    setLoading(true);
    try {
      const isStep1 = currentStepNumber === 1;
      let bodyContent;
      let headers = {
        'Authorization': `Bearer ${TOKEN}`,
        'X-API-KEY': API_KEY,
        'Accept': 'application/json',
      };

      const numericFields = ['num_posts', 'quota_percentage', 'min_age', 'max_age', 'experience_length', 'relaxation_years'];

      if (isStep1) {
        const formDataToSend = new FormData();
        formDataToSend.append('step', currentStepNumber);
        formDataToSend.append('temp_id', tempId || '');

        Object.keys(stepData).forEach(key => {
          if (STEP1_SKIPPED_FIELDS.has(key)) return;

          let value = stepData[key];

          if (key === 'service_rules' || key === 'syllabus') {
            if (Array.isArray(value)) value = value.length > 0 ? value[0] : null;
            if (value instanceof File) {
              formDataToSend.append(key, value);
            }
            // Existing file path strings are omitted — the live API
            // validates these fields as `nullable|file`, so sending the
            // path string back would fail with a 422. The backend's
            // storeStep() preserves the previously-uploaded file when this
            // field is absent from the request.
            return;
          }

          if (value instanceof File) {
            formDataToSend.append(key, value);
          } else if (value !== null && value !== undefined && value !== '') {
            if (numericFields.includes(key)) {
              const numValue = Number(value);
              if (!isNaN(numValue)) formDataToSend.append(key, numValue);
            } else {
              formDataToSend.append(key, value);
            }
          }
        });

        // Mirror quota_percentage → direct_quota_percentage
        const directQP = formDataToSend.get('quota_percentage');
        if (directQP !== null && directQP !== undefined && directQP !== '') {
          const n = Number(directQP);
          if (!Number.isNaN(n)) formDataToSend.set('direct_quota_percentage', n);
        }

        // Mirror quota_promotion → district_quota_percentage
        const districtQP = formDataToSend.get('quota_promotion');
        if (districtQP !== null && districtQP !== undefined && districtQP !== '') {
          const cleaned = String(districtQP).replace(/%$/, '').trim();
          const n = Number(cleaned);
          if (!Number.isNaN(n)) formDataToSend.set('district_quota_percentage', n);
        }

        if (!formDataToSend.has('direct_quota_percentage'))   formDataToSend.set('direct_quota_percentage', 0);
        if (!formDataToSend.has('district_quota_percentage')) formDataToSend.set('district_quota_percentage', 0);

        bodyContent = formDataToSend;
      } else {
        headers['Content-Type'] = 'application/json';

        const jsonData = {
          step: currentStepNumber,
          temp_id: tempId || '',
        };

        Object.keys(stepData).forEach(key => {
          const value = stepData[key];
          if (currentStepNumber === 3 && ['selection_mode', 'promotional_post'].includes(key)) return;

          if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
              jsonData[key] = value.map((item) => {
                if (numericFields.includes(key)) {
                  const num = Number(item);
                  return Number.isNaN(num) ? item : num;
                }
                return item;
              });
            } else if (numericFields.includes(key)) {
              const numValue = Number(value);
              jsonData[key] = !Number.isNaN(numValue) ? numValue : value;
            } else {
              jsonData[key] = value;
            }
          }
        });

        bodyContent = JSON.stringify(jsonData);
        console.log('📤 Sending Step', currentStepNumber, '(JSON):', jsonData);
      }

      const response = await fetch(`${API_BASE}/requisitions/store`, {
        method: 'POST',
        headers: headers,
        body: bodyContent,
      });

      console.log('📥 Response Status:', response.status, response.statusText);

      const contentType = response.headers.get('content-type') || '';
      let result;

      try {
        const responseText = await response.text();
        console.log('📥 Raw Response:', responseText.substring(0, 500));

        if (contentType.includes('application/json') || responseText.trim().startsWith('{')) {
          result = JSON.parse(responseText);
        } else {
          const isSpaShell = /<title>AJKPSC Admin<\/title>/i.test(responseText)
            || /<div id="root"><\/div>/i.test(responseText)
            || /static\/js\/bundle\.js/i.test(responseText);

          let errorMsg = 'Server returned HTML error page';
          if (isSpaShell) errorMsg = 'Live server is returning the admin frontend HTML instead of the API response.';
          else if (response.status === 404) errorMsg = 'API endpoint not found (404)';
          else if (response.status === 500) errorMsg = 'Server error (500). Check server logs for validation issues';
          else if (response.status === 403) errorMsg = 'Access forbidden (403). Check API key and authorization';
          else if (response.status === 401) errorMsg = 'Unauthorized (401). Check your authentication token';
          else if (response.status === 422) errorMsg = 'Validation error (422). Check the data being sent';
          else if (response.status === 302) {
            errorMsg = 'Session token is not valid on the live API. Please log out and log back in.';
            try { localStorage.removeItem('auth_token'); } catch {}
          }

          toast.error(`API Error: ${errorMsg}`);
          return { success: false, tempId };
        }
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        toast.error('Failed to parse API response');
        return { success: false, tempId };
      }

      if (result.success) {
        const resolvedTempId = result.data?.temp_id || tempId;

        if (result.data?.temp_id) {
          setTempId(result.data.temp_id);
          console.log('✅ Got new temp_id:', result.data.temp_id);
        }

        const currentStepLabel = steps.find(step => step.number === activeStep)?.label || `Step ${currentStepNumber}`;
        toast.success(`${currentStepLabel} saved successfully`, {
          icon: <CheckCircle2 className="text-emerald-500" size={24} />,
          style: { fontWeight: '500' }
        });

        if (currentStepNumber === 3 && !isDraft) {
          localStorage.removeItem('requisitionDraftMeta');
          try {
            Object.keys(localStorage).forEach((k) => {
              if (k.startsWith('step3_draft_') || k.startsWith('step1_draft_') || k.startsWith('step2_draft_')) {
                localStorage.removeItem(k);
              }
            });
          } catch { /* ignore */ }
        }

        const stepKey = `step${currentStepNumber}`;
        const mergedStepData = { ...stepData };
        if (isStep1) {
          // Don't let a missing/empty service_rules or syllabus in this
          // submission (existing file paths aren't re-sent, see above) blank
          // out a previously-known file path in local state.
          mergedStepData.service_rules = extractFilePath(mergedStepData.service_rules) || formData.step1?.service_rules || null;
          mergedStepData.syllabus = extractFilePath(mergedStepData.syllabus) || formData.step1?.syllabus || null;
          mergedStepData.service_rules_text = mergedStepData.service_rules_text || mergedStepData.service_rule_text || formData.step1?.service_rules_text || formData.step1?.service_rule_text || '';

          // Workaround for the backend's storeStep() overwriting step1_data
          // (and dropping these fields) on a re-save without a new upload —
          // see BACKEND_FIX_REQUISITION_FILE_DROP.md. Persist the resolved
          // paths so Preview can recover them even if the API forgets them.
          persistDraftFilePath(resolvedTempId, 'service_rules', mergedStepData.service_rules);
          persistDraftFilePath(resolvedTempId, 'syllabus', mergedStepData.syllabus);
        }
        setFormData(prev => ({ ...prev, [stepKey]: mergedStepData }));
        return { success: true, tempId: resolvedTempId };

      } else {
        let errorMsg = 'Failed to save step data';
        if (result.message) errorMsg = result.message;
        else if (result.error) errorMsg = result.error;
        else if (result.errors) {
          errorMsg = typeof result.errors === 'object'
            ? Object.values(result.errors).flat().join(', ')
            : result.errors;
        }
        toast.error(errorMsg);
        return { success: false, tempId };
      }
    } catch (error) {
      console.error('❌ Error saving step:', error);
      toast.error('Error saving step data: ' + error.message);
      return { success: false, tempId };
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async (stepData) => {
    const stepKey = `step${activeStep + 1}`;
    const isLastStep = activeStep === steps.length - 1;

    // If this step was already saved with this exact data (e.g. the user
    // navigated Back to this step and didn't change anything before
    // clicking Next again), skip the redundant /requisitions/store call.
    if (tempId && !hasStepDataChanged(stepKey, stepData)) {
      if (isLastStep) {
        localStorage.removeItem('requisitionDraftMeta');
        syncDraftUrl(tempId, activeStep);
        navigate(`/dashboard/requisitions/preview?temp_id=${tempId}`);
      } else {
        const nextStep = activeStep + 1;
        setActiveStep(nextStep);
        syncDraftUrl(tempId, nextStep);
        persistDraftMeta(tempId, nextStep);
      }
      return;
    }

    const saveResult = await saveStep(stepData, false);
    if (saveResult.success) {
      const resolvedTempId = saveResult.tempId || tempId;
      if (isLastStep) {
        localStorage.removeItem('requisitionDraftMeta');
        if (resolvedTempId) syncDraftUrl(resolvedTempId, activeStep);
        navigate(`/dashboard/requisitions/preview?temp_id=${resolvedTempId || ''}`);
      } else {
        const nextStep = activeStep + 1;
        setActiveStep(nextStep);
        if (resolvedTempId) {
          syncDraftUrl(resolvedTempId, nextStep);
          persistDraftMeta(resolvedTempId, nextStep);
        }
      }
    }
  };

  const handleSaveDraft = async (stepData) => {
    const saveResult = await saveStep(stepData, true);
    if (saveResult.success) {
      const resolvedTempId = saveResult.tempId || tempId;
      if (resolvedTempId) {
        syncDraftUrl(resolvedTempId, activeStep);
        // Only an explicit "Save Draft" click should make this requisition
        // appear under "Resume Draft" on the requisitions list.
        persistDraftMeta(resolvedTempId, activeStep);
      }
    }
  };

  const handleBack = () => {
    const previousStep = Math.max(activeStep - 1, 0);
    setActiveStep(previousStep);
    if (tempId) syncDraftUrl(tempId, previousStep);
  };

  const renderStepContent = () => {
    if (loading) return <InlineLoader text="Loading form data..." variant="ring" size="lg" />;

    switch (activeStep) {
      case 0:
        return (
          <Step1JobDetails
            key={`step1-${dataVersion}`}
            data={formData.step1}
            onNext={handleNext}
            onSaveDraft={handleSaveDraft}
            tempId={tempId}
            departmentOptions={departmentOptions}
            gradeOptions={gradeOptions}
            designationOptions={designationOptions}
          />
        );
      case 1:
        return (
          <Step2Criteria
            key={`step2-${dataVersion}`}
            data={formData.step2}
            onNext={handleNext}
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
          />
        );
      case 2:
        return (
          <Step3Eligibility
            key={`step3-${dataVersion}`}
            data={formData.step3}
            step1Data={formData.step1}
            tempId={tempId}
            onNext={handleNext}
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
            districtOptions={districtOptions}
          />
        );
      default:
        return null;
    }
  };

  const handleDeleteDraft = async () => {
    const ok = await confirmDelete({
      title:      'Delete Draft',
      message:    'Discard this requisition draft? All entered data will be lost.',
      identifier: tempId,
      warning:    'This cannot be undone.',
    });
    if (!ok) return;
    localStorage.removeItem('requisitionDraftMeta');
    clearPersistedDraftFiles(tempId);
    toast.success('Draft deleted');
    navigate('/dashboard/requisitions');
  };

  return (
    <div className="requisition-form-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-3 px-5 rounded-t-lg flex items-center justify-between">
          <span className="text-2xl font-bold flex-1 text-center">New Requisition Form</span>
          {tempId && (
            <button
              type="button"
              onClick={handleDeleteDraft}
              className="ml-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-1.5 text-sm font-medium transition-all"
              title="Delete this draft and start over"
            >
              <Trash className="w-4 h-4" /> Delete Draft
            </button>
          )}
        </div>

        <div className={`step-progress active-${activeStep}`}>
          {steps.map(step => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.number}
                className={`step ${activeStep === step.number ? 'active' : ''} ${activeStep > step.number ? 'completed' : ''}`}
                data-step={step.number}
              >
                <div className="step-circle"><IconComponent size={20} /></div>
                <div className="step-label">{step.label}</div>
              </div>
            );
          })}
        </div>

        {loading ? (
          <InlineLoader text="Loading form data..." variant="ring" size="lg" />
        ) : (
          <div className="form-step active">
            {renderStepContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequisitionForm;