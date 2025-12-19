export default function Step3({ data, change, errors }) {
  const educationalOptions = [
    "Second Class or Grade C Master’s degree in Computer Science/IT/Software Engineering",
    "BS (4 years) in relevant field from HEC recognized university",
    "Bachelor's degree in relevant field",
    "Intermediate with diploma",
    "Matriculation"
  ];

  const experienceOptions = [
    "02 years post-qualification experience in software development (preferred)",
    "01-02 Years experience",
    "03-05 Years experience",
    "05+ Years experience",
    "No experience required"
  ];

  const domicileOptions = ["Punjab", "Sindh", "KPK", "Balochistan", "Gilgit-Baltistan", "AJK"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Min Age</label>
        <input
          type="number"
          name="min_age"
          value={data.min_age}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Age</label>
        <input
          type="number"
          name="max_age"
          value={data.max_age}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Age Relaxation</label>
        <input
          type="number"
          name="age_relaxation"
          value={data.age_relaxation}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Age Relaxation Note</label>
        <input
          name="age_relaxation_note"
          value={data.age_relaxation_note}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="e.g., Upper age relaxable as per Government policy"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Gender Eligibility *</label>
        <div className="flex gap-6 mt-2">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="gender_eligibility"
              value="Male"
              checked={data.gender_eligibility === 'Male'}
              onChange={change}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
            />
            <span className="ml-2">Male</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="gender_eligibility"
              value="Female"
              checked={data.gender_eligibility === 'Female'}
              onChange={change}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
            />
            <span className="ml-2">Female</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="gender_eligibility"
              value="Both"
              checked={data.gender_eligibility === 'Both'}
              onChange={change}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
            />
            <span className="ml-2">Both</span>
          </label>
        </div>
        {errors.gender_eligibility && (
          <p className="mt-1 text-sm text-red-600">{errors.gender_eligibility}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
        <select
          name="nationality"
          value={data.nationality}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="Pakistani">Pakistani</option>
          <option value="Dual National">Dual National</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Domicile</label>
        <select
          name="domicile"
          value={data.domicile}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Select Domicile</option>
          {domicileOptions.map((dom) => (
            <option key={dom} value={dom}>{dom}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Educational Requirement *</label>
        <select
          name="educational_requirement"
          multiple
          value={data.educational_requirement}
          onChange={change}
          className={`w-full px-4 py-2.5 rounded-lg border ${errors.educational_requirement ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          size="4"
        >
          {educationalOptions.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple options</p>
        {errors.educational_requirement && (
          <p className="mt-1 text-sm text-red-600">{errors.educational_requirement}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Medical Requirement</label>
        <select
          name="medical_requirement"
          value={data.medical_requirement}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="Medically Fit">Medically Fit</option>
          <option value="Fit">Fit</option>
          <option value="Unfit">Unfit</option>
          <option value="Not Required">Not Required</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Experience Requirement</label>
        <select
          name="experience_requirement"
          multiple
          value={data.experience_requirement}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          size="3"
        >
          {experienceOptions.map((option, index) => (
            <option key={index} value={option}>{option}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple options</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Other Requirement</label>
        <input
          name="other_requirement"
          value={data.other_requirement}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="e.g., Valid CNIC and Domicile required"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Dynamic Fields (Quota)</label>
        <input
          name="dynamic_fields"
          value={data.dynamic_fields}
          onChange={change}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="e.g., Quota: Merit=1, Punjab=4 (including 1 Women), Sindh=2, etc."
        />
      </div>
    </div>
  );
}