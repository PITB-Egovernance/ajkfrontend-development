import React, { useState, useEffect, useCallback } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { Calendar, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import CceScreeningApi from 'api/cceScreeningApi';
import CceDateSheetApi from 'api/cceDateSheetApi';

// Same group ordering as the public CCE syllabus page (SubjectsSyllabus.jsx).
const GROUP_ORDER = ['Compulsory', 'Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G'];

const CceMasterDateSheet = () => {
  const [advertisements, setAdvertisements] = useState([]);
  const [advertisementsLoading, setAdvertisementsLoading] = useState(true);
  const [advertisementId, setAdvertisementId] = useState('');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setAdvertisementsLoading(true);
      try {
        // Reuse the CCE Screening advertisement list — already scoped to
        // advertisements with at least one generated CCE roll number.
        const res = await CceScreeningApi.advertisements();
        const list = res?.data ?? [];
        setAdvertisements(Array.isArray(list) ? list : []);
        if (list.length > 0) setAdvertisementId(list[0].hash_id || list[0].id);
      } catch (err) {
        toast.error(err?.message || 'Failed to load advertisements');
      } finally {
        setAdvertisementsLoading(false);
      }
    })();
  }, []);

  const loadRows = useCallback(async () => {
    if (!advertisementId) return;
    setLoading(true);
    try {
      const res = await CceDateSheetApi.getMasterDateSheet(advertisementId);
      const list = res?.data ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err?.message || 'Failed to load master date sheet');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [advertisementId]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    const complete = rows.filter((r) => r.paper_date && r.paper_time && r.duration_minutes);
    if (complete.length === 0) {
      toast.error('Fill in date, time, and duration for at least one paper before saving');
      return;
    }

    setSaving(true);
    try {
      await CceDateSheetApi.saveMasterDateSheet(
        advertisementId,
        complete.map((r) => ({
          subject_id:        r.subject_id,
          paper_label:       r.paper_label,
          paper_date:        r.paper_date,
          paper_time:        r.paper_time,
          duration_minutes:  Number(r.duration_minutes),
        }))
      );
      toast.success('Master date sheet saved successfully');
      await loadRows();
    } catch (err) {
      toast.error(err?.message || 'Failed to save master date sheet');
    } finally {
      setSaving(false);
    }
  };

  // Group rows by subject_group, in the standard CCE syllabus order —
  // ungrouped/unknown groups are appended at the end rather than dropped.
  const groupedRows = (() => {
    const byGroup = {};
    rows.forEach((row) => {
      const group = row.subject_group || 'Compulsory';
      (byGroup[group] ||= []).push(row);
    });
    const known = GROUP_ORDER.filter((g) => byGroup[g]);
    const unknown = Object.keys(byGroup).filter((g) => !GROUP_ORDER.includes(g));
    return [...known, ...unknown].map((group) => ({ group, items: byGroup[group] }));
  })();

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg"><Calendar size={22} className="text-indigo-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">CCE Master Date Sheet</h1>
              <p className="text-sm text-slate-500 mt-1">Set the written-paper schedule used to auto-fill every candidate's date sheet.</p>
            </div>
          </div>
          {advertisements.length > 0 && (
            <TextField
              select
              size="small"
              label="Advertisement"
              value={advertisementId}
              onChange={(e) => setAdvertisementId(e.target.value)}
              sx={{ minWidth: 260, backgroundColor: 'white' }}
            >
              {advertisements.map((ad) => (
                <MenuItem key={ad.hash_id || ad.id} value={ad.hash_id || ad.id}>
                  {ad.adv_number || ad.title || `Advertisement #${ad.id}`}
                </MenuItem>
              ))}
            </TextField>
          )}
        </div>

        {advertisementsLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-10 flex justify-center">
            <InlineLoader text="Loading advertisements..." variant="ring" size="lg" />
          </div>
        ) : advertisements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
              <Calendar size={32} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700">No CCE Screening Roll Numbers Yet</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">A master date sheet can only be prepared once CCE screening roll numbers have been generated.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-10 flex justify-center">
                <InlineLoader text="Loading master date sheet..." variant="ring" size="lg" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-slate-100 rounded-full mb-4">
                  <Calendar size={32} className="text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700">No active CCE subjects found</p>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">Add subjects in Settings → Subjects before preparing the master date sheet.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 bg-slate-50">
                        <th className="py-2 px-4">Subject / Paper</th>
                        <th className="py-2 px-4">Marks</th>
                        <th className="py-2 px-4">Paper Date</th>
                        <th className="py-2 px-4">Paper Day</th>
                        <th className="py-2 px-4">Paper Time</th>
                        <th className="py-2 px-4">Duration (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedRows.map(({ group, items }) => (
                        <React.Fragment key={group}>
                          <tr className="bg-indigo-50/60">
                            <td colSpan={6} className="py-1.5 px-4 text-xs font-bold uppercase text-indigo-800">{group}</td>
                          </tr>
                          {items.map((row) => {
                            const index = rows.indexOf(row);
                            return (
                              <tr key={`${row.subject_id}-${row.paper_label || ''}`} className="border-b border-slate-100">
                                <td className="py-2 px-4 font-medium text-slate-800">
                                  {row.subject_name}{row.paper_label ? ` — ${row.paper_label}` : ''}
                                </td>
                                <td className="py-2 px-4 text-slate-500">{row.total_marks}</td>
                                <td className="py-2 px-4">
                                  <TextField type="date" size="small" InputLabelProps={{ shrink: true }}
                                    value={row.paper_date || ''} onChange={(e) => updateRow(index, 'paper_date', e.target.value)} />
                                </td>
                                <td className="py-2 px-4 text-slate-500">
                                  {row.paper_date ? new Date(row.paper_date).toLocaleDateString(undefined, { weekday: 'long' }) : '—'}
                                </td>
                                <td className="py-2 px-4">
                                  <TextField type="time" size="small" InputLabelProps={{ shrink: true }}
                                    value={row.paper_time || ''} onChange={(e) => updateRow(index, 'paper_time', e.target.value)} />
                                </td>
                                <td className="py-2 px-4">
                                  <TextField type="number" size="small" sx={{ width: 100 }} inputProps={{ min: 1 }}
                                    value={row.duration_minutes || ''} onChange={(e) => updateRow(index, 'duration_minutes', e.target.value)} />
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end p-4 border-t border-slate-100">
                  <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                    <Save size={14} /> {saving ? 'Saving…' : 'Save Master Date Sheet'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CceMasterDateSheet;
