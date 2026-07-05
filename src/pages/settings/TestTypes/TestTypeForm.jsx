import React, { useState, useEffect } from 'react';
import { TextField, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { hasPermission } from 'utils/permissions';
import WrittenExamSubjectApi from 'api/writtenExamSubjectApi';

const PERM = 'settings.test_types';
const API_BASE = Config.apiUrl;

const getHeaders = (json = true) => {
  const h = {
    Authorization: `Bearer ${AuthService.getToken()}`,
    Accept: 'application/json',
    'X-API-KEY': Config.apiKey,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

// Dropdown values shown at the top of the page.
const EXAM_CATEGORIES = [
  { value: 'one_paper_mcq',          label: 'One Paper MCQ' },
  { value: 'two_paper_mcq',          label: 'Two Paper MCQ' },
  { value: 'written_exam',           label: 'Written Exam' },
  { value: 'combined_competitive_exam', label: 'Combined Competitive Exam' },
];

const EMPTY = {
  exam_category: 'one_paper_mcq',
  name: '',
  description: '',
  // One / Two paper MCQ
  total_marks: '',
  passing_percentage: '',
  passing_marks: '',
  paper_weightage_percentage: '',
  paper1_weightage_percentage: '',
  paper2_weightage_percentage: '',
  interview_weightage_percentage: '',
  // Written exam (subjects scheme)
  total_subjects: '',
  subject_ids: [],
  written_total_marks: '',
  passing_percentage_per_subject: '',
  aggregate_passing_percentage: '',
  // CCE — Screening
  screening_total_marks: '',
  screening_passing_percentage: '',
  // CCE — Written
  compulsory_marks: '',
  optional_marks: '',
  qualification_marks_percentage: '',
  // CCE — Interview
  interview_total_marks: '',
  interview_passing_percentage: '',
  interview_percentage: '',
  is_passing_required: false,
  status: 'active',
};

// Text fields keep their value as-is; every other field is numeric and is
// normalised so backend decimals like "100.00" show as "100", "33.50" as "33.5".
const TEXT_KEYS = new Set(['name', 'description', 'exam_category', 'status']);
const trimNum = (v) => {
  if (v === '' || v === null || v === undefined) return '';
  const n = Number(v);
  return Number.isNaN(n) ? v : String(n);
};
const buildFormFromData = (data) => {
  const merged = { ...EMPTY };
  Object.keys(EMPTY).forEach((k) => {
    if (data[k] === undefined || data[k] === null) return;
    if (k === 'is_passing_required') merged[k] = !!data[k];
    else if (k === 'subject_ids') return; // handled below
    else if (TEXT_KEYS.has(k)) merged[k] = data[k];
    else merged[k] = trimNum(data[k]);
  });
  merged.exam_category = data.exam_category || merged.exam_category;
  // Saved subjects may come back as plain ids or as subject objects.
  const rawSubjects = data.subject_ids ?? data.subjects ?? data.written_exam_subjects;
  if (Array.isArray(rawSubjects)) {
    merged.subject_ids = rawSubjects
      .map((s) => String(s?.hash_id ?? s?.id ?? s ?? ''))
      .filter(Boolean);
  }
  return merged;
};

// Module-scope so it keeps a stable identity and does NOT remount (and drop
// focus) on every keystroke.
const NumberField = ({ label, value, onChange, required = false, placeholder = '', max, error = '' }) => (
  <div className="col-md-6 form-group">
    <TextField
      fullWidth type="number"
      label={label}
      required={required}
      value={value === '' || value === null || value === undefined ? '' : value}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ min: 0, step: '0.01', ...(max ? { max } : {}) }}
      placeholder={placeholder}
      error={!!error}
      helperText={error || ''}
    />
  </div>
);

const Section = ({ index, title, children }) => (
  <div className="border border-slate-200 rounded-xl p-5 mb-4 bg-slate-50/40">
    <div className="flex items-center gap-2 mb-4">
      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center">{index}</span>
      <h3 className="font-bold text-slate-800">{title}</h3>
    </div>
    {children}
  </div>
);

const TestTypeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const isEdit = !!id;

  const canAct = hasPermission(isEdit ? `${PERM}.edit` : `${PERM}.add`);

  // On edit we prefill from the row passed via navigation state.
  const seed = () => {
    if (isEdit && state?.row) return buildFormFromData(state.row);
    return EMPTY;
  };

  const [form, setForm] = useState(seed);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState([]);            // active written exam subjects
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
    setError('');
  };
  const cat = form.exam_category;

  // On edit, fetch the full record from the Show endpoint so every scheme field
  // is populated (the list row may not carry all columns).
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/settings/test-types/${id}`, { headers: getHeaders() });
        const result = await res.json();
        const data = result.data ?? result;
        if (data && (data.exam_category || data.hash_id || data.id)) {
          setForm(buildFormFromData(data));
        }
      } catch { /* keep the navigation-state seed */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Active written exam subjects shown as checkboxes for the written exam scheme.
  useEffect(() => {
    if (cat !== 'written_exam' || subjects.length) return;
    (async () => {
      setSubjectsLoading(true);
      try {
        const result = await WrittenExamSubjectApi.getAll(1, 1000);
        const pagination = result.data ?? {};
        const data = pagination.data ?? result.data ?? [];
        setSubjects(
          (Array.isArray(data) ? data : [])
            .filter((s) => String(s?.status ?? 'active').toLowerCase() === 'active')
            .map((s) => ({
              id: String(s.hash_id ?? s.id ?? ''),
              name: s.subject_name ?? '',
              marks: Number(s.subject_marks ?? s.total_marks ?? s.marks ?? 0),
              designation: s?.designation?.name ?? s?.designation_name ?? '',
            }))
            .filter((s) => s.id && s.name)
        );
      } catch { toast.error('Failed to load written exam subjects'); }
      finally { setSubjectsLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  const toggleSubject = (subjectId) => {
    setForm((f) => {
      const selected = f.subject_ids.includes(subjectId)
        ? f.subject_ids.filter((sid) => sid !== subjectId)
        : [...f.subject_ids, subjectId];
      return { ...f, subject_ids: selected };
    });
    setFieldErrors((fe) => ({ ...fe, subject_ids: undefined }));
    setError('');
  };

  const selectedSubjects = subjects.filter((s) => form.subject_ids.includes(s.id));
  const selectedSubjectsMarks = selectedSubjects.reduce((sum, s) => sum + (s.marks || 0), 0);

  /* ── validation per category → returns an errors object keyed by field ── */
  const validate = () => {
    const e = {};
    if (!cat) { e.exam_category = 'Please select an exam.'; return e; }
    const req = (k, msg = 'This field is required.') => { if (String(form[k] ?? '').trim() === '') e[k] = msg; };

    if (cat === 'one_paper_mcq') {
      req('total_marks', 'Total Marks is required.');
      req('passing_percentage', 'Passing Percentage is required.');
    } else if (cat === 'two_paper_mcq') {
      req('total_marks', 'Total Marks is required.');
      req('passing_percentage', 'Passing Percentage is required.');
      req('paper1_weightage_percentage', 'Paper 1 Weightage is required.');
      req('paper2_weightage_percentage', 'Paper 2 Weightage is required.');
    } else if (cat === 'written_exam') {
      req('written_total_marks', 'Total Marks is required.');
      req('total_subjects', 'Total Subjects is required.');
      req('passing_percentage', 'Passing Marks (%) is required.');
      if (!form.subject_ids.length) e.subject_ids = 'Please select at least one subject.';
    } else if (cat === 'combined_competitive_exam') {
      req('screening_total_marks', 'Total Marks is required.');
      req('screening_passing_percentage', 'Passing Percentage is required.');
      req('compulsory_marks', 'Total Compulsory Marks is required.');
      req('optional_marks', 'Total Optional Marks is required.');
      req('qualification_marks_percentage', 'Qualification Marks (%) is required.');
      req('interview_total_marks', 'Total Marks is required.');
      req('interview_passing_percentage', 'Passing Percentage is required.');
    }
    return e;
  };

  /* ── payload per category (only relevant keys) ── */
  const buildPayload = () => {
    const base = {
      // The dropdown IS the exam name; the name is the selected option's label
      // while exam_category carries the hidden machine value (one_paper_mcq, …).
      name: EXAM_CATEGORIES.find((c) => c.value === cat)?.label || '',
      exam_category: cat,
      status: form.status,
      is_passing_required: !!form.is_passing_required,
    };
    if (form.description.trim()) base.description = form.description.trim();

    const put = (keys) => keys.forEach((k) => {
      if (form[k] !== '' && form[k] !== null && form[k] !== undefined) base[k] = Number(form[k]);
    });

    if (cat === 'one_paper_mcq') {
      put(['total_marks', 'passing_percentage', 'paper_weightage_percentage', 'interview_weightage_percentage']);
    } else if (cat === 'two_paper_mcq') {
      put(['total_marks', 'passing_percentage', 'paper1_weightage_percentage', 'paper2_weightage_percentage', 'interview_weightage_percentage']);
    } else if (cat === 'written_exam') {
      put(['written_total_marks', 'total_subjects', 'passing_percentage', 'qualification_marks_percentage', 'interview_percentage']);
      base.subject_ids = form.subject_ids;
    } else if (cat === 'combined_competitive_exam') {
      put([
        'screening_total_marks', 'screening_passing_percentage',
        'compulsory_marks', 'optional_marks',
        'qualification_marks_percentage',
        'interview_total_marks', 'interview_passing_percentage', 'interview_percentage',
      ]);
    }
    return base;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) { setError('Please fill in the required fields highlighted below.'); return; }
    setSaving(true);
    try {
      const url = isEdit
        ? `${API_BASE}/settings/test-types/${id}/update`
        : `${API_BASE}/settings/test-types/create`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(buildPayload()),
      });
      const result = await res.json();
      if (res.ok || result.success || result.status === 200 || result.status === 201) {
        toast.success(isEdit ? 'Exam/Test Type updated successfully' : 'Exam/Test Type added successfully');
        navigate('/dashboard/settings/test-types');
      } else {
        // Surface Laravel validation errors inline on their fields.
        if (result.errors && typeof result.errors === 'object') {
          const serverErrs = {};
          Object.entries(result.errors).forEach(([k, msgs]) => {
            serverErrs[k] = Array.isArray(msgs) ? msgs[0] : String(msgs);
          });
          setFieldErrors(serverErrs);
          setError('Please fix the highlighted fields.');
        }
        const summary = result.errors ? Object.values(result.errors).flat().join(', ') : '';
        toast.error(summary || result.message || 'Failed to save exam/test type');
      }
    } catch { toast.error('Server error while saving exam/test type'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto bg-white rounded-xl shadow-sm p-6 requisition-form-container" style={{ minWidth: '-webkit-fill-available', minHeight: 'auto' }}>

        {/* HEADER */}
        <div className="mb-6">
          <button onClick={() => navigate('/dashboard/settings/test-types')}
            className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
            <ArrowLeft size={14} /> Back to Exam/Test Types
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><FileText size={22} className="text-emerald-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit' : 'Add'} Exam/Test Type</h1>
              <p className="text-sm text-slate-500">Select an exam type, then fill in its details</p>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {/* EXAM NAME (dropdown — this is the exam name) + DESCRIPTION */}
        <div className="row">
          <div className="col-md-6 form-group">
            <TextField
              select fullWidth required label="Exam Name"
              value={cat}
              onChange={(e) => set('exam_category', e.target.value)}
              disabled={isEdit}
              helperText={isEdit ? 'Exam cannot be changed after creation' : 'Select the exam'}
            >
              <MenuItem value="" disabled>— Select Exam —</MenuItem>
              {EXAM_CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
          </div>
          <div className="col-md-6 form-group">
            <TextField fullWidth label="Description"
              value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Enter description" />
          </div>
        </div>

        {cat && (
          <>

            {/* ── ONE PAPER MCQ ── */}
            {cat === 'one_paper_mcq' && (
              <div className="row">
                <NumberField label="Total Marks" required value={form.total_marks} onChange={(v) => set('total_marks', v)} placeholder="e.g. 200" error={fieldErrors.total_marks} />
                <NumberField label="Passing Percentage (%)" required max={100} value={form.passing_percentage} onChange={(v) => set('passing_percentage', v)} placeholder="0 - 100" error={fieldErrors.passing_percentage} />
                <NumberField label="Paper Weightage (%)" max={100} value={form.paper_weightage_percentage} onChange={(v) => set('paper_weightage_percentage', v)} placeholder="0 - 100" />
                <NumberField label="Interview Weightage (%)" max={100} value={form.interview_weightage_percentage} onChange={(v) => set('interview_weightage_percentage', v)} placeholder="0 - 100" />
              </div>
            )}

            {/* ── TWO PAPER MCQ ── */}
            {cat === 'two_paper_mcq' && (
              <div className="row">
                <NumberField label="Total Marks" required value={form.total_marks} onChange={(v) => set('total_marks', v)} placeholder="e.g. 200" error={fieldErrors.total_marks} />
                <NumberField label="Passing Percentage (%)" required max={100} value={form.passing_percentage} onChange={(v) => set('passing_percentage', v)} placeholder="0 - 100" error={fieldErrors.passing_percentage} />
                <NumberField label="Paper 1 Weightage (%)" required max={100} value={form.paper1_weightage_percentage} onChange={(v) => set('paper1_weightage_percentage', v)} placeholder="0 - 100" error={fieldErrors.paper1_weightage_percentage} />
                <NumberField label="Paper 2 Weightage (%)" required max={100} value={form.paper2_weightage_percentage} onChange={(v) => set('paper2_weightage_percentage', v)} placeholder="0 - 100" error={fieldErrors.paper2_weightage_percentage} />
                <NumberField label="Interview Weightage (%)" max={100} value={form.interview_weightage_percentage} onChange={(v) => set('interview_weightage_percentage', v)} placeholder="0 - 100" />
              </div>
            )}

            {/* ── WRITTEN EXAM ── */}
            {cat === 'written_exam' && (
              <>
                <div className="row">
                  <NumberField label="Total Marks" required value={form.written_total_marks} onChange={(v) => set('written_total_marks', v)} placeholder="e.g. 1200" error={fieldErrors.written_total_marks} />
                  <NumberField label="Total Subjects" required value={form.total_subjects} onChange={(v) => set('total_subjects', v)} placeholder="e.g. 6" error={fieldErrors.total_subjects} />
                  <NumberField label="Passing Marks (%)" required max={100} value={form.passing_percentage} onChange={(v) => set('passing_percentage', v)} placeholder="0 - 100" error={fieldErrors.passing_percentage} />
                  <NumberField label="Qualification Marks (%)" max={100} value={form.qualification_marks_percentage} onChange={(v) => set('qualification_marks_percentage', v)} placeholder="0 - 100" />
                  <NumberField label="Interview (%)" max={100} value={form.interview_percentage} onChange={(v) => set('interview_percentage', v)} placeholder="0 - 100" />
                </div>

                {/* Active written exam subjects — pick which subjects this exam includes */}
                <div className={`border rounded-xl p-5 mb-4 bg-slate-50/40 ${fieldErrors.subject_ids ? 'border-red-400' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="font-bold text-slate-800">Subjects</h3>
                    <span className="text-sm text-slate-500">
                      Selected: {selectedSubjects.length} subject{selectedSubjects.length === 1 ? '' : 's'} — {selectedSubjectsMarks} marks
                    </span>
                  </div>
                  {subjectsLoading ? (
                    <p className="text-sm text-slate-500">Loading subjects…</p>
                  ) : subjects.length === 0 ? (
                    <p className="text-sm text-slate-500">No active written exam subjects found. Add them in Settings → Written Exam Subjects.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4">
                      {subjects.map((s) => (
                        <FormControlLabel
                          key={s.id}
                          control={
                            <Checkbox
                              size="small"
                              checked={form.subject_ids.includes(s.id)}
                              onChange={() => toggleSubject(s.id)}
                              sx={{ color: '#064e3b', '&.Mui-checked': { color: '#064e3b' } }}
                            />
                          }
                          label={
                            <span className="text-lg text-slate-700">
                              {s.name} <span className="font-semibold">({s.marks} marks)</span>
                              {s.designation && <span className="text-slate-400"> — {s.designation}</span>}
                            </span>
                          }
                        />
                      ))}
                    </div>
                  )}
                  {fieldErrors.subject_ids && <p className="text-red-600 text-sm mt-2">{fieldErrors.subject_ids}</p>}
                </div>
              </>
            )}

            {/* ── CCE EXAM (fixed 3 stages, no stage name, no add stage) ── */}
            {cat === 'combined_competitive_exam' && (
              <>
                <Section index={1} title="Stage 1: Screening Test">
                  <div className="row">
                    <NumberField label="Total Marks" required value={form.screening_total_marks} onChange={(v) => set('screening_total_marks', v)} placeholder="Enter total marks" error={fieldErrors.screening_total_marks} />
                    <NumberField label="Passing Percentage (%)" required max={100} value={form.screening_passing_percentage} onChange={(v) => set('screening_passing_percentage', v)} placeholder="Enter percentage" error={fieldErrors.screening_passing_percentage} />
                  </div>
                </Section>

                <Section index={2} title="Stage 2: Written Examination">
                  <div className="row">
                    <NumberField required label="Total Compulsory Marks" value={form.compulsory_marks} onChange={(v) => set('compulsory_marks', v)} placeholder="Enter compulsory marks" error={fieldErrors.compulsory_marks} />
                    <NumberField required label="Total Optional Marks" value={form.optional_marks} onChange={(v) => set('optional_marks', v)} placeholder="Enter optional marks" error={fieldErrors.optional_marks} />
                    <NumberField label="Qualification Marks (%)" required max={100} value={form.qualification_marks_percentage} onChange={(v) => set('qualification_marks_percentage', v)} placeholder="0 - 100" error={fieldErrors.qualification_marks_percentage} />
                  </div>
                </Section>

                <Section index={3} title="Stage 3: Interview / Viva Voce">
                  <div className="row">
                    <NumberField label="Total Marks" required value={form.interview_total_marks} onChange={(v) => set('interview_total_marks', v)} placeholder="Enter total marks" error={fieldErrors.interview_total_marks} />
                    <NumberField label="Passing Percentage (%)" required max={100} value={form.interview_passing_percentage} onChange={(v) => set('interview_passing_percentage', v)} placeholder="Enter percentage" error={fieldErrors.interview_passing_percentage} />
                    <NumberField label="Interview (%)" max={100} value={form.interview_percentage} onChange={(v) => set('interview_percentage', v)} placeholder="0 - 100" />
                  </div>
                </Section>
              </>
            )}

            {/* ACTIONS */}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => navigate('/dashboard/settings/test-types')} disabled={saving}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 text-sm">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !canAct}
                className="px-4 py-2 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 text-white font-medium rounded-lg text-sm disabled:opacity-60">
                {saving ? 'Saving…' : isEdit ? 'Update' : 'Add'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TestTypeForm;
