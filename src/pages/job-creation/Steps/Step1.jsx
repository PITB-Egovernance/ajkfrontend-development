import SearchableSelect from 'components/ui/SearchableSelect';

export default function Step1({ data, change, errors }) {
  const departments = [
    'Information Technology Board',
    'Education Department',
    'Health Department',
    'Finance Department',
    'Planning & Development',
    'Home Department'
  ];

  const designations = [
    'Assistant Director',
    'Deputy Director',
    'Director',
    'Assistant Manager',
    'Manager',
    'Software Engineer',
    'System Analyst'
  ];

  const grades = ['BPS-16', 'BPS-17', 'BPS-18', 'BPS-19', 'BPS-20'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
        <input
          name="job_title"
          value={data.job_title}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.job_title ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          placeholder="e.g., Assistant Director (IT)"
        />
        {errors.job_title && (
          <p className="mt-1 text-sm text-red-600">{errors.job_title}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Case Number *</label>
        <input
          name="case_number"
          value={data.case_number}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.case_number ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          placeholder="e.g., F.4-125/2025-R"
        />
        {errors.case_number && (
          <p className="mt-1 text-sm text-red-600">{errors.case_number}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Requisition Number *</label>
        <input
          name="requisition_number"
          value={data.requisition_number}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.requisition_number ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          placeholder="e.g., REQ-2025-278"
        />
        {errors.requisition_number && (
          <p className="mt-1 text-sm text-red-600">{errors.requisition_number}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Advertisement Number *</label>
        <input
          name="advertisement_number"
          value={data.advertisement_number}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.advertisement_number ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          placeholder="e.g., ADV-12/2025"
        />
        {errors.advertisement_number && (
          <p className="mt-1 text-sm text-red-600">{errors.advertisement_number}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Advertisement Date *</label>
        <input
          type="date"
          name="advertisement_date"
          value={data.advertisement_date}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.advertisement_date ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
        />
        {errors.advertisement_date && (
          <p className="mt-1 text-sm text-red-600">{errors.advertisement_date}</p>
        )}
      </div>

      <div>
        <SearchableSelect
          label="Job Type"
          name="job_type"
          value={data.job_type}
          onChange={change}
          options={[
            { value: 'Regular', label: 'Regular' },
            { value: 'Contract', label: 'Contract' },
            { value: 'Ad Hoc', label: 'Ad Hoc' },
            { value: 'Temporary', label: 'Temporary' },
          ]}
        />
      </div>

      <div>
        <SearchableSelect
          label="Department"
          name="department"
          value={data.department}
          onChange={change}
          options={[{ value: '', label: 'Select Department' }, ...departments.map(d => ({ value: d, label: d }))]}
          placeholder="Select Department"
          required
          error={errors.department}
        />
      </div>

      <div>
        <SearchableSelect
          label="Designation"
          name="designation"
          value={data.designation}
          onChange={change}
          options={[{ value: '', label: 'Select Designation' }, ...designations.map(d => ({ value: d, label: d }))]}
          placeholder="Select Designation"
          required
          error={errors.designation}
        />
      </div>

      <div>
        <SearchableSelect
          label="Grade BPS"
          name="grade_bps"
          value={data.grade_bps}
          onChange={change}
          options={[{ value: '', label: 'Select Grade' }, ...grades.map(g => ({ value: g, label: g }))]}
          placeholder="Select Grade"
          required
          error={errors.grade_bps}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Posts *</label>
        <input
          type="number"
          name="number_of_posts"
          value={data.number_of_posts}
          onChange={change}
          min={1}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.number_of_posts ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
        />
        {errors.number_of_posts && (
          <p className="mt-1 text-sm text-red-600">{errors.number_of_posts}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Vacant Post Detail</label>
        <textarea
          name="vacant_post_detail"
          value={data.vacant_post_detail}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          rows={3}
          placeholder="e.g., 04 Punjab, 02 Sindh(R), 01 KPK, 01 Balochistan"
        />
      </div>
    </div>
  );
}