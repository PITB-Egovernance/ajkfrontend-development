export default function Step1({ data, change, errors }) {
  return (
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
  );
}
