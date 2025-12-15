import React from 'react';

export default function Step4({ data, change, errors }) {
  return (
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
          <label className="inline-flex items-center"><input type="checkbox" name="test_center_preference" value="Muzaffarabad" onChange={change} checked={data.test_center_preference?.includes('Muzaffarabad')} /> <span className="ml-2">Muzaffarabad</span></label>

          <label className="inline-flex items-center"><input type="checkbox" name="test_center_preference" value="Mirpur" onChange={change} checked={data.test_center_preference?.includes('Mirpur')} /> <span className="ml-2">Mirpur</span></label>
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
  );
}
