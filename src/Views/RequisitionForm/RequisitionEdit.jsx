import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const RequisitionEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    step1: {},
    step2: {},
    step3: {}
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    loadRequisitionData();
  }, [id]);

  const loadRequisitionData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requisition/edit/${id}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      
      if (result.status === 200) {
        const req = result.data.requisition;
        
        setFormData({
          step1: {
            designation: req.designation || '',
            scale: req.scale || '',
            quota_percentage: req.quota_percentage || '',
            num_posts: req.num_posts || 1,
            vacancy_date: req.vacancy_date || '',
            test_type: req.test_type || '',
            service_rules: req.service_rules || null,
            syllabus: req.syllabus || null,
          },
          step2: {
            academic_qualification: req.qualification?.academic_qualification || '',
            equivalent_qualification: req.qualification?.equivalent_qualification || '',
            authority_certificate: req.qualification?.authority_certificate || '',
            degree_equivalence: req.qualification?.degree_equivalence || '',
            any_other_qualification: req.qualification?.any_other_qualification || '',
            training_institute: req.qualification?.training_institute || '',
            experience_type: req.qualification?.experience_type || '',
            experience_length: req.qualification?.experience_length || 0,
            min_qualification: req.qualification?.min_qualification || '',
          },
          step3: {
            min_age: req.eligibility?.min_age || 18,
            max_age: req.eligibility?.max_age || 40,
            age_relaxation: req.eligibility?.age_relaxation || '',
            relaxation_reason: req.eligibility?.relaxation_reason || '',
            relaxation_years: req.eligibility?.relaxation_years || '',
            nationality: req.eligibility?.nationality || '',
            domicile: req.eligibility?.domicile || '',
            other_conditions: req.eligibility?.other_conditions || '',
            gender_basis: req.eligibility?.gender_basis || '',
            district: req.multiple_posts?.map(p => p.district) || [''],
            quota: req.multiple_posts?.map(p => p.quota) || [''],
            post: req.multiple_posts?.map(p => p.post) || [''],
          }
        });
      } else {
        toast.error('Failed to load requisition data');
        navigate('/dashboard/requisitions');
      }
    } catch (error) {
      console.error('Error loading requisition:', error);
      toast.error('Error loading requisition data');
      navigate('/dashboard/requisitions');
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
    }
    
    return errors;
  };

  const updateStep = async (stepData) => {
    const currentStepNumber = activeStep + 1;
    const errors = validateStep(activeStep, stepData);
    
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error));
      return false;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let method = 'PUT';
      let body;

      if (currentStepNumber === 1) {
        endpoint = `${API_BASE}/requisition/${id}/update-job`;
        const formDataToSend = new FormData();
        formDataToSend.append('_method', 'PUT'); // Laravel method spoofing for multipart
        Object.keys(stepData).forEach(key => {
          if (stepData[key] instanceof File) {
            formDataToSend.append(key, stepData[key]);
          } else if (stepData[key] !== null && stepData[key] !== undefined && stepData[key] !== '') {
            formDataToSend.append(key, stepData[key]);
          }
        });
        body = formDataToSend;
        method = 'POST'; // Use POST with _method spoofing for file uploads
      } else if (currentStepNumber === 2) {
        endpoint = `${API_BASE}/requisition/${id}/update-criteria`;
        body = JSON.stringify(stepData);
      } else if (currentStepNumber === 3) {
        endpoint = `${API_BASE}/requisition/${id}/update-eligibility`;
        body = JSON.stringify(stepData);
      }

      const headers = {
        'Authorization': `Bearer ${TOKEN}`,
        'X-API-KEY': API_KEY,
      };

      if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(endpoint, {
        method: method,
        headers: headers,
        body: body,
      });

      const result = await response.json();
      
      console.log('Update response:', result); // Debug log
      
      if (result.status === 200 || response.ok) {
        toast.success(`Step ${currentStepNumber} updated successfully`);
        
        // Update form data
        const stepKey = `step${currentStepNumber}`;
        setFormData(prev => ({
          ...prev,
          [stepKey]: stepData
        }));
        
        return true;
      } else {
        console.error('Update failed:', result); // Debug log
        toast.error(result.error || result.message || 'Failed to update step data');
        return false;
      }
    } catch (error) {
      console.error('Error updating step:', error);
      toast.error('Error updating step data: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async (stepData) => {
    const updated = await updateStep(stepData);
    if (updated) {
      if (activeStep === steps.length - 1) {
        toast.success('All changes saved successfully!');
        setTimeout(() => {
          navigate('/dashboard/requisitions');
        }, 1000);
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
            isEdit={true}
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
            isEdit={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="requisition-form-container">
      <div className="container">
        <div className="app-header">Edit Requisition - ID: #{id}</div>

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

export default RequisitionEdit;
