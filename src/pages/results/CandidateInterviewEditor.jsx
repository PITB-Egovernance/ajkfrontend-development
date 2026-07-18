import React, { useEffect, useMemo, useState } from 'react';
import SearchableSelect from 'components/ui/SearchableSelect';
import { ArrowLeft, Save, UserCheck, CalendarClock } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import PostResultApi from 'api/postResultApi';

// "HH:MM" -> "H:MM AM/PM" — same convention as the Roll Slip / Interview
// Phase editors.
const formatTime12h = (value) => {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

// Same "Edit Roll Number Slip" / "Edit Interview Phase" page pattern — row
// data comes in via navigation state to avoid re-fetching the whole
// Interview Candidates list, with a bounce-back guard if opened directly.
//
// A candidate's own interview date/time/venue are inherited from whichever
// phase they're assigned to (there's no per-candidate schedule override in
// the data model — every candidate in a phase shares its schedule), so
// "editing" a candidate's interview details means reassigning their phase.
const CandidateInterviewEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId, letterId } = useParams();

  const row = useMemo(() => location.state?.row ?? null, [location.state]);

  const [phases, setPhases] = useState([]);
  const [phasesLoading, setPhasesLoading] = useState(true);
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [saving, setSaving] = useState(false);

  const backPath = `/dashboard/results/post-result/${jobId}`;

  useEffect(() => {
    if (!row) {
      toast.error('Open this page from the Interview Candidates tab (candidate row → Edit Interview Details)');
      navigate(backPath, { replace: true });
    }
  }, [row, navigate, backPath]);

  useEffect(() => {
    if (!row) return;
    setSelectedPhaseId(row.interview_phase_id ? String(row.interview_phase_id) : '');

    let alive = true;
    (async () => {
      setPhasesLoading(true);
      try {
        const res = await PostResultApi.getInterviewPhases(jobId);
        if (alive) setPhases(res?.data || []);
      } catch (err) {
        toast.error(err?.message || 'Failed to load interview phases');
      } finally {
        if (alive) setPhasesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [row, jobId]);

  const selectedPhase = useMemo(
    () => phases.find((p) => String(p.id) === String(selectedPhaseId)) || null,
    [phases, selectedPhaseId]
  );

  const handleSave = async () => {
    if (!row?.call_letter_id) { toast.error('No call letter generated for this candidate yet'); return; }
    if (row.call_letter_status === 'published') {
      toast.error('This call letter is already published — unpublish it first to change the interview phase');
      return;
    }

    setSaving(true);
    try {
      await PostResultApi.moveCandidate(row.call_letter_id, selectedPhaseId || null);
      toast.success('Interview details updated successfully');
      navigate(backPath);
    } catch (err) {
      toast.error(err?.message || 'Failed to update interview details');
    } finally {
      setSaving(false);
    }
  };

  if (!row) return null;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">

        <button onClick={() => navigate(backPath)}
          className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Post-Result Processing
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-100 rounded-lg"><UserCheck size={22} className="text-violet-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Candidate Interview Details</h1>
            <p className="text-sm text-slate-500 mt-1">
              {row.candidate_name} &middot; <span className="font-mono">{row.roll_number}</span>
            </p>
          </div>
        </div>

        {/* CANDIDATE SUMMARY */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 mb-6">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-slate-500">Roll Number</p><p className="font-mono font-semibold">{row.roll_number}</p></div>
            <div><p className="text-xs text-slate-500">Candidate</p><p className="font-semibold">{row.candidate_name}</p></div>
            <div><p className="text-xs text-slate-500">District</p><p>{row.district || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Call Letter Status</p><p className="capitalize">{row.call_letter_status?.replace(/_/g, ' ') || '—'}</p></div>
          </CardContent>
        </Card>

        {row.call_letter_status === 'published' && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            This candidate's call letter is already published — unpublish it from the Interview Candidates tab before changing their interview phase.
          </div>
        )}

        {/* CURRENT SCHEDULE (read-only, inherited from the assigned phase) */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><CalendarClock size={16} /> Current Interview Schedule</h2>
          {row.interview_phase_name ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-slate-500">Phase / Batch</p><p className="font-semibold">{row.interview_phase_name}</p></div>
              <div><p className="text-xs text-slate-500">Date</p><p>{row.interview_date || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Reporting Time</p><p>{formatTime12h(row.reporting_time) || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Interview Time</p><p>{formatTime12h(row.interview_time) || '—'}</p></div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Not yet assigned to an interview phase.</p>
          )}
        </div>

        {/* EDIT FORM */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2"><CalendarClock size={16} /> Reassign Interview Phase</h2>
          <p className="text-xs text-slate-500 mb-3">
            A candidate's interview date, time and venue are inherited from the phase/batch they're assigned to —
            move them to a different phase below to change their schedule.
          </p>

          {phasesLoading ? (
            <InlineLoader size="sm" />
          ) : (
            <>
              <SearchableSelect
                label="Interview Phase / Batch"
                value={selectedPhaseId}
                onChange={(e) => setSelectedPhaseId(e.target.value)}
                options={phases.map((p) => ({
                  value: String(p.id),
                  label: `${p.phase_name} — ${p.interview_date}${p.interview_time ? ` · ${formatTime12h(p.interview_time)}` : ''}`,
                }))}
                placeholder="Select a phase"
              />

              {selectedPhase && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  New schedule: <strong>{selectedPhase.phase_name}</strong> — {selectedPhase.interview_date}
                  {selectedPhase.reporting_time && <> · Reporting {formatTime12h(selectedPhase.reporting_time)}</>}
                  {selectedPhase.interview_time && <> · Interview {formatTime12h(selectedPhase.interview_time)}</>}
                  <div className="text-xs text-emerald-700 mt-1">Venue: {selectedPhase.venue}</div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" size="md" onClick={() => navigate(backPath)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSave}
              disabled={saving || phasesLoading || row.call_letter_status === 'published'}
              className="flex items-center gap-2">
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateInterviewEditor;
