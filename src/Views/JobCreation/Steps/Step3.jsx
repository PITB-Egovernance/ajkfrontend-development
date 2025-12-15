import React from 'react';

export default function Step3({ data, change, errors }) {
  return (
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
  );
}
