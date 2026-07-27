import React, { useEffect, useMemo, useState } from 'react';
import { TextField } from '@mui/material';
import { ArrowLeft, Save, CalendarClock, Clock, Users, MapPin } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import PostResultApi from 'api/postResultApi';

const INTERVIEW_VENUE = 'AJK Public Service Commission Main Office';

// Same "Edit Roll Number Slip" page pattern (pages/roll-numbers/RollSlipEditor.jsx) —
// row data is passed in via navigation state to avoid re-fetching the whole
// phases list, with a bounce-back guard if opened directly without context.
const InterviewPhaseEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId, phaseId } = useParams();

  const row = useMemo(() => location.state?.row ?? null, [location.state]);

  const [formData, setFormData] = useState({
    phase_name: '',
    interview_date: '',
    reporting_time: '',
    interview_time: '',
    capacity: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const backPath = `/dashboard/results/post-result/${jobId}`;

  useEffect(() => {
    if (!row) {
      toast.error('Open this page from the Interview Candidates tab (phase row → Edit Interview)');
      navigate(backPath, { replace: true });
    }
  }, [row, navigate, backPath]);

  useEffect(() => {
    if (!row) return;
    setFormData({
      phase_name: row.phase_name || '',
      interview_date: row.interview_date || '',
      reporting_time: row.reporting_time || '',
      interview_time: row.interview_time || '',
      capacity: row.capacity ?? '',
    });
    setLoading(false);
  }, [row]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.phase_name?.trim()) { toast.error('Phase / batch name is required'); return; }
    if (!formData.interview_date) { toast.error('Interview date is required'); return; }

    setSaving(true);
    try {
      await PostResultApi.updateInterviewPhase(phaseId, {
        phase_name: formData.phase_name.trim(),
        interview_date: formData.interview_date,
        reporting_time: formData.reporting_time || null,
        interview_time: formData.interview_time || null,
        capacity: formData.capacity !== '' ? Number(formData.capacity) : null,
      });
      toast.success('Interview phase updated successfully');
      navigate(backPath);
    } catch (err) {
      toast.error(err?.message || 'Failed to update interview phase');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <InlineLoader text="Loading interview phase…" variant="ring" size="lg" />
      </div>
    );
  }

  if (!row) return null;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">

        <button onClick={() => navigate(backPath)}
          className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Post-Result Processing
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-100 rounded-lg"><CalendarClock size={22} className="text-violet-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Interview Phase</h1>
            <p className="text-sm text-slate-500 mt-1">
              {row.phase_name} &middot; <span className="font-mono">{row.call_letters_count ?? 0} candidate(s) assigned</span>
            </p>
          </div>
        </div>

        {/* PHASE SUMMARY */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 mb-6">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-slate-500">Phase / Batch</p><p className="font-semibold">{row.phase_name}</p></div>
            <div><p className="text-xs text-slate-500">Assigned</p><p className="font-semibold">{row.call_letters_count ?? 0}</p></div>
            <div><p className="text-xs text-slate-500">Status</p><p className="font-semibold capitalize">{row.status}</p></div>
            <div><p className="text-xs text-slate-500">Venue</p><p>{row.venue || INTERVIEW_VENUE}</p></div>
          </CardContent>
        </Card>

        {row.status === 'published' && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            This phase is published. Saving changes here will not automatically republish updated call letters —
            unpublish and republish the phase from the Interview Candidates tab if candidates need to see the new schedule.
          </div>
        )}

        {/* EDIT FORM */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2"><CalendarClock size={16} /> Phase / Batch</h2>
          <TextField fullWidth required label="Phase / Batch Name" margin="normal" size="small"
            name="phase_name" value={formData.phase_name} onChange={handleFormChange}
            helperText="e.g. Batch 1" />

          <h2 className="font-semibold text-slate-800 mt-4 mb-1 flex items-center gap-2"><Clock size={16} /> Interview Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextField fullWidth required type="date" label="Interview Date" margin="normal" size="small"
              InputLabelProps={{ shrink: true }}
              name="interview_date" value={formData.interview_date} onChange={handleFormChange}
              helperText="Day name is derived automatically" />
            <TextField fullWidth type="time" label="Reporting Time" margin="normal" size="small"
              InputLabelProps={{ shrink: true }}
              name="reporting_time" value={formData.reporting_time} onChange={handleFormChange} />
            <TextField fullWidth type="time" label="Interview Time" margin="normal" size="small"
              InputLabelProps={{ shrink: true }}
              name="interview_time" value={formData.interview_time} onChange={handleFormChange} />
          </div>

          <h2 className="font-semibold text-slate-800 mt-4 mb-1 flex items-center gap-2"><Users size={16} /> Capacity</h2>
          <TextField fullWidth type="number" label="Capacity (optional)" margin="normal" size="small"
            inputProps={{ min: 1 }}
            name="capacity" value={formData.capacity} onChange={handleFormChange}
            helperText="Leave blank for unlimited candidates in this phase" />

          <h2 className="font-semibold text-slate-800 mt-4 mb-1 flex items-center gap-2"><MapPin size={16} /> Venue</h2>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            <MapPin size={14} className="text-slate-400" /> {INTERVIEW_VENUE} <span className="text-xs text-slate-400">(fixed for every phase)</span>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" size="md" onClick={() => navigate(backPath)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSave} disabled={saving}
              className="flex items-center gap-2">
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPhaseEditor;
