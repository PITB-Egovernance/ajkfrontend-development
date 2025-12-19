export default function Step2({ data, change, errors }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Ad HOC Posts</label>
        <input
          type="number"
          name="number_of_ad_hoc_posts"
          value={data.number_of_ad_hoc_posts}
          onChange={change}
          min={0}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ad HOC Post Details</label>
        <textarea
          name="ad_hoc_post_details"
          value={data.ad_hoc_post_details}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          rows={3}
          placeholder="Enter details if any"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Initial Appointment Date</label>
        <input
          type="date"
          name="initial_appointment_date"
          value={data.initial_appointment_date}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Last Extension</label>
        <input
          type="date"
          name="date_of_last_extension"
          value={data.date_of_last_extension}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Post Date (Creation Date) *</label>
        <input
          type="date"
          name="post_date"
          value={data.post_date}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.post_date ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
        />
        {errors.post_date && (
          <p className="mt-1 text-sm text-red-600">{errors.post_date}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Apply Start Date *</label>
        <input
          type="date"
          name="start_date"
          value={data.start_date}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.start_date ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
        />
        {errors.start_date && (
          <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Apply End Date *</label>
        <input
          type="date"
          name="end_date"
          value={data.end_date}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.end_date ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
        />
        {errors.end_date && (
          <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Press Release Date</label>
        <input
          type="date"
          name="release_date"
          value={data.release_date}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Close Job Date</label>
        <input
          type="date"
          name="close_date"
          value={data.close_date}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}