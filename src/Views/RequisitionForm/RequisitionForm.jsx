import React, { useState, useEffect } from 'react';
import Config from '../../Config/Baseurl';
import { 
  Upload, 
  Briefcase, 
  GraduationCap, 
  CheckCircle, 
  FileText, 
  Info,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Award,
  MapPin,
  Users,
  FileCheck
} from 'lucide-react';

const initialState = {
  // Step 1: Job Info
  designation: '',
  scale: '',
  quota_percentage: '',
  num_posts: 1,
  vacancy_date: '',
  test_type: '',
  service_rules: null,
  syllabus: null,
  job_category: '',
  department: '',
  location: '',
  employment_type: '',

  // Step 2: Ad HOC
  adhoc_period: '',
  adhoc_extension: '',
  adhoc_approval_authority: '',
  adhoc_start_date: '',
  adhoc_end_date: '',
  adhoc_remarks: '',

  // Step 3: Eligibility
  academic_qualification: '',
  equivalent_qualification: '',
  authority_certificate: '',
  degree_equivalence: '',
  any_other_qualification: '',
  training_institute: '',
  experience_type: '',
  experience_length: 0,
  specialization: '',
  skills_required: [],

  // Step 4: Application
  min_age: 18,
  max_age: 40,
  age_relaxation: 'No',
  relaxation_reason: '',
  relaxation_years: '',
  nationality: 'Pakistani/AJK',
  domicile: '',
  other_conditions: '',
  gender_basis: '',
  application_fee: '',
  application_deadline: '',
  apply_online: 'Yes',
  district_rows: [{ district: '', quota: '', post: '' }],

  // Step 5: Description
  job_description: '',
  responsibilities: '',
  benefits: '',
  selection_process: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  important_notes: '',
};

