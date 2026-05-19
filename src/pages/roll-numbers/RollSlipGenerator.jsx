import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { ArrowLeft, Send, Hash, Users, Building2, CheckCircle2, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberApi from 'api/rollNumberApi';

const EMPTY_FORM = {
  exam_center_id:  '',
  exam_hall_id:    '',
  prefix:          'AJK',
  starting_number: '1001',
  format:          'sequential',
  exam_date:       '',
  attendance_time: '',
};

const RollSlipGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Applications passed in via navigation state
  const applications     = useMemo(() => location.state?.applications ?? [], [location.state]);
  const applicationNumbers = useMemo(() => applications.map((a) => a.application_number ?? a.id), [applications]);

  const [formData,   setFormData]   = useState(EMPTY_FORM);
  const [centers,    setCenters]    = useState([]);
  const [halls,      setHalls]      = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [result,     setResult]     = useState(null);

  // Bounce back if the page was opened directly without any selection
  useEffect(() => {
    if (applications.length === 0) {
      toast.error('No candidates selected — open this page from the shortlisted list');
      navigate('/dashboard/roll-numbers', { replace: true });
    }
  }, [applications.length, navigate]);

  // Load exam centers on mount
  const fetchCenters = useCallback(async () => {
    setLoading(true);
    try {
      const r    = await RollNumberApi.getExamCenters(500);
      const list = r.data?.data ?? r.data ?? [];
      setCenters(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err?.status === 401
        ? 'Session expired — please log in again'
        : (err?.message || 'Failed to load exam centers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCenters(); }, [fetchCenters]);

  // Load halls when center changes
  const fetchHalls = useCallback(async (centerId) => {
    if (!centerId) { setHalls([]); return; }
    try {
      const r = await RollNumberApi.getHallsByCenter(centerId);
      setHalls(r.data ?? []);
    } catch {
      setHalls([]);
    }
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'exam_center_id') {
      setFormData((prev) => ({ ...prev, exam_center_id: value, exam_hall_id: '' }));
      fetchHalls(value);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleGenerate = async () => {
    if (!formData.exam_center_id) { toast.error('Choose an exam center'); return; }
    if (!formData.prefix?.trim()) { toast.error('Enter a roll number prefix'); return; }
    if (!formData.starting_number) { toast.error('Enter a starting number'); return; }

    setGenerating(true);
    try {
      const body = {
        application_numbers: applicationNumbers,
        exam_center_id:      Number(formData.exam_center_id),
        exam_hall_id:        formData.exam_hall_id ? Number(formData.exam_hall_id) : null,
        prefix:              formData.prefix.trim(),
        starting_number:     Number(formData.starting_number),
        format:              formData.format,
        exam_date:           formData.exam_date || null,
        attendance_time:     formData.attendance_time || null,
      };
      const r = await RollNumberApi.generateSlips(body);
      toast.success('Roll number slips generated successfully');
      setResult({
        count: r.data?.generated_count ?? 0,
        slips: r.data?.slips ?? [],
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to generate slips');
    } finally {
      setGenerating(false);
    }
  };

  const downloadSlip = useCallback(async (applicationNumber) => {
    const tid = toast.loading('Preparing slip PDF…');
    try {
      const res = await RollNumberApi.downloadSlip(applicationNumber);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.dismiss(tid);
        toast.error(err.message || 'Failed to download slip');
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `AdmissionSlip_${applicationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.dismiss(tid);
      toast.success('Slip downloaded successfully');
    } catch {
      toast.dismiss(tid);
      toast.error('Could not download slip');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <InlineLoader text="Loading exam centers…" variant="ring" size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <button onClick={() => navigate('/dashboard/roll-numbers')}
          className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Roll Number Management
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-100 rounded-lg"><Hash size={22} className="text-emerald-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Center Allocation &amp; Roll Number Format</h1>
            <p className="text-sm text-slate-500 mt-1">
              Generating slips for <strong>{applications.length}</strong> shortlisted candidate{applications.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Users size={24} className="text-blue-700" />
              <div><p className="text-xs text-blue-700 font-medium">Selected Candidates</p><h2 className="text-xl font-bold text-blue-900">{applications.length}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 size={24} className="text-emerald-700" />
              <div><p className="text-xs text-emerald-700 font-medium">Available Centers</p><h2 className="text-xl font-bold text-emerald-900">{centers.length}</h2></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-violet-700" />
              <div><p className="text-xs text-violet-700 font-medium">Generated</p><h2 className="text-xl font-bold text-violet-900">{result?.count ?? 0}</h2></div>
            </CardContent>
          </Card>
        </div>

        {!result && (
          <>
            {/* ALLOCATION FORM */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="font-semibold text-slate-800 mb-4">Allocation Settings</h2>

              <TextField select fullWidth required label="Exam Center" margin="normal" size="small"
                name="exam_center_id" value={formData.exam_center_id} onChange={handleFormChange}>
                <MenuItem key="none" value="">— Select center —</MenuItem>
                {centers.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name} {c.city ? `(${c.city})` : ''}
                  </MenuItem>
                ))}
              </TextField>

              <TextField select fullWidth label="Exam Hall (optional)" margin="normal" size="small"
                name="exam_hall_id" value={formData.exam_hall_id} onChange={handleFormChange}
                disabled={!formData.exam_center_id || halls.length === 0}
                helperText={!formData.exam_center_id ? 'Choose a center first' : halls.length === 0 ? 'No halls — first active hall will be picked' : ''}>
                <MenuItem key="auto" value="">Auto (first active hall)</MenuItem>
                {halls.map((h) => (
                  <MenuItem key={h.id} value={String(h.id)}>
                    {h.name} {h.capacity ? `— capacity ${h.capacity}` : ''}
                  </MenuItem>
                ))}
              </TextField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TextField fullWidth required label="Roll Number Prefix" margin="normal" size="small"
                  name="prefix" value={formData.prefix} onChange={handleFormChange}
                  helperText="e.g. AJK → AJK-001001" />
                <TextField fullWidth required type="number" inputProps={{ min: 1 }}
                  label="Starting Number" margin="normal" size="small"
                  name="starting_number" value={formData.starting_number} onChange={handleFormChange} />
                <TextField select fullWidth label="Format" margin="normal" size="small"
                  name="format" value={formData.format} onChange={handleFormChange}>
                  <MenuItem key="sequential" value="sequential">Sequential (1001, 1002, 1003 …)</MenuItem>
                  <MenuItem key="random" value="random">Random (shuffled within range)</MenuItem>
                </TextField>
              </div>

              <div className="mt-2 pt-3 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Exam Schedule (printed on slip)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField fullWidth type="date" label="Exam Date" margin="normal" size="small"
                    InputLabelProps={{ shrink: true }}
                    name="exam_date" value={formData.exam_date} onChange={handleFormChange}
                    helperText="Day name is derived automatically (e.g. Sunday)" />
                  <TextField fullWidth label="Attendance Time" margin="normal" size="small"
                    placeholder="e.g. 2:00 PM" name="attendance_time"
                    value={formData.attendance_time} onChange={handleFormChange}
                    helperText="Time candidates must arrive at the centre" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" size="md" onClick={() => navigate('/dashboard/roll-numbers')} disabled={generating}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleGenerate} disabled={generating}
                  className="flex items-center gap-2">
                  <Send size={14} /> {generating ? 'Generating…' : 'Generate Slips'}
                </Button>
              </div>
            </div>

            {/* SELECTED CANDIDATES */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-slate-800 mb-4">Selected Candidates ({applications.length})</h2>
              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold w-12">#</th>
                      <th className="text-left px-3 py-2 font-semibold">Ref ID</th>
                      <th className="text-left px-3 py-2 font-semibold">Candidate</th>
                      <th className="text-left px-3 py-2 font-semibold">CNIC</th>
                      <th className="text-left px-3 py-2 font-semibold">Advertisement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((a, i) => (
                      <tr key={a.application_number ?? a.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs">{a.application_number}</td>
                        <td className="px-3 py-2">{a.applicant_name || a.candidate_name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{a.cnic || a.candidate_cnic || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{a.advertisement_no || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* RESULT VIEW */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={24} className="text-emerald-600" />
              <h2 className="font-bold text-lg text-slate-800">Slips Generated</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {result.count} roll number slip{result.count === 1 ? '' : 's'} generated successfully.
            </p>
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Ref ID</th>
                    <th className="text-left px-3 py-2 font-semibold">Candidate</th>
                    <th className="text-left px-3 py-2 font-semibold">Roll Number</th>
                    <th className="text-left px-3 py-2 font-semibold">Center</th>
                    <th className="text-left px-3 py-2 font-semibold">Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {result.slips.map((s) => (
                    <tr key={s.application_number} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs">{s.application_number}</td>
                      <td className="px-3 py-2">{s.candidate_name}</td>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-700">{s.roll_number}</td>
                      <td className="px-3 py-2 text-slate-600">{s.exam_center}{s.exam_city ? ` — ${s.exam_city}` : ''}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => downloadSlip(s.application_number)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded font-medium">
                          <Download size={12}/> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => navigate('/dashboard/roll-numbers')}>
                Back to List
              </Button>
              <Button variant="primary" size="md"
                onClick={() => result.slips.forEach((s) => downloadSlip(s.application_number))}
                className="flex items-center gap-2">
                <Download size={14}/> Download All
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RollSlipGenerator;
