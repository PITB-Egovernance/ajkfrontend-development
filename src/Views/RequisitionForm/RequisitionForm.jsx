import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InlineLoader } from 'Components/ui/Loader';
import { Briefcase, GraduationCap, UserCheck } from 'lucide-react';
import Step1JobDetails from './Steps/Step1JobDetails';
import Step2Criteria from './Steps/Step2Criteria';
import Step3Eligibility from './Steps/Step3Eligibility';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';
import toast from 'react-hot-toast';
import './RequisitionForm.css';

const steps = [
  { number: 0, icon: Briefcase, label: 'Job Details' },
  { number: 1, icon: GraduationCap, label: 'Criteria' },
  { number: 2, icon: UserCheck, label: 'Eligibility' }
];

const RequisitionForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tempId, setTempId] = useState(searchParams.get('temp_id') || '');
  const [formData, setFormData] = useState({
    step1: {},
    step2: {},
    step3: {}
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    if (tempId) {
      loadTempData();
    }
  }, [tempId]);

  const loadTempData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requisition/form?temp_id=${tempId}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setFormData({
          step1: result.data.step1 || {},
          step2: result.data.step2 || {},
          step3: result.data.step3 || {}
        });
      }
    } catch (error) {
      console.error('Error loading temp data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step, data) => {
    const errors = {};
    
    if (step === 0) {
      if (!data.designation?.trim()) errors.designation = 'Designation is required';
      if (!data.scale?.trim()) errors.scale = 'Scale is required';
      if (!data.quota_percentage) errors.quota_percentage = 'Quota percentage is required';
      if (!data.num_posts || data.num_posts < 1) errors.num_posts = 'Number of posts is required';
      if (!data.vacancy_date?.trim()) errors.vacancy_date = 'Vacancy date is required';
      if (!data.test_type) errors.test_type = 'Test type is required';
    } else if (step === 1) {
      if (!data.academic_qualification) errors.academic_qualification = 'Academic qualification is required';
      if (!data.equivalent_qualification) errors.equivalent_qualification = 'Equivalent qualification is required';
      if (!data.degree_equivalence) errors.degree_equivalence = 'Degree equivalence is required';
    } else if (step === 2) {
      if (!data.min_age || data.min_age < 18) errors.min_age = 'Minimum age must be at least 18';
      if (!data.max_age || data.max_age < data.min_age) errors.max_age = 'Maximum age must be greater than minimum age';
      if (!data.age_relaxation) errors.age_relaxation = 'Age relaxation is required';
      if (!data.nationality) errors.nationality = 'Nationality is required';
      if (!data.domicile?.trim()) errors.domicile = 'Domicile is required';
      if (!data.gender_basis) errors.gender_basis = 'Gender is required';
      if (!data.district || data.district.length === 0) errors.district = 'At least one district is required';
    }
    
    return errors;
  };

  const saveStep = async (stepData) => {
    const currentStepNumber = activeStep + 1;
    const errors = validateStep(activeStep, stepData);
    
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error));
      return false;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('step', currentStepNumber);
      if (tempId) formDataToSend.append('temp_id', tempId);

      // Handle file uploads for step 1
      if (currentStepNumber === 1) {
        Object.keys(stepData).forEach(key => {
          if (stepData[key] instanceof File) {
            formDataToSend.append(key, stepData[key]);
          } else if (stepData[key] !== null && stepData[key] !== undefined) {
            formDataToSend.append(key, stepData[key]);
          }
        });
      } else {
        // For step 2 and 3, send as JSON
        Object.keys(stepData).forEach(key => {
          if (Array.isArray(stepData[key])) {
            stepData[key].forEach((item, index) => {
              formDataToSend.append(`${key}[${index}]`, item);
            });
          } else {
            formDataToSend.append(key, stepData[key]);
          }
        });
      }

      const response = await fetch(`${API_BASE}/requisition/store`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
        body: formDataToSend,
      });

      const result = await response.json();
      
      if (result.status === 200) {
        if (result.temp_id) setTempId(result.temp_id);
        toast.success(`Step ${currentStepNumber} saved successfully`);
        
        // Update form data
        const stepKey = `step${currentStepNumber}`;
        setFormData(prev => ({
          ...prev,
          [stepKey]: stepData
        }));
        
        return true;
      } else {
        toast.error(result.error || 'Failed to save step data');
        return false;
      }
    } catch (error) {
      console.error('Error saving step:', error);
      toast.error('Error saving step data');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async (stepData) => {
    const saved = await saveStep(stepData);
    if (saved) {
      if (activeStep === steps.length - 1) {
        // Navigate to preview
        navigate(`/dashboard/requisitions/preview?temp_id=${tempId}`);
      } else {
        setActiveStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const renderStepContent = () => {
    if (loading) {
      return <InlineLoader text="Loading form data..." variant="ring" size="lg" />;
    }

    switch (activeStep) {
      case 0:
        return (
          <Step1JobDetails
            data={formData.step1}
            onNext={handleNext}
            tempId={tempId}
          />
        );
      case 1:
        return (
          <Step2Criteria
            data={formData.step2}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <Step3Eligibility
            data={formData.step3}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="requisition-form-container">
      <div className="container">
        <div className="app-header">New Requisition Form</div>

        {/* Step Progress */}
        <div className={`step-progress active-${activeStep}`}>
          {steps.map(step => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.number}
                className={`step ${activeStep === step.number ? 'active' : ''} ${activeStep > step.number ? 'completed' : ''}`}
                data-step={step.number}
              >
                <div className="step-circle">
                  <IconComponent size={20} />
                </div>
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
