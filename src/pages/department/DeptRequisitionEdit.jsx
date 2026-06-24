import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InlineLoader } from 'components/ui/Loader';
import { Briefcase, GraduationCap, UserCheck } from 'lucide-react';
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

const DeptRequisitionEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [districtOptions, setDistrictOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
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
    const init = async () => {
      setLoading(true);
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

        const result = await DeptRequisitionApi.getForEdit(id);
        if (result.success && result.data) {
          const req = result.data.requisition || result.data;
          const step1 = { ...req };
          step1.service_rules = extractFilePath(step1.service_rules);
          step1.syllabus = extractFilePath(step1.syllabus);

          setFormData({
            step1: step1,
            step2: result.data.step2 || req.step2 || {},
            step3: result.data.step3 || req.step3 || {},
          });
          setDataVersion((v) => v + 1);
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load requisition');
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line
  }, [id]);

  const handleStepSubmit = async (stepIndex, stepData) => {
    setLoading(true);
    try {
      if (stepIndex === 0) {
        const fd = new FormData();
        fd.append('_method', 'PUT');
        Object.entries(stepData).forEach(([key, val]) => {
          if (key === 'service_rules' || key === 'syllabus') {
            if (val instanceof File) fd.append(key, val);
            return;
          }
          if (val instanceof File) fd.append(key, val);
          else if (val !== null && val !== undefined && val !== '') fd.append(key, String(val));
        });
        if (Array.isArray(stepData.multiple_posts)) {
          stepData.multiple_posts.forEach((post, i) => {
            Object.entries(post).forEach(([k, v]) => {
              if (v !== null && v !== undefined && v !== '') fd.append(`multiple_posts[${i}][${k}]`, String(v));
            });
          });
        }
        await DeptRequisitionApi.updateJob(id, fd);
        setFormData((prev) => ({ ...prev, step1: stepData }));
        setActiveStep(1);
        toast.success('Job details updated');
      } else if (stepIndex === 1) {
        await DeptRequisitionApi.updateCriteria(id, stepData);
        setFormData((prev) => ({ ...prev, step2: stepData }));
        setActiveStep(2);
        toast.success('Criteria updated');
      } else if (stepIndex === 2) {
        await DeptRequisitionApi.updateEligibility(id, stepData);
        setFormData((prev) => ({ ...prev, step3: stepData }));
        toast.success('Eligibility updated');
        navigate('/department/requisitions');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.step1.case_number) {
    return <InlineLoader text="Loading requisition..." variant="ring" />;
  }

  const commonProps = { districtOptions, departmentOptions, gradeOptions, designationOptions };

  return (
    <div className="requisition-form-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-xl font-bold shadow-lg mb-0">
          Edit Requisition
        </div>

        <div className={`step-progress active-${activeStep}`}>
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <div
                key={idx}
                className={`step ${idx === activeStep ? 'active' : ''} ${idx < activeStep ? 'completed' : ''}`}
                data-step={idx}
                onClick={() => { if (idx <= activeStep) setActiveStep(idx); }}
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

        <div className="form-container">
          {activeStep === 0 && (
            <Step1JobDetails
              key={`step1-${dataVersion}`}
              data={formData.step1}
              onNext={(data) => handleStepSubmit(0, data)}
              onSaveDraft={() => {}}
              tempId={id}
              isEdit
              departmentOptions={departmentOptions}
              gradeOptions={gradeOptions}
              designationOptions={designationOptions}
            />
          )}
          {activeStep === 1 && (
            <Step2Criteria
              key={`step2-${dataVersion}`}
              data={formData.step2}
              onNext={(data) => handleStepSubmit(1, data)}
              onBack={() => setActiveStep(0)}
              onSaveDraft={() => {}}
            />
          )}
          {activeStep === 2 && (
            <Step3Eligibility
              key={`step3-${dataVersion}`}
              data={formData.step3}
              step1Data={formData.step1}
              tempId={id}
              onNext={(data) => handleStepSubmit(2, data)}
              onBack={() => setActiveStep(1)}
              onSaveDraft={() => {}}
              districtOptions={districtOptions}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DeptRequisitionEdit;