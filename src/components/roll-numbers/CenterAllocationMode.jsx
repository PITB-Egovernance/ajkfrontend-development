import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import RollNumberApi from 'api/rollNumberApi';

// Center allocation bundles the exam schedule too (date/time), mirroring
// the old one-shot flow where "where" and "when" were always one action —
// skipped entirely for a CCE Written batch, whose schedule lives in
// cce_candidate_date_sheets instead (set later, at final slip generation).
const CenterAllocationMode = ({ batch, onAllocateAutomatic, onAllocateCustom, allocating = false }) => {
  const [mode, setMode] = useState('automatic');
  const [strategy, setStrategy] = useState('preference');
  const [centers, setCenters] = useState([]);
  const [selectedCenterIds, setSelectedCenterIds] = useState([]);
  const [customCenterId, setCustomCenterId] = useState('');
  const [startRollNumber, setStartRollNumber] = useState('');
  const [endRollNumber, setEndRollNumber] = useState('');
  const [examDate, setExamDate] = useState('');
  const [attendanceTime, setAttendanceTime] = useState('');

  const isWrittenStage = batch?.exam_type === 'cce-exams' && batch?.stage === 'written';

  useEffect(() => {
    RollNumberApi.getExamCenters().then((res) => {
      const list = res?.data?.data || res?.data || [];
      setCenters(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, []);

  const schedule = () => (isWrittenStage ? {} : {
    exam_date: examDate || undefined,
    attendance_time: attendanceTime || undefined,
  });

  const toggleCenter = (id) => {
    setSelectedCenterIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const scheduleFields = !isWrittenStage && (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm text-slate-500 mb-1">Exam Date</label>
        <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm text-slate-500 mb-1">Attendance Time</label>
        <input type="time" value={attendanceTime} onChange={(e) => setAttendanceTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Center Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <button type="button" onClick={() => setMode('automatic')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${mode === 'automatic' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="font-semibold text-slate-900">Automatic</div>
            <div className="text-sm text-slate-500">By District or Preference.</div>
          </button>
          <button type="button" onClick={() => setMode('custom')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${mode === 'custom' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="font-semibold text-slate-900">Custom</div>
            <div className="text-sm text-slate-500">Pick a center and a roll number range.</div>
          </button>
        </div>

        {mode === 'automatic' ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={strategy === 'district'} onChange={() => setStrategy('district')} /> District
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={strategy === 'preference'} onChange={() => setStrategy('preference')} /> Preference
              </label>
            </div>

            {strategy === 'preference' && (
              <div>
                <label className="block text-sm text-slate-500 mb-2">Candidate centers (choose one or more)</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {centers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCenter(c.id)}
                      className={`rounded-full border px-3 py-1 text-sm ${selectedCenterIds.includes(c.id) ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'}`}
                    >
                      {c.name} ({c.city})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scheduleFields}

            <Button
              variant="primary"
              disabled={allocating || (strategy === 'preference' && selectedCenterIds.length === 0)}
              onClick={() => onAllocateAutomatic({ strategy, center_ids: selectedCenterIds, ...schedule() })}
            >
              {allocating ? 'Allocating…' : 'Allocate Centers'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Center</label>
              <select value={customCenterId} onChange={(e) => setCustomCenterId(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">Select a center…</option>
                {centers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.city})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">Start Roll Number</label>
                <input value={startRollNumber} onChange={(e) => setStartRollNumber(e.target.value)} placeholder="OPM-10001" className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono" />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">End Roll Number</label>
                <input value={endRollNumber} onChange={(e) => setEndRollNumber(e.target.value)} placeholder="OPM-15000" className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono" />
              </div>
            </div>

            {scheduleFields}

            <Button
              variant="primary"
              disabled={allocating || !customCenterId || !startRollNumber || !endRollNumber}
              onClick={() => onAllocateCustom({
                center_id: customCenterId,
                start_roll_number: startRollNumber,
                end_roll_number: endRollNumber,
                ...schedule(),
              })}
            >
              {allocating ? 'Allocating…' : 'Allocate Range'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CenterAllocationMode;
