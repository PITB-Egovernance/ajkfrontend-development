import React from 'react';

export default function Step2({ data, change, errors }) {
  return (
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
  );
}
