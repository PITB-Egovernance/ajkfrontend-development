import React, { useState, useEffect } from 'react';
import Config from '../../Config/Baseurl';

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <input name="job_title" value={data.job_title} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.job_title && <div className="text-red-600 text-sm">{errors.job_title}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Case Number</label>
                <input name="case_number" value={data.case_number} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.case_number && <div className="text-red-600 text-sm">{errors.case_number}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Requisition Number</label>
                <input name="requisition_number" value={data.requisition_number} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.requisition_number && <div className="text-red-600 text-sm">{errors.requisition_number}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Advertisement Number</label>
                <input name="advertisement_number" value={data.advertisement_number} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.advertisement_number && <div className="text-red-600 text-sm">{errors.advertisement_number}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Advertisement Date</label>
                <input type="date" name="advertisement_date" value={data.advertisement_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.advertisement_date && <div className="text-red-600 text-sm">{errors.advertisement_date}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Job Type</label>
                <input name="job_type" value={data.job_type} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <select name="department" value={data.department} onChange={change} className="mt-1 w-full rounded border-gray-200">
                  <option value="">Select</option>
                  <option>Education</option>
                  <option>Health</option>
                  <option>Administration</option>
                </select>
                {errors.department && <div className="text-red-600 text-sm">{errors.department}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Designation</label>
                <select name="designation" value={data.designation} onChange={change} className="mt-1 w-full rounded border-gray-200">
                  <option value="">Select</option>
                  <option>Officer</option>
                  <option>Clerk</option>
                  <option>Supervisor</option>
                </select>
                {errors.designation && <div className="text-red-600 text-sm">{errors.designation}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Grade BPS</label>
                <select name="grade_bps" value={data.grade_bps} onChange={change} className="mt-1 w-full rounded border-gray-200">
                  <option value="">Select</option>
                  <option>BPS-16</option>
                  <option>BPS-17</option>
                  <option>BPS-18</option>
                </select>
                {errors.grade_bps && <div className="text-red-600 text-sm">{errors.grade_bps}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Number of Posts</label>
                <input type="number" name="number_of_posts" value={data.number_of_posts} onChange={change} min={1} className="mt-1 w-full rounded border-gray-200" />
                {errors.number_of_posts && <div className="text-red-600 text-sm">{errors.number_of_posts}</div>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Vacant Post Detail</label>
                <textarea name="vacant_post_detail" value={data.vacant_post_detail} onChange={change} className="mt-1 w-full rounded border-gray-200" rows={3} />
              </div>
            </div>
          )}

          {step===2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Number of Ad HOC Posts</label>
                <input type="number" name="number_of_ad_hoc_posts" value={data.number_of_ad_hoc_posts} onChange={change} min={0} className="mt-1 w-full rounded border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ad HOC Post Details</label>
                <textarea name="ad_hoc_post_details" value={data.ad_hoc_post_details} onChange={change} className="mt-1 w-full rounded border-gray-200" rows={3} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Initial Appointment Date</label>
                <input type="date" name="initial_appointment_date" value={data.initial_appointment_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date Of Last Extension</label>
                <input type="date" name="date_of_last_extension" value={data.date_of_last_extension} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Post Date (Creation Date)</label>
                <input type="date" name="post_date" value={data.post_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.post_date && <div className="text-red-600 text-sm">{errors.post_date}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Apply Start Date</label>
                <input type="date" name="start_date" value={data.start_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.start_date && <div className="text-red-600 text-sm">{errors.start_date}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Apply End Date</label>
                <input type="date" name="end_date" value={data.end_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.end_date && <div className="text-red-600 text-sm">{errors.end_date}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Press Release Date</label>
                <input type="date" name="release_date" value={data.release_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Close Job Date</label>
                <input type="date" name="close_date" value={data.close_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>
            </div>
          )}

          {step===3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Age</label>
                <input type="number" name="min_age" value={data.min_age} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Age</label>
                <input type="number" name="max_age" value={data.max_age} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Age Relaxation</label>
                <input type="number" name="age_relaxation" value={data.age_relaxation} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Age Relaxation Note</label>
                <input name="age_relaxation_note" value={data.age_relaxation_note} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Gender Eligibility</label>
                <div className="flex gap-4 mt-2">
                  <label className="inline-flex items-center"><input type="radio" name="gender_eligibility" value="Male" checked={data.gender_eligibility==='Male'} onChange={change} /> <span className="ml-2">Male</span></label>
                  <label className="inline-flex items-center"><input type="radio" name="gender_eligibility" value="Female" checked={data.gender_eligibility==='Female'} onChange={change} /> <span className="ml-2">Female</span></label>
                </div>
                {errors.gender_eligibility && <div className="text-red-600 text-sm">{errors.gender_eligibility}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nationality</label>
                <input name="nationality" value={data.nationality} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Domicile</label>
                <select name="domicile" value={data.domicile} onChange={change} className="mt-1 w-full rounded border-gray-200">
                  <option value="">Select</option>
                  <option>Muzaffarabad</option>
                  <option>Mirpur</option>
                  <option>Kotli</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Educational Requirement</label>
                <select name="educational_requirement" multiple value={data.educational_requirement} onChange={change} className="mt-1 w-full rounded border-gray-200">
                  <option value="Matric">Matric</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Bachelor">Bachelor</option>
                  <option value="Master">Master</option>
                </select>
                {errors.educational_requirement && <div className="text-red-600 text-sm">{errors.educational_requirement}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Medical Requirement</label>
                <input name="medical_requirement" value={data.medical_requirement} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Experience Requirement</label>
                <select name="experience_requirement" multiple value={data.experience_requirement} onChange={change} className="mt-1 w-full rounded border-gray-200">
                  <option value="1-2 Years">1-2 Years</option>
                  <option value="3-5 Years">3-5 Years</option>
                  <option value="5+ Years">5+ Years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Other Requirement</label>
                <input name="other_requirement" value={data.other_requirement} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Dynamic Fields</label>
                <input name="dynamic_fields" value={data.dynamic_fields} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>
            </div>
          )}

          {step===4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Examination Fee</label>
                <input type="number" name="examination_fee" value={data.examination_fee} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.examination_fee && <div className="text-red-600 text-sm">{errors.examination_fee}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Integration (PSID)</label>
                <input name="payment_integration_psid" value={data.payment_integration_psid} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">PSID Expiry Date</label>
                <input type="date" name="psid_expiry_date" value={data.psid_expiry_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                <select name="payment_status" value={data.payment_status} onChange={change} className="mt-1 w-full rounded border-gray-200">
                  <option value="">Select</option>
                  <option>Pending</option>
                  <option>Paid</option>
                  <option>Failed</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Test Center Preference</label>
                <div className="flex gap-4 mt-2">
                  <label className="inline-flex items-center"><input type="checkbox" name="test_center_preference" value="Muzaffarabad" onChange={(e)=>{
                    // adapt to checkbox handling
                    const checked = e.target.checked;
                    const val = e.target.value;
                    const cur = new Set(data.test_center_preference || []);
                    if (checked) cur.add(val); else cur.delete(val);
                    setData(s=> ({...s, test_center_preference: Array.from(cur)}));
                  }} /> <span className="ml-2">Muzaffarabad</span></label>

                  <label className="inline-flex items-center"><input type="checkbox" name="test_center_preference" value="Mirpur" onChange={(e)=>{
                    const checked = e.target.checked; const val = e.target.value; const cur = new Set(data.test_center_preference || []);
                    if (checked) cur.add(val); else cur.delete(val);
                    setData(s=> ({...s, test_center_preference: Array.from(cur)}));
                  }} /> <span className="ml-2">Mirpur</span></label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Test Date</label>
                <input type="date" name="test_date" value={data.test_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
                {errors.test_date && <div className="text-red-600 text-sm">{errors.test_date}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Interview Date</label>
                <input type="date" name="interview_date" value={data.interview_date} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Test Duration</label>
                <input name="test_duration" value={data.test_duration} onChange={change} className="mt-1 w-full rounded border-gray-200" placeholder="e.g., 2 hours" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Syllabus / Paper Pattern</label>
                <input name="syllabus_paper_pattern" value={data.syllabus_paper_pattern} onChange={change} className="mt-1 w-full rounded border-gray-200" />
              </div>
            </div>
          )}

          {step===5 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Short Details</label>
                <textarea name="short_details" value={data.short_details} onChange={change} className="mt-1 w-full rounded border-gray-200" rows={3} />
                {errors.short_details && <div className="text-red-600 text-sm">{errors.short_details}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Job Details</label>
                <textarea name="full_job_details" value={data.full_job_details} onChange={change} className="mt-1 w-full rounded border-gray-200" rows={4} />
                {errors.full_job_details && <div className="text-red-600 text-sm">{errors.full_job_details}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Additional Information</label>
                <textarea name="additional_information" value={data.additional_information} onChange={change} className="mt-1 w-full rounded border-gray-200" rows={3} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (Internal)</label>
                <textarea name="notes_internal" value={data.notes_internal} onChange={change} className="mt-1 w-full rounded border-gray-200" rows={3} />
              </div>
            </div>
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
