import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TextField, MenuItem } from '@mui/material';
import { Briefcase, GraduationCap, UserCheck, FileText, ClipboardList } from 'lucide-react';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';
import './JobCreationForm.css';

const JobCreationForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    // Step 1: Job Information
    job_title: '',
    case_number: '',
    requisition_number: '',
    advertisement_number: '',
    advertisement_date: '',
    job_type: '',
    department: '',
    designation: '',
    grade_bps: '',
    number_of_posts: 1,
    vacant_post_detail: '',

    // Step 2: Ad HOC Post Details & Application Dates
    number_of_ad_hoc_posts: 0,
    ad_hoc_post_details: '',
    initial_appointment_date: '',
    date_of_last_extension: '',
    post_date: '',
    start_date: '',
    end_date: '',
    release_date: '',
    close_date: '',

    // Step 3: Eligibility Criteria
    min_age: 18,
    max_age: 40,
    age_relaxation: 0,
    age_relaxation_note: '',
    gender_eligibility: '',
    nationality: '',
    domicile: '',
    educational_requirement: [],
    medical_requirement: '',
    experience_requirement: [],
    other_requirement: '',
    dynamic_fields: '',

    // Step 4: Application and Exam Details
    examination_fee: '',
    payment_integration_psid: '',
    psid_expiry_date: '',
    payment_status: '',
    test_center_preference: [],
    test_date: '',
    interview_date: '',
    test_duration: '',
    syllabus_paper_pattern: '',

    // Step 5: Job Description Fields
    short_details: '',
    full_job_details: '',
    additional_information: '',
    notes_internal: '',
  });

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      if (name === 'test_center_preference[]') {
        const currentValues = formData.test_center_preference || [];
        setFormData(prev => ({
          ...prev,
          test_center_preference: checked
            ? [...currentValues, value]
            : currentValues.filter(v => v !== value)
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleMultiSelectChange = (e) => {
    const { name, options } = e.target;
    const values = Array.from(options)
      .filter(option => option.selected)
      .map(option => option.value);
    setFormData(prev => ({ ...prev, [name]: values }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep = (step) => {
    const stepErrors = {};

    // Step 1: Job Information Validation
    if (step === 1) {
      if (!formData.job_title || formData.job_title.trim() === '') {
        stepErrors.job_title = 'Job title is required';
      } else if (formData.job_title.length < 3) {
        stepErrors.job_title = 'Job title must be at least 3 characters';
      }

      if (!formData.case_number || formData.case_number.trim() === '') {
        stepErrors.case_number = 'Case number is required';
      } else if (!/^[A-Z0-9-]+$/i.test(formData.case_number)) {
        stepErrors.case_number = 'Case number should contain only letters, numbers, and hyphens';
      }

      if (!formData.requisition_number || formData.requisition_number.trim() === '') {
        stepErrors.requisition_number = 'Requisition number is required';
      } else if (!/^\d+$/.test(formData.requisition_number)) {
        stepErrors.requisition_number = 'Requisition number should contain only digits';
      }

      if (!formData.advertisement_number || formData.advertisement_number.trim() === '') {
        stepErrors.advertisement_number = 'Advertisement number is required';
      }

      if (!formData.advertisement_date) {
        stepErrors.advertisement_date = 'Advertisement date is required';
      } else {
        const advDate = new Date(formData.advertisement_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (advDate > today) {
          stepErrors.advertisement_date = 'Advertisement date cannot be in the future';
        }
      }

      if (!formData.job_type || formData.job_type.trim() === '') {
        stepErrors.job_type = 'Job type is required';
      }

      if (!formData.department || formData.department === '') {
        stepErrors.department = 'Please select a department';
      }

      if (!formData.designation || formData.designation === '') {
        stepErrors.designation = 'Please select a designation';
      }

      if (!formData.grade_bps || formData.grade_bps === '') {
        stepErrors.grade_bps = 'Please select a grade/BPS';
      }

      if (!formData.number_of_posts || formData.number_of_posts < 1) {
        stepErrors.number_of_posts = 'Number of posts must be at least 1';
      } else if (formData.number_of_posts > 1000) {
        stepErrors.number_of_posts = 'Number of posts cannot exceed 1000';
      }

      if (!formData.vacant_post_detail || formData.vacant_post_detail.trim() === '') {
        stepErrors.vacant_post_detail = 'Vacant post details are required';
      } else if (formData.vacant_post_detail.length < 10) {
        stepErrors.vacant_post_detail = 'Vacant post details must be at least 10 characters';
      }
    }

    // Step 2: Ad HOC Post Details Validation
    if (step === 2) {
      if (formData.number_of_ad_hoc_posts === undefined || formData.number_of_ad_hoc_posts === '') {
        stepErrors.number_of_ad_hoc_posts = 'Number of ad hoc posts is required';
      } else if (formData.number_of_ad_hoc_posts < 0) {
        stepErrors.number_of_ad_hoc_posts = 'Number of ad hoc posts cannot be negative';
      }

      if (formData.number_of_ad_hoc_posts > 0) {
        if (!formData.ad_hoc_post_details || formData.ad_hoc_post_details.trim() === '') {
          stepErrors.ad_hoc_post_details = 'Ad hoc post details are required when ad hoc posts are specified';
        }
      }

      if (!formData.initial_appointment_date) {
        stepErrors.initial_appointment_date = 'Initial appointment date is required';
      }

      if (!formData.date_of_last_extension) {
        stepErrors.date_of_last_extension = 'Date of last extension is required';
      }

      if (!formData.post_date) {
        stepErrors.post_date = 'Post date is required';
      }

      if (!formData.start_date) {
        stepErrors.start_date = 'Start date is required';
      }

      if (!formData.end_date) {
        stepErrors.end_date = 'End date is required';
      } else if (formData.start_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
        stepErrors.end_date = 'End date must be after start date';
      }

      if (!formData.release_date) {
        stepErrors.release_date = 'Release date is required';
      }

      if (!formData.close_date) {
        stepErrors.close_date = 'Close date is required';
      } else if (formData.release_date && new Date(formData.close_date) <= new Date(formData.release_date)) {
        stepErrors.close_date = 'Close date must be after release date';
      }
    }

    // Step 3: Eligibility Criteria Validation
    if (step === 3) {
      if (!formData.min_age || formData.min_age < 18) {
        stepErrors.min_age = 'Minimum age must be at least 18 years';
      } else if (formData.min_age > 100) {
        stepErrors.min_age = 'Minimum age cannot exceed 100 years';
      }

      if (!formData.max_age || formData.max_age < 18) {
        stepErrors.max_age = 'Maximum age must be at least 18 years';
      } else if (formData.max_age > 100) {
        stepErrors.max_age = 'Maximum age cannot exceed 100 years';
      } else if (formData.min_age && formData.max_age <= formData.min_age) {
        stepErrors.max_age = 'Maximum age must be greater than minimum age';
      }

      if (formData.age_relaxation === undefined || formData.age_relaxation === '') {
        stepErrors.age_relaxation = 'Age relaxation is required (enter 0 if none)';
      } else if (formData.age_relaxation < 0) {
        stepErrors.age_relaxation = 'Age relaxation cannot be negative';
      }

      if (!formData.age_relaxation_note || formData.age_relaxation_note.trim() === '') {
        stepErrors.age_relaxation_note = 'Age relaxation note is required';
      }

      if (!formData.gender_eligibility || formData.gender_eligibility === '') {
        stepErrors.gender_eligibility = 'Please select gender eligibility';
      }

      if (!formData.nationality || formData.nationality.trim() === '') {
        stepErrors.nationality = 'Nationality is required';
      }

      if (!formData.domicile || formData.domicile.trim() === '') {
        stepErrors.domicile = 'Domicile is required';
      }

      if (!formData.educational_requirement || formData.educational_requirement.length === 0) {
        stepErrors.educational_requirement = 'At least one educational requirement must be selected';
      }

      if (!formData.medical_requirement || formData.medical_requirement.trim() === '') {
        stepErrors.medical_requirement = 'Medical requirement is required';
      }

      if (!formData.experience_requirement || formData.experience_requirement.length === 0) {
        stepErrors.experience_requirement = 'At least one experience requirement must be specified';
      }

      if (!formData.other_requirement || formData.other_requirement.trim() === '') {
        stepErrors.other_requirement = 'Other requirements field is required (enter "None" if not applicable)';
      }

      if (!formData.dynamic_fields || formData.dynamic_fields.trim() === '') {
        stepErrors.dynamic_fields = 'Dynamic fields information is required';
      }
    }

    // Step 4: Application and Exam Details Validation
    if (step === 4) {
      if (!formData.examination_fee || formData.examination_fee.trim() === '') {
        stepErrors.examination_fee = 'Examination fee is required';
      } else if (isNaN(formData.examination_fee) || parseFloat(formData.examination_fee) < 0) {
        stepErrors.examination_fee = 'Examination fee must be a valid positive number';
      }

      if (!formData.payment_integration_psid || formData.payment_integration_psid.trim() === '') {
        stepErrors.payment_integration_psid = 'Payment integration PSID is required';
      }

      if (!formData.psid_expiry_date) {
        stepErrors.psid_expiry_date = 'PSID expiry date is required';
      } else {
        const expiryDate = new Date(formData.psid_expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          stepErrors.psid_expiry_date = 'PSID expiry date must be in the future';
        }
      }

      if (!formData.payment_status || formData.payment_status === '') {
        stepErrors.payment_status = 'Please select payment status';
      }

      if (!formData.test_center_preference || formData.test_center_preference.length === 0) {
        stepErrors.test_center_preference = 'At least one test center must be selected';
      }

      if (!formData.test_date) {
        stepErrors.test_date = 'Test date is required';
      } else {
        const testDate = new Date(formData.test_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (testDate < today) {
          stepErrors.test_date = 'Test date must be in the future';
        }
      }

      if (!formData.interview_date) {
        stepErrors.interview_date = 'Interview date is required';
      } else if (formData.test_date && new Date(formData.interview_date) < new Date(formData.test_date)) {
        stepErrors.interview_date = 'Interview date must be on or after test date';
      }

      if (!formData.test_duration || formData.test_duration.trim() === '') {
        stepErrors.test_duration = 'Test duration is required';
      }

      if (!formData.syllabus_paper_pattern || formData.syllabus_paper_pattern.trim() === '') {
        stepErrors.syllabus_paper_pattern = 'Syllabus and paper pattern details are required';
      } else if (formData.syllabus_paper_pattern.length < 20) {
        stepErrors.syllabus_paper_pattern = 'Syllabus and paper pattern must be at least 20 characters';
      }
    }

    // Step 5: Job Description Fields Validation
    if (step === 5) {
      if (!formData.short_details || formData.short_details.trim() === '') {
        stepErrors.short_details = 'Short details are required';
      } else if (formData.short_details.length < 20) {
        stepErrors.short_details = 'Short details must be at least 20 characters';
      } else if (formData.short_details.length > 200) {
        stepErrors.short_details = 'Short details cannot exceed 200 characters';
      }

      if (!formData.full_job_details || formData.full_job_details.trim() === '') {
        stepErrors.full_job_details = 'Full job details are required';
      } else if (formData.full_job_details.length < 50) {
        stepErrors.full_job_details = 'Full job details must be at least 50 characters';
      }

      if (!formData.additional_information || formData.additional_information.trim() === '') {
        stepErrors.additional_information = 'Additional information is required (enter "None" if not applicable)';
      }

      if (!formData.notes_internal || formData.notes_internal.trim() === '') {
        stepErrors.notes_internal = 'Internal notes are required';
      } else if (formData.notes_internal.length < 10) {
        stepErrors.notes_internal = 'Internal notes must be at least 10 characters';
      }
    }

    return stepErrors;
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      
      // Show individual toast for each error with delay
      Object.entries(stepErrors).forEach(([field, errorMessage], index) => {
        setTimeout(() => {
          toast.error(errorMessage, {
            duration: 4000,
            id: `error-${field}`, // Prevent duplicate toasts
          });
        }, index * 150); // Stagger the toasts
      });
      
      // Scroll to first error
      setTimeout(() => {
        const firstErrorField = document.querySelector('.is-invalid');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorField.focus();
        }
      }, 100);
      return;
    }
    
    // Clear errors and move to next step
    setErrors({});
    setCurrentStep(prev => prev + 1);
    toast.success(`Step ${currentStep} completed successfully!`, {
      icon: '✅',
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    setErrors({});
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate current step (Step 5)
    const stepErrors = validateStep(5);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      
      // Show individual toast for each error with delay
      Object.entries(stepErrors).forEach(([field, errorMessage], index) => {
        setTimeout(() => {
          toast.error(errorMessage, {
            duration: 2000,
            id: `error-${field}`, // Prevent duplicate toasts
          });
        }, index * 150); // Stagger the toasts
      });
      
      // Scroll to first error
      setTimeout(() => {
        const firstErrorField = document.querySelector('.is-invalid');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorField.focus();
        }
      }, 100);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating job posting...');
    
    try {
      const response = await fetch(`${Config.apiUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 422 && result.errors) {
          setErrors(result.errors);
          const errorMessages = Object.values(result.errors).flat().join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(result.message || 'Failed to create job');
      }

      toast.success('Job created successfully!', { id: loadingToast });
      setTimeout(() => navigate('/dashboard/job-list'), 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to create job', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, icon: Briefcase, label: 'Job Information' },
    { number: 2, icon: GraduationCap, label: 'Ad HOC Post Details' },
    { number: 3, icon: UserCheck, label: 'Eligibility Criteria' },
    { number: 4, icon: FileText, label: 'Application and Exam Details' },
    { number: 5, icon: ClipboardList, label: 'Job Description Fields' },
  ];

  return (
    <div className="job-creation-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-3 px-5 rounded-t-lg text-center text-2xl font-bold">Job Creation Form</div>

        {/* Step Progress */}
        <div className={`step-progress active-${currentStep}`}>
          {steps.map(step => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.number}
                className={`step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
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

        <form onSubmit={handleSubmit}>
          {/* Step 1: Job Information */}
          {currentStep === 1 && (
            <div className="form-step active">
              <div className="row">
                <FormField
                  label="Job Title"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  error={errors.job_title}
                  required
                />
                <FormField
                  label="Case Number"
                  name="case_number"
                  value={formData.case_number}
                  onChange={handleChange}
                  error={errors.case_number}
                  required
                />
                <FormField
                  label="Requisition Number"
                  name="requisition_number"
                  value={formData.requisition_number}
                  onChange={handleChange}
                  error={errors.requisition_number}
                  required
                />
                <FormField
                  label="Advertisement Number"
                  name="advertisement_number"
                  value={formData.advertisement_number}
                  onChange={handleChange}
                  error={errors.advertisement_number}
                  required
                />
                <FormField
                  label="Advertisement Date"
                  name="advertisement_date"
                  type="date"
                  value={formData.advertisement_date}
                  onChange={handleChange}
                  error={errors.advertisement_date}
                  required
                />
                <FormField
                  label="Job Type"
                  name="job_type"
                  value={formData.job_type}
                  onChange={handleChange}
                  error={errors.job_type}
                  required
                />
                <SelectField
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  error={errors.department}
                  options={[
                    { value: '', label: 'Select Department' },
                    { value: 'Education', label: 'Education' },
                    { value: 'Health', label: 'Health' },
                    { value: 'Administration', label: 'Administration' },
                    { value: 'Information Technology Board', label: 'Information Technology Board' },
                  ]}
                  required
                />
                <SelectField
                  label="Designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  error={errors.designation}
                  options={[
                    { value: '', label: 'Select Designation' },
                    { value: 'Officer', label: 'Officer' },
                    { value: 'Assistant Director', label: 'Assistant Director' },
                    { value: 'Clerk', label: 'Clerk' },
                    { value: 'Supervisor', label: 'Supervisor' },
                  ]}
                  required
                />
                <SelectField
                  label="Grade BPS"
                  name="grade_bps"
                  value={formData.grade_bps}
                  onChange={handleChange}
                  error={errors.grade_bps}
                  options={[
                    { value: '', label: 'Select Grade' },
                    { value: 'BPS-16', label: 'BPS-16' },
                    { value: 'BPS-17', label: 'BPS-17' },
                    { value: 'BPS-18', label: 'BPS-18' },
                  ]}
                  required
                />
                <FormField
                  label="Number of Posts"
                  name="number_of_posts"
                  type="number"
                  value={formData.number_of_posts}
                  onChange={handleChange}
                  error={errors.number_of_posts}
                  required
                />
                <TextAreaField
                  label="Vacant Post Detail"
                  name="vacant_post_detail"
                  value={formData.vacant_post_detail}
                  onChange={handleChange}
                  error={errors.vacant_post_detail}
                  required
                />
              </div>
              <div className="navigation-buttons">
                <div></div>
                <button type="button" className="btn btn-next" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {/* Step 2: Ad HOC Post Details */}
          {currentStep === 2 && (
            <div className="form-step active">
              <h6 className="section-title">Ad HOC Post Details</h6>
              <div className="row">
                <FormField
                  label="Number of Ad HOC Posts"
                  name="number_of_ad_hoc_posts"
                  type="number"
                  value={formData.number_of_ad_hoc_posts}
                  onChange={handleChange}
                  error={errors.number_of_ad_hoc_posts}
                  required
                />
                <TextAreaField
                  label="Ad HOC Post Details"
                  name="ad_hoc_post_details"
                  value={formData.ad_hoc_post_details}
                  onChange={handleChange}
                  error={errors.ad_hoc_post_details}
                  required
                />
                <FormField
                  label="Initial Appointment Date"
                  name="initial_appointment_date"
                  type="date"
                  value={formData.initial_appointment_date}
                  onChange={handleChange}
                  error={errors.initial_appointment_date}
                  required
                />
                <FormField
                  label="Date Of Last Extension"
                  name="date_of_last_extension"
                  type="date"
                  value={formData.date_of_last_extension}
                  onChange={handleChange}
                  error={errors.date_of_last_extension}
                  required
                />
              </div>

              <h6 className="section-title">Application Dates</h6>
              <div className="row">
                <FormField
                  label="Post Date (Creation Date)"
                  name="post_date"
                  type="date"
                  value={formData.post_date}
                  onChange={handleChange}
                  error={errors.post_date}
                  required
                />
                <FormField
                  label="Apply Start Date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  error={errors.start_date}
                  required
                />
                <FormField
                  label="Apply End Date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  error={errors.end_date}
                  required
                />
                <FormField
                  label="Press Release Date"
                  name="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={handleChange}
                  error={errors.release_date}
                  required
                />
                <FormField
                  label="Close Job Date"
                  name="close_date"
                  type="date"
                  value={formData.close_date}
                  onChange={handleChange}
                  error={errors.close_date}
                  required
                />
              </div>
              <div className="navigation-buttons">
                <button type="button" className="btn btn-prev" onClick={handlePrevious}>Previous</button>
                <button type="button" className="btn btn-next" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {/* Step 3: Eligibility Criteria */}
          {currentStep === 3 && (
            <div className="form-step active">
              <div className="row">
                <FormField
                  label="Min Age"
                  name="min_age"
                  type="number"
                  value={formData.min_age}
                  onChange={handleChange}
                  error={errors.min_age}
                  required
                />
                <FormField
                  label="Max Age"
                  name="max_age"
                  type="number"
                  value={formData.max_age}
                  onChange={handleChange}
                  error={errors.max_age}
                  required
                />
                <FormField
                  label="Age Relaxation"
                  name="age_relaxation"
                  type="number"
                  value={formData.age_relaxation}
                  onChange={handleChange}
                  error={errors.age_relaxation}
                  required
                />
                <FormField
                  label="Age Relaxation Note"
                  name="age_relaxation_note"
                  value={formData.age_relaxation_note}
                  onChange={handleChange}
                  error={errors.age_relaxation_note}
                  required
                />
                <div className="col-md-6 form-group">
                  <label>Gender Eligibility <span className="required">*</span></label>
                  <div className="radio-group">
                    <label>
                      <input
                        type="radio"
                        name="gender_eligibility"
                        value="Male"
                        checked={formData.gender_eligibility === 'Male'}
                        onChange={handleChange}
                      /> Male
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="gender_eligibility"
                        value="Female"
                        checked={formData.gender_eligibility === 'Female'}
                        onChange={handleChange}
                      /> Female
                    </label>
                  </div>
                  {errors.gender_eligibility && <div className="invalid-feedback d-block">{errors.gender_eligibility}</div>}
                </div>
                <FormField
                  label="Nationality"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  error={errors.nationality}
                  required
                />
                <SelectField
                  label="Domicile"
                  name="domicile"
                  value={formData.domicile}
                  onChange={handleChange}
                  error={errors.domicile}
                  options={[
                    { value: '', label: 'Select Domicile' },
                    { value: 'Muzaffarabad', label: 'Muzaffarabad' },
                    { value: 'Mirpur', label: 'Mirpur' },
                    { value: 'Kotli', label: 'Kotli' },
                    { value: 'Punjab', label: 'Punjab' },
                    { value: 'Sindh', label: 'Sindh' },
                    { value: 'KPK', label: 'KPK' },
                    { value: 'Balochistan', label: 'Balochistan' },
                  ]}
                  required
                />
                <div className="col-md-6 form-group">
                  <label>Educational Requirement <span className="required">*</span></label>
                  <select
                    className="form-select"
                    name="educational_requirement"
                    multiple
                    value={formData.educational_requirement}
                    onChange={handleMultiSelectChange}
                  >
                    <option value="Matric">Matric</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Bachelor">Bachelor</option>
                    <option value="Master">Master</option>
                    <option value="BS (4 years)">BS (4 years)</option>
                  </select>
                  {errors.educational_requirement && <div className="invalid-feedback d-block">{errors.educational_requirement}</div>}
                </div>
                <FormField
                  label="Medical Requirement"
                  name="medical_requirement"
                  value={formData.medical_requirement}
                  onChange={handleChange}
                  error={errors.medical_requirement}
                  required
                />
                <div className="col-md-6 form-group">
                  <label>Experience Requirement <span className="required">*</span></label>
                  <select
                    className="form-select"
                    name="experience_requirement"
                    multiple
                    value={formData.experience_requirement}
                    onChange={handleMultiSelectChange}
                  >
                    <option value="1-2 Years">1-2 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                    <option value="02 years post-qualification">02 years post-qualification</option>
                  </select>
                  {errors.experience_requirement && <div className="invalid-feedback d-block">{errors.experience_requirement}</div>}
                </div>
                <FormField
                  label="Other Requirement"
                  name="other_requirement"
                  value={formData.other_requirement}
                  onChange={handleChange}
                  error={errors.other_requirement}
                  required
                />
                <FormField
                  label="Dynamic Fields"
                  name="dynamic_fields"
                  value={formData.dynamic_fields}
                  onChange={handleChange}
                  error={errors.dynamic_fields}
                  placeholder="Quota: Merit, Reserved, etc."
                  required
                />
              </div>
              <div className="navigation-buttons">
                <button type="button" className="btn btn-prev" onClick={handlePrevious}>Previous</button>
                <button type="button" className="btn btn-next" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {/* Step 4: Application and Exam Details */}
          {currentStep === 4 && (
            <div className="form-step active">
              <div className="row">
                <FormField
                  label="Examination Fee"
                  name="examination_fee"
                  type="number"
                  value={formData.examination_fee}
                  onChange={handleChange}
                  error={errors.examination_fee}
                  required
                />
                <FormField
                  label="Payment Integration (PSID)"
                  name="payment_integration_psid"
                  value={formData.payment_integration_psid}
                  onChange={handleChange}
                  error={errors.payment_integration_psid}
                />
                <FormField
                  label="PSID Expiry Date"
                  name="psid_expiry_date"
                  type="date"
                  value={formData.psid_expiry_date}
                  onChange={handleChange}
                  error={errors.psid_expiry_date}
                  required
                />
                <SelectField
                  label="Payment Status"
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleChange}
                  error={errors.payment_status}
                  options={[
                    { value: '', label: 'Select Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Failed', label: 'Failed' },
                  ]}
                  required
                />
                <div className="col-md-6 form-group">
                  <label>Test Center Preference <span className="required">*</span></label>
                  <div className="checkbox-group">
                    {['Muzaffarabad', 'Mirpur', 'Islamabad', 'Lahore', 'Karachi', 'Peshawar', 'Quetta'].map(center => (
                      <label key={center}>
                        <input
                          type="checkbox"
                          name="test_center_preference[]"
                          value={center}
                          checked={formData.test_center_preference.includes(center)}
                          onChange={handleChange}
                        /> {center}
                      </label>
                    ))}
                  </div>
                  {errors.test_center_preference && <div className="invalid-feedback d-block">{errors.test_center_preference}</div>}
                </div>
                <FormField
                  label="Test Date"
                  name="test_date"
                  type="date"
                  value={formData.test_date}
                  onChange={handleChange}
                  error={errors.test_date}
                  required
                />
                <FormField
                  label="Interview Date"
                  name="interview_date"
                  type="date"
                  value={formData.interview_date}
                  onChange={handleChange}
                  error={errors.interview_date}
                  required
                />
                <FormField
                  label="Test Duration"
                  name="test_duration"
                  value={formData.test_duration}
                  onChange={handleChange}
                  error={errors.test_duration}
                  placeholder="e.g., 180 minutes"
                  required
                />
                <FormField
                  label="Syllabus/Paper Pattern"
                  name="syllabus_paper_pattern"
                  value={formData.syllabus_paper_pattern}
                  onChange={handleChange}
                  error={errors.syllabus_paper_pattern}
                  required
                />
              </div>
              <div className="navigation-buttons">
                <button type="button" className="btn btn-prev" onClick={handlePrevious}>Previous</button>
                <button type="button" className="btn btn-next" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {/* Step 5: Job Description Fields */}
          {currentStep === 5 && (
            <div className="form-step active">
              <div className="row">
                <TextAreaField
                  label="Short Details"
                  name="short_details"
                  value={formData.short_details}
                  onChange={handleChange}
                  error={errors.short_details}
                  required
                />
                <TextAreaField
                  label="Full Job Details"
                  name="full_job_details"
                  value={formData.full_job_details}
                  onChange={handleChange}
                  error={errors.full_job_details}
                  required
                />
                <TextAreaField
                  label="Additional Information"
                  name="additional_information"
                  value={formData.additional_information}
                  onChange={handleChange}
                  error={errors.additional_information}
                  required
                />
                <TextAreaField
                  label="Notes (Internal)"
                  name="notes_internal"
                  value={formData.notes_internal}
                  onChange={handleChange}
                  error={errors.notes_internal}
                  required
                />
              </div>
              <div className="navigation-buttons">
                <button type="button" className="btn btn-prev" onClick={handlePrevious}>Previous</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

// Helper Components
const FormField = ({ label, name, type = 'text', value, onChange, error, required, placeholder }) => (
  <div className="col-md-6 form-group">
    <TextField
      fullWidth
      label={label}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      error={!!error}
      helperText={error}
      InputLabelProps={type === 'date' || type === 'time' ? { shrink: true } : undefined}
    />
  </div>
);

const TextAreaField = ({ label, name, value, onChange, error, required }) => (
  <div className="col-md-6 form-group">
    <TextField
      fullWidth
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      error={!!error}
      helperText={error}
      multiline
      rows={3}
    />
  </div>
);

const SelectField = ({ label, name, value, onChange, error, options, required }) => (
  <div className="col-md-6 form-group">
    <TextField
      select
      fullWidth
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      error={!!error}
      helperText={error}
    >
      {options.map(opt => (
        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
      ))}
    </TextField>
  </div>
);

export default JobCreationForm;
