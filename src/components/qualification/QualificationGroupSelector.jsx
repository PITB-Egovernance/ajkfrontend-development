/**
 * QualificationGroupSelector
 * ───────────────────────────
 * Reusable component for selecting qualification groups + individual degrees
 * during advertisement / requisition creation.
 *
 * Props:
 *   value    — { group_ids: string[], degree_ids: string[] }
 *   onChange — (value) => void
 *   label    — optional section label (default "Required Qualification")
 *   readOnly — show selected values only, no checkboxes
 */

import React, { useState } from 'react';
import { Chip } from '@mui/material';
import { ChevronDown, ChevronRight, GraduationCap, BookOpen, AlertCircle } from 'lucide-react';
import { useLocalSettings } from 'hooks/useLocalSettings';

const QualificationGroupSelector = ({
  value    = { group_ids: [], degree_ids: [] },
  onChange,
  label    = 'Required Qualification & Degree',
  readOnly = false,
}) => {
  const { resolvedGroups } = useLocalSettings();
  const [expanded, setExpanded] = useState({});

  const selectedGroupIds  = value.group_ids  || [];
  const selectedDegreeIds = value.degree_ids || [];

  const toggleExpand = (groupId) =>
    setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  const toggleGroup = (group) => {
    const isSelected = selectedGroupIds.includes(group.id);

    let newGroupIds;
    let newDegreeIds = [...selectedDegreeIds];

    if (isSelected) {
      // Deselect group → remove its degrees too
      newGroupIds   = selectedGroupIds.filter((id) => id !== group.id);
      const groupDegIds = group.degrees.map((d) => d.id);
      newDegreeIds  = newDegreeIds.filter((id) => !groupDegIds.includes(id));
    } else {
      // Select group → auto-select all its degrees
      newGroupIds  = [...selectedGroupIds, group.id];
      const groupDegIds = group.degrees.map((d) => d.id);
      newDegreeIds = [...new Set([...newDegreeIds, ...groupDegIds])];
      setExpanded((prev) => ({ ...prev, [group.id]: true }));
    }

    onChange?.({ group_ids: newGroupIds, degree_ids: newDegreeIds });
  };

  const toggleDegree = (group, degreeId) => {
    let newDegreeIds;
    if (selectedDegreeIds.includes(degreeId)) {
      newDegreeIds = selectedDegreeIds.filter((id) => id !== degreeId);
    } else {
      newDegreeIds = [...selectedDegreeIds, degreeId];
    }

    // If all degrees of a group are selected → auto-select group too
    const groupDegIds   = group.degrees.map((d) => d.id);
    const allSelected   = groupDegIds.every((id) => newDegreeIds.includes(id));
    let newGroupIds     = [...selectedGroupIds];

    if (allSelected && !newGroupIds.includes(group.id)) {
      newGroupIds = [...newGroupIds, group.id];
    } else if (!allSelected && newGroupIds.includes(group.id)) {
      newGroupIds = newGroupIds.filter((id) => id !== group.id);
    }

    onChange?.({ group_ids: newGroupIds, degree_ids: newDegreeIds });
  };

  // ── Read-only display ──────────────────────────────────────────────────
  if (readOnly) {
    const selectedGroups = resolvedGroups.filter((g) => selectedGroupIds.includes(g.id));
    if (!selectedGroups.length) {
      return (
        <div className="text-slate-400 text-sm flex items-center gap-1.5">
          <AlertCircle size={14} /> No qualifications specified
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {selectedGroups.map((group) => {
          const selDegs = group.degrees.filter((d) => selectedDegreeIds.includes(d.id));
          return (
            <div key={group.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap size={15} className="text-emerald-700" />
                <span className="font-semibold text-slate-800 text-sm">{group.name}</span>
                <span className="text-xs text-slate-500">({group.qualification_name})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 ml-5">
                {selDegs.map((d) => (
                  <Chip key={d.id} label={d.name} size="small"
                    sx={{ fontSize: '0.7rem', height: 22, bgcolor: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Interactive selector ───────────────────────────────────────────────
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 px-4 py-3 flex items-center gap-2">
        <GraduationCap size={18} className="text-emerald-300" />
        <span className="text-white font-semibold text-sm">{label}</span>
        {(selectedGroupIds.length > 0 || selectedDegreeIds.length > 0) && (
          <span className="ml-auto bg-emerald-700 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {selectedGroupIds.length} group{selectedGroupIds.length !== 1 ? 's' : ''} · {selectedDegreeIds.length} degree{selectedDegreeIds.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Groups list */}
      <div className="divide-y divide-slate-100">
        {resolvedGroups.length === 0 && (
          <div className="p-6 text-center text-slate-400 text-sm">
            No qualification groups found. Create groups in Settings → Qualification Groups.
          </div>
        )}

        {resolvedGroups.map((group) => {
          const isGroupSelected = selectedGroupIds.includes(group.id);
          const isOpen          = expanded[group.id];
          const groupDegIds     = group.degrees.map((d) => d.id);
          const selectedInGroup = groupDegIds.filter((id) => selectedDegreeIds.includes(id)).length;
          const partiallySelected = selectedInGroup > 0 && selectedInGroup < groupDegIds.length;

          return (
            <div key={group.id} className={`transition-colors ${isGroupSelected ? 'bg-emerald-50' : 'bg-white'}`}>
              {/* Group row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Group checkbox */}
                <input
                  type="checkbox"
                  checked={isGroupSelected}
                  ref={(el) => { if (el) el.indeterminate = partiallySelected; }}
                  onChange={() => toggleGroup(group)}
                  className="w-4 h-4 accent-emerald-700 cursor-pointer flex-shrink-0"
                />

                {/* Group info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${isGroupSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                      {group.name}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {group.qualification_name}
                    </span>
                    {selectedInGroup > 0 && (
                      <span className="text-xs text-emerald-700 font-medium">
                        {selectedInGroup}/{groupDegIds.length} degrees
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => toggleExpand(group.id)}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs"
                >
                  <BookOpen size={13} />
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>

              {/* Degrees (expanded) */}
              {isOpen && (
                <div className="pb-2 px-4 ml-7 grid grid-cols-2 md:grid-cols-3 gap-1 bg-white border-t border-slate-50">
                  {group.degrees.map((deg) => {
                    const isDegSelected = selectedDegreeIds.includes(deg.id);
                    return (
                      <label key={deg.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-sm
                          ${isDegSelected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <input
                          type="checkbox"
                          checked={isDegSelected}
                          onChange={() => toggleDegree(group, deg.id)}
                          className="w-3.5 h-3.5 accent-emerald-700 cursor-pointer"
                        />
                        {deg.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      {(selectedGroupIds.length > 0 || selectedDegreeIds.length > 0) && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5">
          <p className="text-xs text-slate-500 font-medium mb-1.5">Selected Degrees:</p>
          <div className="flex flex-wrap gap-1.5">
            {resolvedGroups
              .flatMap((g) => g.degrees.filter((d) => selectedDegreeIds.includes(d.id)))
              .map((d) => (
                <Chip key={d.id} label={d.name} size="small" onDelete={() => {
                  const grp = resolvedGroups.find((g) => g.degrees.some((deg) => deg.id === d.id));
                  if (grp) toggleDegree(grp, d.id);
                }}
                  sx={{ fontSize: '0.68rem', height: 22, bgcolor: '#ecfdf5', color: '#065f46' }} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QualificationGroupSelector;
