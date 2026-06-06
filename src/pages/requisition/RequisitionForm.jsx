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

  useEffect(() => {
    fetchDistricts();
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

  const syncDraftUrl = (draftTempId, stepIndex) => {
    if (!draftTempId) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('temp_id', draftTempId);
    nextParams.set('step', String(stepIndex + 1));
    setSearchParams(nextParams, { replace: true });
    persistDraftMeta(draftTempId, stepIndex);
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
        if (step1Data.service_rules && Array.isArray(step1Data.service_rules)) {
          step1Data.service_rules = step1Data.service_rules.length > 0 ? step1Data.service_rules[0] : null;
        }
        if (step1Data.syllabus && Array.isArray(step1Data.syllabus)) {
          step1Data.syllabus = step1Data.syllabus.length > 0 ? step1Data.syllabus[0] : null;
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
          if (STEP1_SKIPPED_FIELDS.has(key)) {
            console.log(`  ⏭️ ${key}: skipped (not accepted by live API)`);
            return;
          }

          let value = stepData[key];

          if (key === 'service_rules' || key === 'syllabus') {
            if (Array.isArray(value)) value = value.length > 0 ? value[0] : null;
            if (value instanceof File) {
              formDataToSend.append(key, value);
            } else if (typeof value === 'string' && value !== '') {
              // existing file path — skip, backend keeps it
            }
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

        console.log('🔁 Final Step 1 FormData entries:');
        for (const [k, v] of formDataToSend.entries()) {
          console.log(`  ${k} =`, v instanceof File ? `[File: ${v.name}]` : v);
        }

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
        setFormData(prev => ({ ...prev, [stepKey]: stepData }));
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
    const saveResult = await saveStep(stepData, false);
    if (saveResult.success) {
      const resolvedTempId = saveResult.tempId || tempId;
      if (activeStep === steps.length - 1) {
        localStorage.removeItem('requisitionDraftMeta');
        if (resolvedTempId) syncDraftUrl(resolvedTempId, activeStep);
        navigate(`/dashboard/requisitions/preview?temp_id=${resolvedTempId || ''}`);
      } else {
        const nextStep = activeStep + 1;
        setActiveStep(nextStep);
        if (resolvedTempId) syncDraftUrl(resolvedTempId, nextStep);
      }
    }
  };

  const handleSaveDraft = async (stepData) => {
    const saveResult = await saveStep(stepData, true);
    if (saveResult.success) {
      const resolvedTempId = saveResult.tempId || tempId;
      if (resolvedTempId) syncDraftUrl(resolvedTempId, activeStep);
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