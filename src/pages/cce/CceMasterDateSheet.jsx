import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TextField, MenuItem, Tabs, Tab, ListItemText } from '@mui/material';
import { Calendar, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import CceScreeningApi from 'api/cceScreeningApi';
import CceDateSheetApi from 'api/cceDateSheetApi';
import { groupByClubbedAdvertisements } from 'utils/cceClubbing';

// Same group ordering as the public CCE syllabus page (SubjectsSyllabus.jsx).
const GROUP_ORDER = ['Compulsory', 'Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G'];

// Group A/B subjects are worth 200 marks split across two 100-mark sittings,
// so each gets its own Paper I / Paper II schedule. Every other group's
// subjects are scheduled as a single paper, one shared schedule per group.
const TWO_PAPER_GROUPS = ['Group A', 'Group B'];

const dayFromDate = (date) => (date ? new Date(date).toLocaleDateString(undefined, { weekday: 'long' }) : '—');

const CceMasterDateSheet = () => {
  const [advertisements, setAdvertisements] = useState([]);
  const [advertisementsLoading, setAdvertisementsLoading] = useState(true);
  const [groupedJobs, setGroupedJobs] = useState([]);
  // advertisementId is the one shown/edited in the grid below; advertisementIds
  // is the full clubbed group it belongs to (just itself when not clubbed) —
  // a clubbed candidate sits one written exam covering every clubbed post, so
  // the schedule must be saved identically to every id in that group, never
  // just the one selected in the dropdown.
  const [advertisementId, setAdvertisementId] = useState('');
  const [advertisementIds, setAdvertisementIds] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState('Compulsory');

  useEffect(() => {
    (async () => {
      setAdvertisementsLoading(true);
      try {
        // Reuse the CCE Screening advertisement list — already scoped to
        // advertisements with at least one generated CCE roll number, and
        // already annotated with clubbed_advertisement_ids.
        const res = await CceScreeningApi.advertisements();
        const list = res?.data ?? [];
        const safeList = Array.isArray(list) ? list : [];
        setAdvertisements(safeList);

        const groups = groupByClubbedAdvertisements(safeList);
        setGroupedJobs(groups);

        if (groups.length > 0) {
          const defaultEntry = groups[0];
          setAdvertisementId(defaultEntry.advId);
          setAdvertisementIds(defaultEntry.advIds);
          setSelectedEntry(defaultEntry);
        }
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
      const list = Array.isArray(res?.data) ? res.data : [];
      setRows(list);
    } catch (err) {
      toast.error(err?.message || 'Failed to load master date sheet');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [advertisementId]);

  useEffect(() => { loadRows(); }, [loadRows]);

  // Group rows by subject_group, in the standard CCE syllabus order —
  // ungrouped/unknown groups are appended at the end rather than dropped.
  const groupedRows = useMemo(() => {
    const byGroup = {};
    rows.forEach((row) => {
      const group = row.subject_group || 'Compulsory';
      (byGroup[group] ||= []).push(row);
    });
    const known = GROUP_ORDER.filter((g) => byGroup[g]);
    const unknown = Object.keys(byGroup).filter((g) => !GROUP_ORDER.includes(g));
    return [...known, ...unknown].map((group) => ({ group, items: byGroup[group] }));
  }, [rows]);

  const presentGroups = useMemo(() => groupedRows.map((g) => g.group), [groupedRows]);

  // Keep the active tab valid as data loads/changes — default to the first
  // group that actually has rows.
  useEffect(() => {
    if (presentGroups.length > 0 && !presentGroups.includes(activeTab)) {
      setActiveTab(presentGroups[0]);
    }
  }, [presentGroups, activeTab]);

  const activeGroupRows = useMemo(
    () => groupedRows.find((g) => g.group === activeTab)?.items ?? [],
    [groupedRows, activeTab]
  );
  const isTwoPaperGroup = TWO_PAPER_GROUPS.includes(activeTab);
  const isCompulsory = activeTab === 'Compulsory';

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  // Applies one date/time/duration to every row in the given group (and, for
  // Group A/B, only to rows matching the given paper label) — the values
  // entered for one group tab never leak into any other group's rows.
  const updateGroupSchedule = (group, paperLabel, field, value) => {
    setRows((prev) => prev.map((r) => (
      r.subject_group === group && (r.paper_label ?? null) === paperLabel
        ? { ...r, [field]: value }
        : r
    )));
  };

  const groupScheduleValue = (group, paperLabel, field) => {
    const match = rows.find((r) => r.subject_group === group && (r.paper_label ?? null) === paperLabel);
    return match ? (match[field] || '') : '';
  };

  const handleSave = async () => {
    const complete = rows.filter((r) => r.paper_date && r.paper_time && r.duration_minutes);
    if (complete.length === 0) {
      toast.error('Fill in date, time, and duration for at least one paper before saving');
      return;
    }

    setSaving(true);
    try {
      // Saved to every advertisement in the clubbed group at once (just
      // [advertisementId] when not clubbed) — see CceMasterDateSheetService::save().
      await CceDateSheetApi.saveMasterDateSheet(
        advertisementIds.length > 0 ? advertisementIds : advertisementId,
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

  // A group-level schedule block (used for Group A/B's Paper I/II, and for
  // the single shared schedule in every other non-Compulsory group). Plain
  // render function, not a nested component — a nested component would get a
  // fresh type identity on every render and remount (losing input focus on
  // every keystroke).
  const renderGroupScheduleFields = (group, paperLabel, title) => {
    const dateVal     = groupScheduleValue(group, paperLabel, 'paper_date');
    const timeVal     = groupScheduleValue(group, paperLabel, 'paper_time');
    const durationVal = groupScheduleValue(group, paperLabel, 'duration_minutes');
    return (
      <div key={`${group}-${paperLabel || ''}`} className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
        {title && <p className="text-sm font-bold text-indigo-900 mb-3">{title}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <TextField type="date" size="small" label="Paper Date *" required InputLabelProps={{ shrink: true }}
            error={!dateVal} value={dateVal}
            onChange={(e) => updateGroupSchedule(group, paperLabel, 'paper_date', e.target.value)}
            sx={{ backgroundColor: 'white' }} />
          <TextField size="small" label="Paper Day" InputProps={{ readOnly: true }} disabled
            value={dayFromDate(dateVal)} sx={{ backgroundColor: 'white' }} />
          <TextField type="time" size="small" label="Paper Time *" required InputLabelProps={{ shrink: true }}
            error={!timeVal} value={timeVal}
            onChange={(e) => updateGroupSchedule(group, paperLabel, 'paper_time', e.target.value)}
            sx={{ backgroundColor: 'white' }} />
          <TextField type="number" size="small" label="Duration (min) *" required inputProps={{ min: 1 }}
            error={!durationVal} value={durationVal}
            onChange={(e) => updateGroupSchedule(group, paperLabel, 'duration_minutes', e.target.value)}
            sx={{ backgroundColor: 'white' }} />
        </div>
      </div>
    );
  };

  // Read-only list of subjects a group-level schedule applies to. Also a
  // plain render function for the same reason as above.
  const renderGroupSubjectList = (items) => {
    const uniqueSubjects = [];
    const seen = new Set();
    items.forEach((row) => {
      if (seen.has(row.subject_id)) return;
      seen.add(row.subject_id);
      uniqueSubjects.push(row);
    });
    return (
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Applies to</p>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-sm text-slate-700">
          {uniqueSubjects.map((row) => (
            <li key={row.subject_id} className="flex justify-between gap-2">
              <span>{row.subject_name}</span>
              <span className="text-slate-400">{row.total_marks} marks</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

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
          {groupedJobs.length > 0 && (
            <TextField
              select
              size="small"
              label="Job Post / Exam"
              value={advertisementId}
              onChange={(e) => {
                const val = e.target.value;
                const matchedEntry = groupedJobs.find((j) => j.advId === val);
                setAdvertisementId(val);
                setAdvertisementIds(matchedEntry?.advIds || [val]);
                setSelectedEntry(matchedEntry || null);
              }}
              sx={{ minWidth: 280, maxWidth: 380, backgroundColor: 'white' }}
              SelectProps={{
                renderValue: (val) => {
                  const entry = groupedJobs.find((j) => j.advId === val);
                  return (
                    <span
                      title={entry?.designation || ''}
                      style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {entry?.designation || ''}
                    </span>
                  );
                },
              }}
            >
              {groupedJobs.map((entry) => (
                <MenuItem key={entry.advId} value={entry.advId} title={entry.designation}>
                  <ListItemText
                    primary={entry.designation}
                    secondary={entry.isClubbedGroup ? 'Clubbed Job Post Group' : `Adv: ${entry.adv_number || 'N/A'}`}
                    primaryTypographyProps={{ noWrap: true, sx: { maxWidth: 340 } }}
                  />
                </MenuItem>
              ))}
            </TextField>
          )}
        </div>

        {/* Full, non-truncated post list for the selected job/exam — the same
            schedule below is saved to every clubbed advertisement together. */}
        {selectedEntry && (
          <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              {selectedEntry.isClubbedGroup ? 'Clubbed Job Posts — schedule saved to all of them' : 'Job Post'}
            </p>
            <p className="text-sm font-medium text-indigo-900 mt-1 break-words">
              {selectedEntry.designation}
            </p>
          </div>
        )}

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
                <Tabs
                  value={activeTab}
                  onChange={(e, val) => setActiveTab(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                  {presentGroups.map((group) => (
                    <Tab key={group} value={group} label={group} />
                  ))}
                </Tabs>

                <div className="p-4 space-y-4">
                  {isCompulsory ? (
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
                          {activeGroupRows.map((row) => {
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
                                <td className="py-2 px-4 text-slate-500">{dayFromDate(row.paper_date)}</td>
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
                        </tbody>
                      </table>
                    </div>
                  ) : isTwoPaperGroup ? (
                    <>
                      {renderGroupScheduleFields(activeTab, 'Paper I', 'Paper I Schedule')}
                      {renderGroupScheduleFields(activeTab, 'Paper II', 'Paper II Schedule')}
                      {renderGroupSubjectList(activeGroupRows)}
                    </>
                  ) : (
                    <>
                      {renderGroupScheduleFields(activeTab, null, `${activeTab} Schedule`)}
                      {renderGroupSubjectList(activeGroupRows)}
                    </>
                  )}
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
