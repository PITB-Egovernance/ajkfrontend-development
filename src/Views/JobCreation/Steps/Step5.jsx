import React from 'react';

export default function Step5({ data, change, errors }) {
  return (
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
  );
}