export default function RequisitionForm() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [progress, setProgress] = useState(20);
  const API = Config.apiUrl;

  const steps = [
    { number: 1, title: 'Job Info', icon: Briefcase, color: 'bg-blue-500' },
    { number: 2, title: 'Ad HOC', icon: FileCheck, color: 'bg-purple-500' },
    { number: 3, title: 'Eligibility', icon: GraduationCap, color: 'bg-green-500' },
    { number: 4, title: 'Application', icon: Users, color: 'bg-yellow-500' },
    { number: 5, title: 'Description', icon: FileText, color: 'bg-indigo-500' },
  ];

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  useEffect(() => {
    setProgress(step * 20);
  }, [step]);

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;
    if (type === 'file') {
      setData((s) => ({ ...s, [name]: files[0] }));
    } else {
      setData((s) => ({ ...s, [name]: value }));
    }
  };

  const handleSkillAdd = (skill) => {
    if (skill && !data.skills_required.includes(skill)) {
      setData((s) => ({ ...s, skills_required: [...s.skills_required, skill] }));
    }
  };

  const handleSkillRemove = (index) => {
    setData((s) => ({
      ...s,
      skills_required: s.skills_required.filter((_, i) => i !== index)
    }));
  };

  const addRow = () => {
    setData((s) => ({ ...s, district_rows: [...s.district_rows, { district: '', quota: '', post: '' }] }));
  };

  const removeRow = (index) => {
    setData((s) => ({ ...s, district_rows: s.district_rows.filter((_, i) => i !== index) }));
  };

  const updateRow = (index, field, value) => {
    setData((s) => {
      const rows = [...s.district_rows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...s, district_rows: rows };
    });
  };

  const validateStep = () => {
    const validations = {
      1: () => {
        if (!data.designation || !data.scale) return 'Designation and Scale are required';
        if (!data.num_posts || Number(data.num_posts) < 1) return 'Number of posts must be at least 1';
        if (!data.vacancy_date) return 'Vacancy date is required';
        return null;
      },
      2: () => {
        if (!data.adhoc_period) return 'Ad HOC period is required';
        if (!data.adhoc_start_date) return 'Start date is required';
        return null;
      },
      3: () => {
        if (!data.academic_qualification) return 'Academic qualification is required';
        if (!data.experience_type && data.experience_length > 0) return 'Please specify experience type';
        return null;
      },
      4: () => {
        if (Number(data.min_age) > Number(data.max_age)) return 'Minimum age cannot be greater than maximum age';
        const ok = data.district_rows.length && data.district_rows.some(r => r.district && r.post && Number(r.post) > 0);
        if (!ok) return 'Please add at least one district with posts';
        if (!data.application_deadline) return 'Application deadline is required';
        return null;
      },
      5: () => {
        if (!data.job_description || data.job_description.length < 50) return 'Job description must be at least 50 characters';
        if (!data.responsibilities) return 'Responsibilities are required';
        return null;
      }
    };

    return validations[step] ? validations[step]() : null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setMessage({ type: 'error', text: err });
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleStepClick = (stepNumber) => {
    // Allow going back to previous steps
    if (stepNumber < step) {
      setStep(stepNumber);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep();
    if (err) { setMessage({ type: 'error', text: err }); return; }

    setLoading(true);
    try {
      const form = new FormData();
      const skip = ['district_rows', 'skills_required'];
      
      Object.keys(data).forEach(key => {
        if (skip.includes(key)) return;
        if (data[key] instanceof File) {
          form.append(key, data[key]);
        } else if (Array.isArray(data[key])) {
          data[key].forEach(item => form.append(`${key}[]`, item));
        } else {
          form.append(key, data[key] ?? '');
        }
      });

      data.district_rows.forEach(row => {
        form.append('district[]', row.district ?? '');
        form.append('quota[]', row.quota ?? '');
        form.append('post[]', row.post ?? '');
      });

      const res = await fetch(`${API}/requisition`, {
        method: 'POST',
        body: form,
      });
      
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || 'Submission failed');

      setMessage({ type: 'success', text: '✓ Requisition saved successfully!' });
      setTimeout(() => {
        setData(initialState);
        setStep(1);
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: `✗ ${err.message || 'Submission failed'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Steps Indicator + Centered Progress */}
        <div className="relative mb-6">
          {/* centered progress line positioned at top-middle of stepper */}
          <div className="absolute left-6 right-6 top-0 flex items-center justify-center pointer-events-none">
            <div className="w-full max-w-4xl relative">
              <div className="h-1 bg-slate-200 rounded-full"></div>
              <div
                className="absolute left-0 top-0 h-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between relative pt-6">
            {steps.map(({ number, title, icon: Icon, color }) => (
              <div key={number} className="flex flex-col items-center relative z-10 px-2">
                <button
                  type="button"
                  onClick={() => handleStepClick(number)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-300 transform hover:scale-105 ${
                    step >= number ? `${color} ring-4 ring-opacity-20 ring-current` : 'bg-slate-300'
                  }`}
                >
                  <Icon size={20} />
                </button>
                <div className={`mt-2 text-sm font-medium ${step >= number ? 'text-slate-900' : 'text-slate-500'}`}>
                  Step {number}
                </div>
                <div className={`text-xs ${step >= number ? 'text-slate-700' : 'text-slate-400'}`}>
                  {title}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toast Message (floating) */}
        {message && (
          <div className="fixed top-6 right-6 z-50">
            <div
              role="alert"
              className={`min-w-[220px] max-w-lg rounded-lg p-3 shadow-lg transform transition-all duration-250 ${
                message.type === 'error' ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="font-medium text-sm">{message.text}</div>
              </div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Step 1: Job Info */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="text-emerald-600" size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Job Information</h2>
                    <p className="text-gray-600">Basic details about the position</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="designation"
                      value={data.designation}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                      placeholder="e.g., Software Engineer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Scale <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="scale"
                      value={data.scale}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                      placeholder="e.g., BPS-17"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Job Category</label>
                    <select
                      name="job_category"
                      value={data.job_category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                    >
                      <option value="">Select Category</option>
                      <option>Technical</option>
                      <option>Administrative</option>
                      <option>Managerial</option>
                      <option>Support</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Department</label>
                    <input
                      name="department"
                      value={data.department}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                      placeholder="e.g., IT Department"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Quota Percentage</label>
                    <div className="relative">
                      <select
                        name="quota_percentage"
                        value={data.quota_percentage}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 appearance-none"
                      >
                        <option value="">Select Percentage</option>
                        {Array.from({ length: 100 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}%</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        ↓
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Number of Posts <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="num_posts"
                      value={data.num_posts}
                      onChange={handleChange}
                      min="1"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Date of Vacancy <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="date"
                        name="vacancy_date"
                        value={data.vacancy_date}
                        onChange={handleChange}
                        className="w-full pl-10 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Test Type</label>
                    <select
                      name="test_type"
                      value={data.test_type}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                    >
                      <option value="">Select Test Type</option>
                      <option>MCQs Base</option>
                      <option>Competitive Base</option>
                      <option>Written Test</option>
                      <option>Practical Test</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Syllabus (PDF)</label>

                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Ad HOC */}
            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                    <FileCheck className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Ad HOC Details</h2>
                    <p className="text-gray-600">Temporary employment information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Ad HOC Period <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="adhoc_period"
                      value={data.adhoc_period}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
                    >
                      <option value="">Select Period</option>
                      <option>3 Months</option>
                      <option>6 Months</option>
                      <option>1 Year</option>
                      <option>2 Years</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Extension Allowed</label>
                    <select
                      name="adhoc_extension"
                      value={data.adhoc_extension}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
                    >
                      <option value="">Select Option</option>
                      <option>Yes</option>
                      <option>No</option>
                      <option>Case by Case</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Approval Authority</label>
                    <input
                      name="adhoc_approval_authority"
                      value={data.adhoc_approval_authority}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
                      placeholder="e.g., Secretary, Ministry of..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="adhoc_start_date"
                      value={data.adhoc_start_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">End Date</label>
                    <input
                      type="date"
                      name="adhoc_end_date"
                      value={data.adhoc_end_date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Remarks</label>
                    <textarea
                      name="adhoc_remarks"
                      value={data.adhoc_remarks}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 resize-none"
                      placeholder="Additional comments or notes..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Eligibility */}
            {step === 3 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                    <GraduationCap className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Eligibility Criteria</h2>
                    <p className="text-gray-600">Educational and experience requirements</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Academic Qualification <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="academic_qualification"
                      value={data.academic_qualification}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                    >
                      <option value="">Select Qualification</option>
                      <option>Matric</option>
                      <option>Intermediate</option>
                      <option>Bachelor's Degree</option>
                      <option>Master's Degree</option>
                      <option>PhD</option>
                      <option>Diploma</option>
                      <option>Certificate</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Specialization</label>
                    <input
                      name="specialization"
                      value={data.specialization}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                      placeholder="e.g., Computer Science, Finance, etc."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Equivalent Qualification</label>
                    <select
                      name="equivalent_qualification"
                      value={data.equivalent_qualification}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                    >
                      <option value="">Select Option</option>
                      <option>Yes</option>
                      <option>No</option>
                      <option>Under Process</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Authority Certificate</label>
                    <input
                      name="authority_certificate"
                      value={data.authority_certificate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                      placeholder="Issuing authority name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Degree Equivalence</label>
                    <select
                      name="degree_equivalence"
                      value={data.degree_equivalence}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                    >
                      <option value="">Select Degree</option>
                      <option>B.Sc</option>
                      <option>B.A</option>
                      <option>B.Com</option>
                      <option>BBA</option>
                      <option>BS Computer Science</option>
                      <option>M.Sc</option>
                      <option>M.A</option>
                      <option>MBA</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Training Institute</label>
                    <input
                      name="training_institute"
                      value={data.training_institute}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                      placeholder="Institute name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Experience Type</label>
                    <input
                      name="experience_type"
                      value={data.experience_type}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                      placeholder="e.g., Teaching, Research, Industry"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Experience Length (years)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        name="experience_length"
                        min="0"
                        max="20"
                        value={data.experience_length}
                        onChange={handleChange}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="w-16 text-center font-bold text-green-600">
                        {data.experience_length} yrs
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Skills Required</label>
                    <div className="space-y-3">
                      <div className="flex">
                        <input
                          type="text"
                          placeholder="Add a skill and press Enter"
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-300"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSkillAdd(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.querySelector('input[placeholder="Add a skill and press Enter"]');
                            handleSkillAdd(input.value);
                            input.value = '';
                          }}
                          className="ml-2 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {data.skills_required.map((skill, index) => (
                          <div
                            key={index}
                            className="flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleSkillRemove(index)}
                              className="ml-2 text-red-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Application */}
            {step === 4 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
                    <Users className="text-yellow-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
                    <p className="text-gray-600">Age limits, quotas, and application process</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Age Section */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">Age Requirements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Minimum Age</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            name="min_age"
                            value={data.min_age}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                          />
                          <span className="ml-2 text-gray-500">years</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Maximum Age</label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            name="max_age"
                            value={data.max_age}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                          />
                          <span className="ml-2 text-gray-500">years</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Age Relaxation</label>
                        <select
                          name="age_relaxation"
                          value={data.age_relaxation}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                        >
                          <option>No</option>
                          <option>Yes</option>
                          <option>As per policy</option>
                        </select>
                      </div>
                    </div>

                    {data.age_relaxation === 'Yes' && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-sm font-semibold text-gray-700">Relaxation Reason</label>
                          <input
                            name="relaxation_reason"
                            value={data.relaxation_reason}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                            placeholder="e.g., Government Servant, Disability"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-sm font-semibold text-gray-700">Relaxation Years</label>
                          <input
                            name="relaxation_years"
                            value={data.relaxation_years}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                            placeholder="e.g., 5 years"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Basic Requirements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Nationality</label>
                      <select
                        name="nationality"
                        value={data.nationality}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                      >
                        <option>Pakistani/AJK</option>
                        <option>Dual Nationality</option>
                        <option>Foreign National</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Domicile</label>
                      <input
                        name="domicile"
                        value={data.domicile}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                        placeholder="Required domicile province/district"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Gender Basis</label>
                      <select
                        name="gender_basis"
                        value={data.gender_basis}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                      >
                        <option value="">Select</option>
                        <option>Male Only</option>
                        <option>Female Only</option>
                        <option>Both</option>
                        <option>Transgender</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Application Fee</label>
                      <input
                        name="application_fee"
                        value={data.application_fee}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                        placeholder="e.g., 1000 PKR"
                      />
                    </div>
                  </div>

                  {/* District Quota Table */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-semibold text-gray-700">
                        District-wise Quota Distribution
                      </label>
                      <button
                        type="button"
                        onClick={addRow}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300"
                      >
                        <Plus size={16} className="mr-2" />
                        Add District
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              District
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Quota %
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Posts
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.district_rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  placeholder="Enter district"
                                  value={row.district}
                                  onChange={(e) => updateRow(idx, 'district', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="number"
                                  placeholder="Quota %"
                                  value={row.quota}
                                  onChange={(e) => updateRow(idx, 'quota', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="number"
                                  placeholder="Posts"
                                  value={row.post}
                                  onChange={(e) => updateRow(idx, 'post', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  type="button"
                                  onClick={() => removeRow(idx)}
                                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Application Process */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">
                        Application Deadline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="application_deadline"
                        value={data.application_deadline}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Apply Online</label>
                      <select
                        name="apply_online"
                        value={data.apply_online}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-300"
                      >
                        <option>Yes</option>
                        <option>No</option>
                        <option>Both Online & Offline</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Description */}
            {step === 5 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4">
                    <FileText className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Job Description & Details</h2>
                    <p className="text-gray-600">Complete job description and contact information</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Job Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="job_description"
                      value={data.job_description}
                      onChange={handleChange}
                      rows="4"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 resize-none"
                      placeholder="Provide a detailed description of the job role, expectations, and context..."
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {data.job_description.length}/1000 characters
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Key Responsibilities <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="responsibilities"
                      value={data.responsibilities}
                      onChange={handleChange}
                      rows="4"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 resize-none"
                      placeholder="List the main responsibilities and duties of the position..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Benefits & Perks</label>
                    <textarea
                      name="benefits"
                      value={data.benefits}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 resize-none"
                      placeholder="Medical, transportation, housing, etc..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Selection Process</label>
                    <textarea
                      name="selection_process"
                      value={data.selection_process}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 resize-none"
                      placeholder="Test, interview, medical exam, etc..."
                    />
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Contact Person</label>
                        <input
                          name="contact_person"
                          value={data.contact_person}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
                          placeholder="Name of contact person"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Contact Email</label>
                        <input
                          type="email"
                          name="contact_email"
                          value={data.contact_email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
                          placeholder="contact@example.com"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-gray-700">Contact Phone</label>
                        <input
                          name="contact_phone"
                          value={data.contact_phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
                          placeholder="+92 300 1234567"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Important Notes</label>
                    <textarea
                      name="important_notes"
                      value={data.important_notes}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 resize-none"
                      placeholder="Any additional important information for applicants..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 border-t border-gray-200 mt-8">
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 transform hover:-translate-x-1"
                  >
                    <ChevronLeft size={20} className="mr-2" />
                    Previous
                  </button>
                )}
              </div>
              
              <div className="flex gap-3">
                {step < 5 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center px-6 py-3 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 border-r border-emerald-800/50 text-white rounded-xl hover:from-emerald-800 hover:via-emerald-700 hover:to-emerald-600 transition-all duration-300 transform hover:translate-x-1"
                  >
                    Next Step
                    <ChevronRight size={20} className="ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} className="mr-2" />
                        Submit Requisition
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}