import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InlineLoader } from 'components/ui/Loader';
import { Briefcase, GraduationCap, UserCheck, CheckCircle2 } from 'lucide-react';
import Step1JobDetails from './Steps/Step1JobDetails';
import Step2Criteria from './Steps/Step2Criteria';
import Step3Eligibility from './Steps/Step3Eligibility';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import RequisitionApi from 'api/requisitionApi';
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
  const [districtOptions, setDistrictOptions] = useState([]);
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
    fetchDistricts();
    loadRequisitionData();
  }, [id]);

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

  const loadRequisitionData = async () => {
    setLoading(true);
    console.log('📝 Loading requisition data for edit, ID:', id);

    try {
      const result = await RequisitionApi.getForEdit(id);
      console.log('📥 Edit API Response:', result);

      if (result.success && result.data && result.data.requisition) {
        const req = result.data.requisition;
        console.log('✅ Requisition data loaded:', req);

        let serviceRules = req.service_rules || null;
        let syllabus = req.syllabus || null;

        if (Array.isArray(serviceRules)) {
          serviceRules = serviceRules.length > 0 ? serviceRules[0] : null;
        }
        if (Array.isArray(syllabus)) {
          syllabus = syllabus.length > 0 ? syllabus[0] : null;
        }

        setFormData({
          step1: {
            designation:               req.designation || '',
            scale:                     req.scale || '',
            direct_quota_percentage:   req.direct_quota_percentage   ?? req.quota_percentage ?? '',
            district_quota_percentage: req.district_quota_percentage ?? '',
            department_id:             req.department_id || req.department?.hash_id || req.department?.id || '',
            quota_percentage:          req.quota_percentage_id || req.quotaPercentage?.hash_id || req.quotaPercentage?.id || req.quota_percentage || '',
            quota_promotion:           req.quota_promotion || '',
            num_posts:                 req.num_posts || 1,
            vacancy_date:              req.vacancy_date || '',
            test_type:                 req.test_type || '',
            service_rules:             serviceRules,
            syllabus:                  syllabus,
          },
          step2: {
            academic_qualification:   req.qualification?.academic_qualification || '',
            equivalent_qualification: req.qualification?.equivalent_qualification || '',
            authority_certificate:    req.qualification?.authority_certificate || '',
            degree_equivalence:       req.qualification?.degree_equivalence || '',
            any_other_qualification:  req.qualification?.any_other_qualification || '',
            training_institute:       req.qualification?.training_institute || '',
            experience_type:          req.qualification?.experience_type || '',
            experience_length:        req.qualification?.experience_length || 0,
            min_qualification:        req.qualification?.min_qualification || '',
            eligible_degrees:         req.qualification?.degree_equivalence || '',
          },
          step3: {
            min_age:           req.eligibility?.min_age || 18,
            max_age:           req.eligibility?.max_age || 40,
            age_relaxation:    req.eligibility?.age_relaxation || '',
            relaxation_reason: req.eligibility?.relaxation_reason || '',
            relaxation_years:  req.eligibility?.relaxation_years || '',
            nationality:       req.eligibility?.nationality || '',
            domicile:          req.eligibility?.domicile || '',
            other_conditions:  req.eligibility?.other_conditions || '',
            gender_basis:      req.eligibility?.gender_basis || '',
            merit_type:        req.eligibility?.merit_type || '',
            selection_mode:    req.eligibility?.merit_type || 'quota_based',
            district:          req.multiple_posts?.map(p => p.district) || [''],
            quota:             req.multiple_posts?.map(p => p.quota)    || [''],
            post:              req.multiple_posts?.map(p => p.post)     || [''],
          }
        });

        console.log('✅ Form data set successfully');
      } else {
        const errorMsg = result.message || result.error || 'Failed to load requisition data';
        console.error('❌ Edit load failed:', errorMsg);
        toast.error(errorMsg);
        navigate('/dashboard/requisitions');
      }
    } catch (error) {
      console.error('❌ Error loading requisition:', error);
      toast.error('Error loading requisition data: ' + error.message);
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
      // v2.2.0 — live API uses `quota_percentage` (labelled "Direct
      // Quota" in the UI) and `quota_promotion` (labelled
      // "Promotion Quota"). The old `direct_quota_percentage` /
      // `district_quota_percentage` aliases are NOT sent in the
      // wire format anymore — checking them caused the
      // "Direct/District quota percentage is required" false
      // positive that blocked the live edit form from saving.
      if (data.quota_percentage === '' || data.quota_percentage === undefined || data.quota_percentage === null)
        errors.quota_percentage = 'Direct quota percentage is required';
      if (data.quota_promotion === '' || data.quota_promotion === undefined || data.quota_promotion === null)
        errors.quota_promotion = 'Promotion quota percentage is required';
      if (!data.num_posts || data.num_posts < 1) errors.num_posts = 'Number of posts is required';
      if (!data.vacancy_date?.trim()) errors.vacancy_date = 'Vacancy date is required';
    } else if (step === 1) {
      if (!data.academic_qualification) errors.academic_qualification = 'Academic qualification is required';
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
        endpoint = `${API_BASE}/requisitions/${id}/update-job`;

        // The live API's `update-job` route is `Route::put(...)` and
        // Postman proves it accepts a real PUT with a JSON body
        // (returns `{"success": true, ...}`). The frontend must
        // mirror Postman exactly: send a real `PUT` with
        // `Content-Type: application/json` and a JSON body.
        //
        // For file uploads (service_rules / syllabus PDFs) we fall
        // back to multipart POST with `_method=PUT` spoofing —
        // because real PUT multipart requests with a real file are
        // awkward, and the `_method=PUT` form-data pattern is what
        // Laravel's RequisitionForm create path uses successfully.
        const hasFile =
          stepData.service_rules instanceof File ||
          stepData.syllabus instanceof File;

        if (hasFile) {
          const formDataToSend = new FormData();
          formDataToSend.append('_method', 'PUT');
          Object.keys(stepData).forEach((key) => {
            let value = stepData[key];
            if (
              (key === 'service_rules' || key === 'syllabus') &&
              Array.isArray(value)
            ) {
              value = value.length > 0 ? value[0] : null;
            }
            if (value instanceof File) {
              formDataToSend.append(key, value);
            } else if (value !== null && value !== undefined && value !== '') {
              formDataToSend.append(key, value);
            }
          });
          body = formDataToSend;
          method = 'POST'; // multipart needs POST + `_method=PUT` spoof
        } else {
          // Mirror Postman: real PUT, JSON body.
          //
          // The `service_rules` and `syllabus` fields have a `file`
          // validator on the live API side. If we send the existing
          // file path string (e.g. "uploads/service_rules/...
          // .pdf") Laravel returns a 422: "The service rules field
          // must be a file." The user keeps the previously-uploaded
          // PDF by doing nothing — we must OMIT these fields from
          // the JSON body so Laravel leaves the existing file
          // untouched (the column is nullable and skipping the
          // field leaves it as-is on the server).
          const FILE_FIELDS = new Set(['service_rules', 'syllabus']);
          const jsonBody = {};
          Object.keys(stepData).forEach((key) => {
            const value = stepData[key];
            if (value === null || value === undefined || value === '') return;
            if (value instanceof File) return;            // sent via multipart
            if (FILE_FIELDS.has(key)) return;            // skip path strings
            jsonBody[key] = value;
          });
          body = JSON.stringify(jsonBody);
          method = 'PUT';
        }
      } else if (currentStepNumber === 2) {
        endpoint = `${API_BASE}/requisitions/${id}/update/criteria`;
        body = JSON.stringify(stepData);
      } else if (currentStepNumber === 3) {
        endpoint = `${API_BASE}/requisitions/${id}/update-eligibility`;
        body = JSON.stringify(stepData);
      }

      const headers = {
        'Authorization': `Bearer ${TOKEN}`,
        'X-API-KEY': API_KEY,
        'Accept': 'application/json',
      };
      if (!(body instanceof FormData)) {
        // Real PUT for Step 1 (no file) and Steps 2/3 use JSON.
        headers['Content-Type'] = 'application/json';
      }

      console.log('📤 Sending update to:', endpoint, '| Method:', method);

      const response = await fetch(endpoint, {
        method: method,
        headers: headers,
        body: body,
      });

      console.log('📥 Response status:', response.status, response.statusText);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Non-JSON response:', textResponse.substring(0, 500));

        let errorMessage = '';
        if (response.status === 404)      errorMessage = `Endpoint not found (404): ${endpoint}`;
        else if (response.status === 500) errorMessage = `Server error (500): ${endpoint}`;
        else if (response.status === 405) errorMessage = `Method not allowed (405): ${method} ${endpoint}`;
        else                              errorMessage = `Server returned ${response.status}: Expected JSON but got ${contentType}`;

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('📥 Update response:', result);

      if (result.success || response.ok) {
        toast.success(`${steps[activeStep].label} updated successfully`, {
          icon: <CheckCircle2 className="text-emerald-500" size={24} />,
          style: { fontWeight: '500' }
        });
        setFormData(prev => ({ ...prev, [`step${currentStepNumber}`]: stepData }));
        return true;
      } else {
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
        // Final step on the Edit page — toast then go back to
        // the requisitions list so the user can pick the next
        // requisition to edit / review. The live preview endpoint
        // only accepts TempRequisition draft ids and the
        // RequisitionDetail page is one click away from the list
        // anyway, so the list is the natural post-Edit landing.
        toast.success('Requisition updated successfully!');
        setTimeout(() => navigate('/dashboard/requisitions'), 1000);
      } else {
        setActiveStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const renderStepContent = () => {
    if (loading) return <InlineLoader text="Loading form data..." variant="ring" size="lg" />;

    switch (activeStep) {
      case 0:
        return <Step1JobDetails data={formData.step1} onNext={handleNext} isEdit={true} />;
      case 1:
        return <Step2Criteria data={formData.step2} onNext={handleNext} onBack={handleBack} />;
      case 2:
        return (
          <Step3Eligibility
            data={formData.step3}
            onNext={handleNext}
            onBack={handleBack}
            isEdit={true}
            districtOptions={districtOptions}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="requisition-form-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-3 px-5 rounded-t-lg text-center text-2xl font-bold">
          Edit Requisition - ID: #{id}
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

export default RequisitionEdit;