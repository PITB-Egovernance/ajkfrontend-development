import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InlineLoader } from 'components/ui/Loader';
import { Briefcase, GraduationCap, UserCheck, Trash } from 'lucide-react';
import confirmDelete from 'components/ui/ConfirmDelete';
import Step1JobDetails from 'pages/requisition/Steps/Step1JobDetails';
import Step2Criteria from 'pages/requisition/Steps/Step2Criteria';
import Step3Eligibility from 'pages/requisition/Steps/Step3Eligibility';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import toast from 'react-hot-toast';
import { extractFilePath } from 'utils';
import { CheckCircle2 } from 'lucide-react';
import 'pages/requisition/RequisitionForm.css';
import DeptRequisitionApi from 'api/deptRequisitionApi';

const steps = [
  { number: 0, icon: Briefcase, label: 'Job Details' },
  { number: 1, icon: GraduationCap, label: 'Criteria' },
  { number: 2, icon: UserCheck, label: 'Eligibility' }
];

const STEP1_SKIPPED_FIELDS = new Set(['test_type']);

const DeptRequisitionForm = () => {
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
  const [formData, setFormData] = useState({ step1: {}, step2: {}, step3: {} });
  const [dataVersion, setDataVersion] = useState(0);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;
  const authHeaders = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
    'X-API-KEY': API_KEY,
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [dRes, depRes, gRes, desRes] = await Promise.all([
          fetch(`${API_BASE}/settings/districts`, { headers: authHeaders }),
          fetch(`${API_BASE}/settings/departments?per_page=200`, { headers: authHeaders }),
          fetch(`${API_BASE}/settings/grades?per_page=200`, { headers: authHeaders }),
          fetch(`${API_BASE}/settings/designations?per_page=200`, { headers: authHeaders }),
        ]);
        const [dData, depData, gData, desData] = await Promise.all([
          dRes.json(), depRes.json(), gRes.json(), desRes.json(),
        ]);

        if (dData.success) setDistrictOptions((dData.data?.data ?? dData.data ?? []).map((d) => ({ id: d.hash_id, name: d.name })));
        if (depData.success || depData.status === 200) {
          const list = depData.data?.data ?? depData.data ?? [];
          setDepartmentOptions(list.filter((d) => (d.status ?? 'active') === 'active').map((d) => ({ id: d.hash_id || d.id, name: d.department_name || d.name })));
        }
        if (gData.success || gData.status === 200) {
          const list = gData.data?.data ?? gData.data ?? [];
          setGradeOptions(list.filter((g) => (g.status ?? 'active') === 'active').map((g) => ({ id: g.hash_id || g.id, name: g.name })));
        }
        if (desData.success || desData.status === 200) {
          const list = desData.data?.data ?? desData.data ?? [];
          setDesignationOptions(list.filter((d) => (d.status ?? 'active') === 'active' && !d.wings && !['chairman', 'secretary'].includes(d.name?.toLowerCase())).map((d) => ({ id: d.hash_id || d.id, name: d.name })));
        }
      } catch {}
    };
    fetchOptions();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (tempId) loadTempData();
    // eslint-disable-next-line
  }, [tempId]);

  const loadTempData = async () => {
    setLoading(true);
    try {
      const result = await DeptRequisitionApi.getForm(tempId);
      if (result.success && result.data) {
        const step1Data = result.data.step1 || {};
        step1Data.service_rules = extractFilePath(step1Data.service_rules);
        step1Data.syllabus = extractFilePath(step1Data.syllabus);
        step1Data.service_rules_text = step1Data.service_rules_text || step1Data.service_rule_text || '';

        const updatedFormData = {
          step1: step1Data,
          step2: result.data.step2 || {},
          step3: result.data.step3 || {}
        };
        setFormData(updatedFormData);
        setDataVersion((v) => v + 1);
      }
    } catch (error) {
      toast.error('Failed to load draft data');
    } finally {
      setLoading(false);
    }
  };

  const syncDraftUrl = (draftTempId, stepIndex) => {
    if (!draftTempId) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('temp_id', draftTempId);
    nextParams.set('step', String(stepIndex + 1));
    setSearchParams(nextParams, { replace: true });
  };

  const handleStepSubmit = async (stepIndex, stepData) => {
    setLoading(true);
    try {
      let payload = { ...stepData };
      if (tempId) payload.temp_id = tempId;

      if (stepIndex === 0) {
        const fd = new FormData();
        fd.append('step', '1');
        fd.append('temp_id', tempId || '');
        Object.entries(payload).forEach(([key, val]) => {
          if (STEP1_SKIPPED_FIELDS.has(key) || key === 'temp_id') return;
          if (val instanceof File) fd.append(key, val);
          else if (val !== null && val !== undefined && val !== '') fd.append(key, String(val));
        });
        if (Array.isArray(payload.multiple_posts)) {
          payload.multiple_posts.forEach((post, i) => {
            Object.entries(post).forEach(([k, v]) => {
              if (v !== null && v !== undefined && v !== '') fd.append(`multiple_posts[${i}][${k}]`, String(v));
            });
          });
        }
        const result = await DeptRequisitionApi.create(fd);
        if (result.success) {
          const newTempId = result.data?.temp_id || result.temp_id || tempId;
          if (newTempId) {
            setTempId(newTempId);
            syncDraftUrl(newTempId, stepIndex + 1);
          }
          setFormData((prev) => ({ ...prev, step1: stepData }));
          setActiveStep(1);
          toast.success('Job details saved');
        }
      } else if (stepIndex === 1) {
        payload.step = 2;
        payload.temp_id = tempId;
        const result = await DeptRequisitionApi.create(payload);
        if (result.success) {
          setFormData((prev) => ({ ...prev, step2: stepData }));
          setActiveStep(2);
          syncDraftUrl(tempId, 2);
          toast.success('Criteria saved');
        }
      } else if (stepIndex === 2) {
        payload.step = 3;
        payload.temp_id = tempId;
        const result = await DeptRequisitionApi.create(payload);
        if (result.success) {
          setFormData((prev) => ({ ...prev, step3: stepData }));
          toast.success('Eligibility saved');
          navigate(`/department/requisitions/preview/${tempId}`);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save step');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!tempId) { navigate('/department/requisitions'); return; }
    if (!await confirmDelete({ title: 'Discard Draft', message: 'Are you sure you want to discard this draft?' })) return;
    try {
      await DeptRequisitionApi.delete(tempId);
      toast.success('Draft discarded');
    } catch {}
    navigate('/department/requisitions');
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Step1JobDetails
            key={`step1-${dataVersion}`}
            data={formData.step1}
            onNext={(data) => handleStepSubmit(0, data)}
            onSaveDraft={() => {}}
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
            onNext={(data) => handleStepSubmit(1, data)}
            onBack={() => setActiveStep(0)}
            onSaveDraft={() => {}}
          />
        );
      case 2:
        return (
          <Step3Eligibility
            key={`step3-${dataVersion}`}
            data={formData.step3}
            step1Data={formData.step1}
            tempId={tempId}
            onNext={(data) => handleStepSubmit(2, data)}
            onBack={() => setActiveStep(1)}
            onSaveDraft={() => {}}
            districtOptions={districtOptions}
          />
        );
      default:
        return null;
    }
  };

  if (loading && !formData.step1.case_number) {
    return <InlineLoader text="Loading form..." variant="ring" />;
  }

  return (
    <div className="requisition-form-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-xl font-bold shadow-lg mb-0">
          Department Requisition
        </div>

        <div className={`step-progress active-${activeStep}`}>
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <div
                key={idx}
                className={`step ${idx === activeStep ? 'active' : ''} ${idx < activeStep ? 'completed' : ''}`}
                data-step={idx}
                onClick={() => {
                  if (idx < activeStep || idx <= activeStep) setActiveStep(idx);
                }}
                style={{ cursor: idx <= activeStep ? 'pointer' : 'default' }}
              >
                <div className="step-circle">
                  {idx < activeStep ? <CheckCircle2 size={20} /> : <StepIcon size={20} />}
                </div>
                <div className="step-label">{step.label}</div>
              </div>
            );
          })}
        </div>

        {tempId && (
          <div className="flex justify-end px-4 mb-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <Trash size={14} /> Discard Draft
            </button>
          </div>
        )}

        <div className="form-container">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default DeptRequisitionForm;