export default function Step4({ data, change, errors }) {
  const testCenters = [
    "Islamabad", "Lahore", "Karachi", "Peshawar", "Quetta",
    "Rawalpindi", "Faisalabad", "Multan", "Gujranwala", "Hyderabad"
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Examination Fee (PKR) *</label>
        <input
          type="number"
          name="examination_fee"
          value={data.examination_fee}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.examination_fee ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          placeholder="e.g., 1500"
        />
        {errors.examination_fee && (
          <p className="mt-1 text-sm text-red-600">{errors.examination_fee}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Integration (PSID)</label>
        <input
          name="payment_integration_psid"
          value={data.payment_integration_psid}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="e.g., PSID202512041234"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PSID Expiry Date</label>
        <input
          type="date"
          name="psid_expiry_date"
          value={data.psid_expiry_date}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
        <select
          name="payment_status"
          value={data.payment_status}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Test Center Preference</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
          {testCenters.map((center) => (
            <label key={center} className="inline-flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                name="test_center_preference"
                value={center}
                onChange={change}
                checked={data.test_center_preference?.includes(center)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm">{center}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Test Date *</label>
        <input
          type="date"
          name="test_date"
          value={data.test_date}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.test_date ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
        />
        {errors.test_date && (
          <p className="mt-1 text-sm text-red-600">{errors.test_date}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
        <input
          type="date"
          name="interview_date"
          value={data.interview_date}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Test Duration</label>
        <input
          name="test_duration"
          value={data.test_duration}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="e.g., 180 minutes"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Syllabus / Paper Pattern</label>
        <input
          name="syllabus_paper_pattern"
          value={data.syllabus_paper_pattern}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="e.g., 100 MCQs (Computer Science 70%, English 20%, Analytical 10%)"
        />
      </div>
    </div>
  );
}