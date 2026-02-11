import { useState, useEffect } from 'react';
import Config from 'config/baseUrl';
import Step1 from './Steps/Step1';
import Step2 from './Steps/Step2';
import Step3 from './Steps/Step3';
import Step4 from './Steps/Step4';
import Step5 from './Steps/Step5';

const initial = {
  // Step1 - Job Information
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

  // Step2 - Ad HOC
  number_of_ad_hoc_posts: 0,
  ad_hoc_post_details: '',
  initial_appointment_date: '',
  date_of_last_extension: '',
  post_date: '',
  start_date: '',
  end_date: '',
  release_date: '',
  close_date: '',

  // Step3 - Eligibility
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

  // Step4 - Application & Exam
  examination_fee: '',
  payment_integration_psid: '',
  psid_expiry_date: '',
  payment_status: '',
  test_center_preference: [],
  test_date: '',
  interview_date: '',
  test_duration: '',
  syllabus_paper_pattern: '',

  // Step5 - Job Description
  short_details: '',
  full_job_details: '',
  additional_information: '',
  notes_internal: '',
};

export default function JobCreation() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const API = Config.apiUrl;

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const change = (e) => {
    const { name, value, type, checked, options } = e.target;
    
    if (type === 'checkbox') {
      // Handle checkbox array for test_center_preference
      const current = [...(data[name] || [])];
      if (checked) {
        current.push(value);
      } else {
        const index = current.indexOf(value);
        if (index > -1) {
          current.splice(index, 1);
        }
      }
      setData(s => ({ ...s, [name]: current }));
      return;
    }
    
    if (type === 'select-multiple') {
      const selectedValues = Array.from(options)
        .filter(option => option.selected)
        .map(option => option.value);
      setData(s => ({ ...s, [name]: selectedValues }));
      return;
    }
    
    if (type === 'radio') {
      setData(s => ({ ...s, [name]: value }));
      return;
    }
    
    setData(s => ({ ...s, [name]: value }));
    setErrors(s => ({ ...s, [name]: null }));
  };

  const validate = (currStep = step) => {
    const e = {};
    if (currStep === 1) {
      if (!data.job_title) e.job_title = 'Required';
      if (!data.case_number) e.case_number = 'Required';
      if (!data.requisition_number) e.requisition_number = 'Required';
      if (!data.advertisement_number) e.advertisement_number = 'Required';
      if (!data.advertisement_date) e.advertisement_date = 'Required';
      if (!data.department) e.department = 'Required';
      if (!data.designation) e.designation = 'Required';
      if (!data.grade_bps) e.grade_bps = 'Required';
      if (!data.number_of_posts || Number(data.number_of_posts) < 1) e.number_of_posts = 'At least 1';
    }
    if (currStep === 2) {
      if (!data.post_date) e.post_date = 'Required';
      if (!data.start_date) e.start_date = 'Required';
      if (!data.end_date) e.end_date = 'Required';
    }
    if (currStep === 3) {
      if (!data.gender_eligibility) e.gender_eligibility = 'Select gender';
      if (!data.educational_requirement || data.educational_requirement.length === 0) e.educational_requirement = 'Select at least one';
    }
    if (currStep === 4) {
      if (!data.examination_fee) e.examination_fee = 'Required';
      if (!data.test_date) e.test_date = 'Required';
    }
    if (currStep === 5) {
      if (!data.short_details) e.short_details = 'Required';
      if (!data.full_job_details) e.full_job_details = 'Required';
    }
    return e;
  };

  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length) {
      setErrors(e); 
      setMessage({ type: 'error', text: 'Please fix errors on this step' }); 
      return;
    }
    setStep(s => Math.min(5, s + 1));
  };
  
  const prev = () => setStep(s => Math.max(1, s - 1));

  const submit = async (ev) => {
    ev.preventDefault();
    
    // Final validation
    const e = validate(5);
    if (Object.keys(e).length) { 
      setErrors(e); 
      setMessage({ type: 'error', text: 'Please fix all errors before submitting' }); 
      return; 
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      // Prepare data according to your API structure
      const submissionData = {
        job_title: data.job_title,
        case_number: data.case_number,
        requisition_number: data.requisition_number,
        advertisement_number: data.advertisement_number,
        advertisement_date: data.advertisement_date,
        job_type: data.job_type || 'Regular',
        department: data.department,
        designation: data.designation,
        grade_bps: data.grade_bps,
        number_of_posts: parseInt(data.number_of_posts),
        vacant_post_detail: data.vacant_post_detail,
        
        // Step 2
        number_of_ad_hoc_posts: parseInt(data.number_of_ad_hoc_posts) || 0,
        ad_hoc_post_details: data.ad_hoc_post_details,
        initial_appointment_date: data.initial_appointment_date,
        date_of_last_extension: data.date_of_last_extension,
        post_date: data.post_date,
        start_date: data.start_date,
        end_date: data.end_date,
        release_date: data.release_date,
        close_date: data.close_date,
        
        // Step 3
        min_age: parseInt(data.min_age),
        max_age: parseInt(data.max_age),
        age_relaxation: parseInt(data.age_relaxation) || 0,
        age_relaxation_note: data.age_relaxation_note,
        gender_eligibility: data.gender_eligibility,
        nationality: data.nationality || 'Pakistani',
        domicile: data.domicile,
        educational_requirement: Array.isArray(data.educational_requirement) ? data.educational_requirement : [],
        medical_requirement: data.medical_requirement,
        experience_requirement: Array.isArray(data.experience_requirement) ? data.experience_requirement : [],
        other_requirement: data.other_requirement,
        dynamic_fields: data.dynamic_fields,
        
        // Step 4
        examination_fee: parseInt(data.examination_fee) || 0,
        payment_integration_psid: data.payment_integration_psid,
        psid_expiry_date: data.psid_expiry_date,
        payment_status: data.payment_status || 'active',
        test_center_preference: Array.isArray(data.test_center_preference) ? data.test_center_preference : [],
        test_date: data.test_date,
        interview_date: data.interview_date,
        test_duration: data.test_duration,
        syllabus_paper_pattern: data.syllabus_paper_pattern,
        
        // Step 5
        short_details: data.short_details,
        full_job_details: data.full_job_details,
        additional_information: data.additional_information,
        notes_internal: data.notes_internal,
      };

      console.log('Submitting data:', submissionData);

      const response = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to create job');
      }

      setMessage({ 
        type: 'success', 
        text: 'Job created successfully!' 
      });
      
      // Reset form after successful submission
      setTimeout(() => {
        setData(initial);
        setStep(1);
        setErrors({});
      }, 1500);

    } catch (error) {
      console.error('Submission error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to create job. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-emerald-800">Job Creation Form</h2>
          <p className="text-sm text-gray-600 mt-1">Multi-step job creation (Step {step} of 5)</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'error' 
              ? 'bg-red-50 border border-red-200 text-red-700' 
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">{message.type === 'error' ? '⚠️' : '✅'}</span>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex-1">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === s 
                    ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white' 
                    : step > s 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 5 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-gradient-to-r from-emerald-900 to-emerald-950' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
              <div className="mt-2 text-xs text-center text-gray-600">
                {s === 1 ? 'Job Info' : s === 2 ? 'Dates' : s === 3 ? 'Eligibility' : s === 4 ? 'Exam' : 'Details'}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Step Content */}
          <div className="min-h-[400px]">
            {step === 1 && (
              <Step1 data={data} change={change} errors={errors} />
            )}
            {step === 2 && (
              <Step2 data={data} change={change} errors={errors} />
            )}
            {step === 3 && (
              <Step3 data={data} change={change} errors={errors} />
            )}
            {step === 4 && (
              <Step4 data={data} change={change} errors={errors} />
            )}
            {step === 5 && (
              <Step5 data={data} change={change} errors={errors} />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prev}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  ← Previous
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {step < 5 && (
                <button
                  type="button"
                  onClick={next}
                  className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-lg transition"
                >
                  Next Step →
                </button>
              )}
              {step === 5 && (
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-2.5 rounded-lg transition ${
                    loading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950'
                  } text-white`}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Job...
                    </span>
                  ) : (
                    'Submit Job'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}