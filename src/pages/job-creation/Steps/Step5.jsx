export default function Step5({ data, change, errors }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Short Details *</label>
        <textarea
          name="short_details"
          value={data.short_details}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.short_details ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          rows={3}
          placeholder="e.g., Recruitment for Assistant Director (BS-17) on regular basis. Excellent career opportunity in public sector IT department."
        />
        {errors.short_details && (
          <p className="mt-1 text-sm text-red-600">{errors.short_details}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Job Details *</label>
        <textarea
          name="full_job_details"
          value={data.full_job_details}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.full_job_details ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          rows={5}
          placeholder="e.g., The selected candidates will be responsible for software development, system analysis, database management and IT project coordination..."
        />
        {errors.full_job_details && (
          <p className="mt-1 text-sm text-red-600">{errors.full_job_details}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Information</label>
        <textarea
          name="additional_information"
          value={data.additional_information}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          rows={3}
          placeholder="e.g., No TA/DA will be admissible. Only shortlisted candidates will be called for test/interview."
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Internal)</label>
        <textarea
          name="notes_internal"
          value={data.notes_internal}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          rows={3}
          placeholder="e.g., High priority requisition - fast-track processing requested by Secretary IT"
        />
      </div>
    </div>
  );
}