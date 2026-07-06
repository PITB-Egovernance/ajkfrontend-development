import React, { useState, useEffect, useMemo } from 'react';
import SearchableSelect from 'components/ui/SearchableSelect';
import { TextField } from '@mui/material';
import { ArrowLeft, Save, Hash, Building2, Calendar, Clock } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import RollNumberApi from 'api/rollNumberApi';

// HH:MM → "H:MM AM/PM"
const formatTime12h = (value) => {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

// "2:00 PM" → "14:00" (best-effort, accepts already-24h-formatted input too)
const parseTime24h = (value) => {
  if (!value) return '';
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(value.trim());
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const mins = m[2];
  const period = (m[3] || '').toUpperCase();
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${mins}`;
};

const RollSlipEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationNumber } = useParams();

  // Row data passed in via navigation state (avoids re-fetching the whole list)
  const row = useMemo(() => location.state?.row ?? null, [location.state]);

  const [formData, setFormData] = useState({
    roll_number:     '',
    exam_center_id:  '',
    seat_number:     '',
    exam_date:       '',
    attendance_time: '',
  });
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // Bounce back if opened directly without context
  useEffect(() => {
    if (!row) {
      toast.error('Open this page from the Roll Number list (slip row → Edit Slip)');
      navigate('/dashboard/roll-numbers', { replace: true });
    }
  }, [row, navigate]);

  // Initial load: centers + pre-fill form from row state
  useEffect(() => {
    if (!row) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r    = await RollNumberApi.getExamCenters(500);
        const list = r.data?.data ?? r.data ?? [];
        if (!alive) return;
        setCenters(Array.isArray(list) ? list : []);

        setFormData({
          roll_number:     row.roll_number ?? '',
          exam_center_id:  row.exam_center_id ? String(row.exam_center_id) : '',
          seat_number:     row.seat_number ?? '',
          exam_date:       row.exam_date ?? '',
          attendance_time: parseTime24h(row.attendance_time ?? ''),
        });
      } catch (err) {
        toast.error(err?.status === 401
          ? 'Session expired — please log in again'
          : (err?.message || 'Failed to load slip data'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [row]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.roll_number?.trim()) { toast.error('Roll number is required'); return; }
    if (!formData.exam_center_id)      { toast.error('Choose an exam center'); return; }

    setSaving(true);
    try {
      await RollNumberApi.updateSlip(applicationNumber, {
        roll_number:     formData.roll_number.trim(),
        exam_center_id:  formData.exam_center_id,
        seat_number:     formData.seat_number?.trim() || null,
        exam_date:       formData.exam_date || null,
        attendance_time: formData.attendance_time ? formatTime12h(formData.attendance_time) : null,
      });
      toast.success('Roll number slip updated successfully');
      navigate('/dashboard/roll-numbers');
    } catch (err) {
      toast.error(err?.message || 'Failed to update slip');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <InlineLoader text="Loading slip data…" variant="ring" size="lg" />
      </div>
    );
  }

  if (!row) return null;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">

        <button onClick={() => navigate('/dashboard/roll-numbers')}
          className="text-sm text-slate-500 flex items-center gap-1 mb-2 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Roll Number Management
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-100 rounded-lg"><Hash size={22} className="text-violet-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Roll Number Slip</h1>
            <p className="text-sm text-slate-500 mt-1">
              {row.applicant_name} &middot; <span className="font-mono">{row.application_number}</span>
            </p>
          </div>
        </div>

        {/* CANDIDATE SUMMARY */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 mb-6">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-slate-500">Ref ID</p><p className="font-mono font-semibold">{row.application_number}</p></div>
            <div><p className="text-xs text-slate-500">Candidate</p><p className="font-semibold">{row.applicant_name}</p></div>
            <div><p className="text-xs text-slate-500">CNIC</p><p className="font-mono">{row.cnic}</p></div>
            <div><p className="text-xs text-slate-500">Advertisement</p><p>{row.advertisement_no}</p></div>
          </CardContent>
        </Card>

        {/* EDIT FORM */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2"><Hash size={16} /> Roll Number</h2>
          <TextField fullWidth required label="Roll Number" margin="normal" size="small"
            name="roll_number" value={formData.roll_number} onChange={handleFormChange}
            helperText="e.g. AJK-001001" />

          <h2 className="font-semibold text-slate-800 mt-4 mb-1 flex items-center gap-2"><Building2 size={16} /> Centre Allocation</h2>
          <div style={{ marginTop: 16 }}>
            <SearchableSelect
              required
              label="Exam Center"
              name="exam_center_id"
              value={formData.exam_center_id}
              onChange={handleFormChange}
              options={[
                { value: '', label: '— Select center —' },
                ...centers.map((c) => {
                  const value = c.id != null ? String(c.id) : c.hash_id;
                  return { value, label: `${c.name}${c.city ? ` (${c.city})` : ''}` };
                }),
              ]}
              placeholder="— Select center —"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField fullWidth label="Seat Number (optional)" margin="normal" size="small"
              name="seat_number" value={formData.seat_number} onChange={handleFormChange}
              helperText="Optional seat assignment" />
          </div>

          <h2 className="font-semibold text-slate-800 mt-4 mb-1 flex items-center gap-2"><Calendar size={16} /> Exam Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField fullWidth type="date" label="Exam Date" margin="normal" size="small"
              InputLabelProps={{ shrink: true }}
              name="exam_date" value={formData.exam_date} onChange={handleFormChange}
              helperText="Day name is derived automatically (e.g. Sunday)" />
            <TextField fullWidth type="time" label="Attendance Time" margin="normal" size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              name="attendance_time" value={formData.attendance_time} onChange={handleFormChange}
              helperText={formData.attendance_time
                ? `Will print as: ${formatTime12h(formData.attendance_time)}`
                : 'Time candidates must arrive at the centre (5-minute steps)'} />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" size="md" onClick={() => navigate('/dashboard/roll-numbers')} disabled={saving}>
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

export default RollSlipEditor;
