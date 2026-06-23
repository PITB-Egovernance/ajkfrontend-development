import React, { useState, useEffect } from "react";
import { InlineLoader } from "components/ui/Loader";
import toast from "react-hot-toast";
import SubjectApi from "api/subjectApi";

/*
 * Public syllabus view — mirrors "Schedule A" of the AJK PSC CCE notification.
 * The page chrome (organisation header, schedule heading, notification line and
 * the standing instructions) is fixed text taken from the official document,
 * while the subject names and marks are fetched live from the subjects API.
 *
 * This page is intentionally NOT wired into the sidebar. Reach it directly at:
 *   /dashboard/settings/subjects-syllabus
 */

// Order the optional groups are presented in on the printed schedule.
const GROUP_ORDER = [
  "Group A",
  "Group B",
  "Group C",
  "Group D",
  "Group E",
  "Group F",
  "Group G",
];

const SubjectsSyllabus = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // Multiple optional subjects may be chosen per group:
  // { "Group A": ["<name>", ...], ... }.
  const [selected, setSelected] = useState({});

  const toggleSelect = (groupName, subjectName) => {
    setSelected((prev) => {
      const current = prev[groupName] ?? [];
      const next = current.includes(subjectName)
        ? current.filter((n) => n !== subjectName) // uncheck
        : [...current, subjectName]; // check
      return { ...prev, [groupName]: next };
    });
  };

  useEffect(() => {
    // The subjects API is paginated (default 15/page), so the syllabus walks
    // every page and stitches the results together before grouping.
    const PER_PAGE = 100;

    const pageRows = (result) => {
      const payload = result?.data ?? {};
      return payload.data ?? (Array.isArray(result?.data) ? result.data : []);
    };

    const lastPage = (result) => {
      const payload = result?.data ?? {};
      if (payload.last_page) return Number(payload.last_page);
      if (payload.total && payload.per_page)
        return Math.ceil(Number(payload.total) / Number(payload.per_page));
      return 1;
    };

    const fetchAll = async () => {
      setLoading(true);
      try {
        const first = await SubjectApi.getAll(1, PER_PAGE);
        let all = pageRows(first);

        const pages = lastPage(first);
        if (pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: pages - 1 }, (_, i) =>
              SubjectApi.getAll(i + 2, PER_PAGE)
            )
          );
          rest.forEach((r) => {
            all = all.concat(pageRows(r));
          });
        }

        setSubjects(
          (Array.isArray(all) ? all : [])
            .filter((s) => (s.status ?? "active") === "active")
            .map((s) => ({
              subject_name: s.subject_name,
              subject_group: s.subject_group,
              total_marks: s.total_marks,
            }))
        );
      } catch {
        toast.error("Failed to load syllabus");
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Group subjects by their `subject_group`.
  const byGroup = (group) => subjects.filter((s) => s.subject_group === group);

  const compulsory = byGroup("Compulsory");
  const compulsoryTotal = compulsory.reduce(
    (sum, s) => sum + (Number(s.total_marks) || 0),
    0
  );

  // Only render optional groups that actually have subjects.
  const optionalGroups = GROUP_ORDER.map((g) => ({
    name: g,
    items: byGroup(g),
  })).filter((g) => g.items.length > 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <InlineLoader text="Loading syllabus..." variant="ring" size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-md border border-slate-300 p-8 md:p-12 text-slate-900 font-serif">

        {/* ── ORGANISATION HEADER ── */}
        <div className="relative text-center leading-tight mb-2">
          <img
            src="/assets/img/favicon/Logo.png"
            alt="AJK PSC monogram"
            className="absolute left-0 top-0 w-16 h-16 md:w-20 md:h-20 object-contain"
          />
          <h1 className="text-xl md:text-2xl font-bold uppercase">
            Azad Government of the State <br />
            of Jammu &amp; Kashmir
          </h1>
          <p className="text-sm italic">Jalalabad, Muzaffarabad.</p>
        </div>

        {/* ── SCHEDULE HEADING ── */}
        <div className="text-center mt-4 mb-1">
          <p className="text-lg font-bold underline">Schedule &ndash; &ldquo;A&rdquo;</p>
        </div>

        <h3 className="text-center text-base md:text-lg font-bold uppercase mt-3 mb-4">
          Syllabus for Combined Competitive Examination (CCE)
        </h3>

        {/* ── COMPULSORY SUBJECTS ── */}
        <SectionBanner>Compulsory Subjects (Total 600 Marks)</SectionBanner>

        <table className="w-full border border-slate-400 text-sm mb-6">
          <tbody>
            {compulsory.map((s, i) => (
              <tr key={`comp-${i}`} className="border-b border-slate-300">
                <td className="w-8 px-2 py-1 align-top text-right">{i + 1}.</td>
                <td className="px-2 py-1">{s.subject_name}</td>
                <td className="w-20 px-2 py-1 text-right font-semibold">
                  {s.total_marks}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td />
              <td className="px-2 py-1 text-center">Total</td>
              <td className="px-2 py-1 text-right">{compulsoryTotal || 600}</td>
            </tr>
          </tbody>
        </table>

        {/* ── OPTIONAL SUBJECTS ── */}
        <SectionBanner>Optional Subjects (Total 600 Marks)</SectionBanner>

        <p className="text-center text-xs md:text-sm font-semibold mb-4 px-2">
          The candidates are not allowed to opt more than one subject from one
          group of the optional subjects indicated herein below (Total 600
          Marks)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {optionalGroups.map((group, idx) => {
            // When there's an odd number of groups, the lone last one is
            // centered across both columns to match the printed schedule.
            const isLoneLast =
              idx === optionalGroups.length - 1 && optionalGroups.length % 2 === 1;
            return (
              <div
                key={group.name}
                className={
                  isLoneLast
                    ? "md:col-span-2 md:w-1/2 md:mx-auto"
                    : undefined
                }
              >
                <GroupTable
                  group={group}
                  selectedSubjects={selected[group.name] ?? []}
                  onToggle={toggleSelect}
                />
              </div>
            );
          })}
        </div>

        {optionalGroups.length === 0 && (
          <p className="text-center text-sm text-slate-500 mt-2">
            No optional subjects available.
          </p>
        )}
      </div>
    </div>
  );
};

/* Green section banner that spans the page, e.g. "Compulsory Subjects ...". */
const SectionBanner = ({ children }) => (
  <div className="bg-slate-200 border border-slate-400 text-center py-1.5 font-bold uppercase text-sm md:text-base mb-3">
    {children}
  </div>
);

/* A single optional-group block — group title bar followed by its subjects.
 * Each subject has a checkbox; multiple subjects per group may be selected. */
const GroupTable = ({ group, selectedSubjects, onToggle }) => {
  // Convert "Group A" → "Group "A"" to echo the printed schedule.
  const letter = group.name.replace(/^Group\s+/i, "");
  return (
    <table className="w-full border border-slate-400 text-sm self-start">
      <thead>
        <tr className="bg-slate-200">
          <th
            colSpan={4}
            className="px-2 py-1 text-center font-bold uppercase border-b border-slate-400"
          >
            Group &ldquo;{letter}&rdquo;
          </th>
        </tr>
      </thead>
      <tbody>
        {group.items.map((s, i) => {
          const checked = selectedSubjects.includes(s.subject_name);
          return (
            <tr
              key={`${group.name}-${i}`}
              className={`border-b border-slate-300 cursor-pointer hover:bg-slate-50 ${
                checked ? "bg-emerald-50" : ""
              }`}
              onClick={() => onToggle(group.name, s.subject_name)}
            >
              <td className="w-8 px-2 py-1 text-center align-middle">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(group.name, s.subject_name)}
                  onClick={(e) => e.stopPropagation()}
                  className="accent-emerald-700 cursor-pointer"
                  aria-label={`Select ${s.subject_name}`}
                />
              </td>
              <td className="w-6 px-1 py-1 align-top text-right">{i + 1}.</td>
              <td className="px-2 py-1">{s.subject_name}</td>
              <td className="w-16 px-2 py-1 text-right font-semibold">
                {s.total_marks}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default SubjectsSyllabus;
