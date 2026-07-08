// Shared between the CCE Candidate Date Sheet and Roll No Slip Generation
// pages — both need to merge the master date sheet with a candidate's own
// optional-subject selection the same way.

// Same group ordering used across the CCE pages (master date sheet, public syllabus).
export const GROUP_ORDER = ['Compulsory', 'Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G'];

const normalize = (v) => String(v || '').trim().toLowerCase();

export const formatPaperDate = (isoDate) => {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

export const formatPaperDay = (isoDate) => {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { weekday: 'long' });
};

export const formatPaperTime = (time24) => {
  if (!time24) return '—';
  const [h, m] = time24.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// Groups the master date sheet rows the same way the master page does, then
// narrows each optional group down to only the papers the candidate picked.
// Compulsory papers are never candidate-selected — they always come through
// in full, exactly once, for every candidate.
export const buildCandidateDateSheetGroups = (masterRows, selections) => {
  const byGroup = {};
  masterRows.forEach((row) => {
    const group = row.subject_group || 'Compulsory';
    (byGroup[group] ||= []).push(row);
  });

  const known = GROUP_ORDER.filter((g) => byGroup[g]);
  const unknown = Object.keys(byGroup).filter((g) => !GROUP_ORDER.includes(g));

  return [...known, ...unknown]
    .map((group) => {
      if (group === 'Compulsory') return { group, items: byGroup[group] };

      const selectedNames = new Set((selections?.[group] || []).map(normalize));
      const items = byGroup[group].filter((row) => selectedNames.has(normalize(row.subject_name)));
      return { group, items };
    })
    .filter(({ items }) => items.length > 0);
};

// Flat list of every paper across all groups — the unit "date sheet
// complete?" and "roll-slip papers[]" work off of.
export const flattenPapers = (groups) => groups.flatMap(({ items }) => items);

export const isDateSheetComplete = (papers) =>
  papers.length > 0 && papers.every((row) => row.paper_date && row.paper_time && row.duration_minutes);
