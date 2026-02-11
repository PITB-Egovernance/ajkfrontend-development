import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InlineLoader } from 'components/ui/Loader';
import { Briefcase, GraduationCap, UserCheck } from 'lucide-react';
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
      const response = await fetch(`${API_BASE}/requisitions/form?temp_id=${tempId}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.success && result.data) {
        // Defensive: Ensure service_rules and syllabus in step1 are strings, not arrays
        const step1Data = result.data.step1 || {};
        if (step1Data.service_rules && Array.isArray(step1Data.service_rules)) {
          console.warn('⚠️ service_rules is an array, converting to string:', step1Data.service_rules);
          step1Data.service_rules = step1Data.service_rules.length > 0 ? step1Data.service_rules[0] : null;
        }
        if (step1Data.syllabus && Array.isArray(step1Data.syllabus)) {
          console.warn('⚠️ syllabus is an array, converting to string:', step1Data.syllabus);
          step1Data.syllabus = step1Data.syllabus.length > 0 ? step1Data.syllabus[0] : null;
        }

        setFormData({
          step1: step1Data,
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
    return validateRequisitionStep(step, data);
  };

  const saveStep = async (stepData) => {
    const currentStepNumber = activeStep + 1;
    const errors = validateStep(activeStep, stepData);

    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error));
      return false;
    }

    // CRITICAL: Pre-send validation for Step 1 to ensure service_rules and syllabus are never arrays
    if (currentStepNumber === 1) {
      if (Array.isArray(stepData.service_rules)) {
        console.error('❌ service_rules is an array! This will cause database errors:', stepData.service_rules);
        stepData.service_rules = stepData.service_rules.length > 0 ? stepData.service_rules[0] : null;
      }
      if (Array.isArray(stepData.syllabus)) {
        console.error('❌ syllabus is an array! This will cause database errors:', stepData.syllabus);
        stepData.syllabus = stepData.syllabus.length > 0 ? stepData.syllabus[0] : null;
      }

      console.log('🔍 Pre-send validation - Step 1 data types:', {
        service_rules_type: stepData.service_rules === null ? 'null' : (stepData.service_rules instanceof File ? 'File' : typeof stepData.service_rules),
        service_rules_value: stepData.service_rules instanceof File ? `[File: ${stepData.service_rules.name}]` : stepData.service_rules,
        syllabus_type: stepData.syllabus === null ? 'null' : (stepData.syllabus instanceof File ? 'File' : typeof stepData.syllabus),
        syllabus_value: stepData.syllabus instanceof File ? `[File: ${stepData.syllabus.name}]` : stepData.syllabus,
      });
    }

    setLoading(true);
    try {
      // Step 1 uses FormData (for file uploads), Steps 2 & 3 use JSON
      const isStep1 = currentStepNumber === 1;

      let bodyContent;
      let headers = {
        'Authorization': `Bearer ${TOKEN}`,
        'X-API-KEY': API_KEY,
      };

      const numericFields = ['num_posts', 'quota_percentage', 'min_age', 'max_age', 'experience_length', 'relaxation_years'];

      if (isStep1) {
        // Step 1: Use FormData for file uploads
        const formDataToSend = new FormData();
        formDataToSend.append('step', currentStepNumber);
        formDataToSend.append('temp_id', tempId || '');

        Object.keys(stepData).forEach(key => {
          let value = stepData[key];

          // Defensive: Ensure service_rules and syllabus are never arrays
          if ((key === 'service_rules' || key === 'syllabus')) {
            if (Array.isArray(value)) {
              console.warn(`⚠️ ${key} is an array, converting to string:`, value);
              value = value.length > 0 ? value[0] : null;
            }

            // CRITICAL: Always send service_rules and syllabus, even if null
            // If it's a File, append it; if it's a string (existing file path), append it; if null, skip (don't upload)
            if (value instanceof File) {
              formDataToSend.append(key, value);
              console.log(`  ✅ ${key}: [File: ${value.name}]`);
            } else if (typeof value === 'string' && value !== '') {
              formDataToSend.append(key, value);
              console.log(`  ✅ ${key}: ${value} (existing file path)`);
            } else {
              // Don't append null/empty for files - backend will keep existing or set null
              console.log(`  ℹ️ ${key}: not provided (null/empty) - will use existing or null`);
            }
            return; // Skip the general handling below
          }

          if (value instanceof File) {
            formDataToSend.append(key, value);
          } else if (value !== null && value !== undefined && value !== '') {
            // Convert numeric fields to numbers
            if (numericFields.includes(key)) {
              const numValue = Number(value);
              if (!isNaN(numValue)) {
                formDataToSend.append(key, numValue);
              }
            } else {
              formDataToSend.append(key, value);
            }
          }
        });

        bodyContent = formDataToSend;

        // Log FormData contents
        console.log('📤 Sending Step 1 (FormData):');
        for (let [key, value] of formDataToSend.entries()) {
          console.log(`  ${key}:`, value instanceof File ? `[File: ${value.name}]` : value);
        }
      } else {
        // Steps 2 & 3: Use JSON
        headers['Content-Type'] = 'application/json';

        const jsonData = {
          step: currentStepNumber,
          temp_id: tempId || '',
        };

        Object.keys(stepData).forEach(key => {
          const value = stepData[key];

          if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
              // Filter out empty values from arrays
              const filteredArray = value.filter(item => item !== null && item !== undefined && item !== '');

              // Skip empty arrays
              if (filteredArray.length === 0) {
                return;
              }

              // Convert post array items to numbers (for Step 3)
              if (key === 'post') {
                jsonData[key] = filteredArray.map(item => {
                  const num = Number(item);
                  return !isNaN(num) ? num : item;
                });
              } else {
                jsonData[key] = filteredArray;
              }
            } else if (numericFields.includes(key)) {
              // Convert numeric fields to numbers
              const numValue = Number(value);
              jsonData[key] = !isNaN(numValue) ? numValue : value;
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
      console.log('📥 Response Headers:', {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
      });

      const contentType = response.headers.get('content-type') || '';
      let result;

      try {
        const responseText = await response.text();
        console.log('📥 Raw Response:', responseText.substring(0, 500));

        if (contentType.includes('application/json') || responseText.trim().startsWith('{')) {
          result = JSON.parse(responseText);
          console.log('📥 Parsed JSON Response:', result);
        } else {
          // Response is likely HTML (error page)
          console.error('❌ API returned non-JSON response:');
          console.error('Status:', response.status);
          console.error('Content-Type:', contentType);
          console.error('Response body (first 1000 chars):', responseText.substring(0, 1000));

          let errorMsg = 'Server returned HTML error page';
          if (response.status === 404) {
            errorMsg = 'API endpoint not found (404)';
          } else if (response.status === 500) {
            errorMsg = 'Server error (500). Check server logs for validation issues';
          } else if (response.status === 403) {
            errorMsg = 'Access forbidden (403). Check API key and authorization';
          } else if (response.status === 401) {
            errorMsg = 'Unauthorized (401). Check your authentication token';
          } else if (response.status === 422) {
            errorMsg = 'Validation error (422). Check the data being sent';
          }

          toast.error(`API Error: ${errorMsg}`);
          return false;
        }
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        toast.error('Failed to parse API response');
        return false;
      }

      if (result.success) {
        if (result.data?.temp_id) {
          setTempId(result.data.temp_id);
          console.log('✅ Got new temp_id:', result.data.temp_id);
        }
        const currentStepLabel = steps.find(step => step.number === activeStep)?.label || `Step ${currentStepNumber}`;
        toast.success(`${currentStepLabel} saved successfully`, {
          icon: <CheckCircle2 className="text-emerald-500" size={24} />,
          style: {
            fontWeight: '500',
          }
        });

        // Update form data
        const stepKey = `step${currentStepNumber}`;
        setFormData(prev => ({
          ...prev,
          [stepKey]: stepData
        }));

        return true;
      } else {
        // Handle API errors
        console.error('❌ API returned error:', result);

        let errorMsg = 'Failed to save step data';

        if (result.message) {
          errorMsg = result.message;
        } else if (result.error) {
          errorMsg = result.error;
        } else if (result.errors) {
          // Handle validation errors
          if (typeof result.errors === 'object') {
            const errorMessages = Object.values(result.errors).flat();
            errorMsg = errorMessages.join(', ');
          } else {
            errorMsg = result.errors;
          }
        }

        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving step:', error);
      toast.error('Error saving step data: ' + error.message);
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
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-3 px-5 rounded-t-lg text-center text-2xl font-bold">New Requisition Form</div>

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