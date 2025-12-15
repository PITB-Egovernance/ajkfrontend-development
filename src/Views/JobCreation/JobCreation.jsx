import React, { useState, useEffect } from 'react';
import Config from '../../Config/Baseurl';
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
      // for array checkboxes
      const current = new Set(data[name] || []);
      if (checked) current.add(value); else current.delete(value);
      setData(s => ({ ...s, [name]: Array.from(current) }));
      return;
    }
    if (type === 'select-multiple') {
      const vals = Array.from(options).filter(o => o.selected).map(o => o.value);
      setData(s => ({ ...s, [name]: vals }));
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
      setErrors(e); setMessage({ type: 'error', text: 'Please fix errors on this step' }); return;
    }
    setStep(s => Math.min(5, s + 1));
  };
  const prev = () => setStep(s => Math.max(1, s - 1));

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate(5);
    if (Object.keys(e).length) { setErrors(e); setMessage({ type: 'error', text: 'Please fix errors' }); return; }
    setLoading(true);
    try {
      const form = new FormData();
      // append all fields; arrays must be appended as name[]
      Object.entries(data).forEach(([k,v]) => {
        if (Array.isArray(v)) {
          v.forEach(item => form.append(k + '[]', item));
        } else {
          form.append(k, v ?? '');
        }
      });

      const res = await fetch(`${API}/jobs`, { method: 'POST', body: form });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json.message || 'Submit failed');
      setMessage({ type: 'success', text: 'Job created successfully' });
      setData(initial);
      setStep(1);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Submission failed' });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-emerald-800">Job Creation Form</h2>
        <p className="text-sm text-gray-500">Multi-step job creation (Step {step} of 5)</p>

        {message && (
          <div className={`mt-4 p-3 rounded ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={submit} className="space-y-6 mt-6">
          <div className="flex gap-2">
            {[1,2,3,4,5].map(s => (
              <div key={s} className={`flex-1 text-center py-2 rounded ${step===s ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {s===1 ? 'Job Info' : s===2 ? 'Ad HOC' : s===3 ? 'Eligibility' : s===4 ? 'Application' : 'Description'}
              </div>
            ))}
          </div>

          {step===1 && (
            <Step1 data={data} change={change} errors={errors} />
          )}

          {step===2 && (
            <Step2 data={data} change={change} errors={errors} />
          )}

          {step===3 && (
            <Step3 data={data} change={change} errors={errors} />
          )}

          {step===4 && (
            <Step4 data={data} change={change} errors={errors} />
          )}

          {step===5 && (
            <Step5 data={data} change={change} errors={errors} />
          )}

          <div className="flex justify-between pt-4">
            <div>
              {step > 1 && <button type="button" onClick={prev} className="px-4 py-2 bg-gray-200 rounded">Previous</button>}
            </div>
            <div className="flex gap-3">
              {step < 5 && <button type="button" onClick={next} className="px-4 py-2 bg-emerald-700 text-white rounded">Next</button>}
              {step === 5 && <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Submit'}</button>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
