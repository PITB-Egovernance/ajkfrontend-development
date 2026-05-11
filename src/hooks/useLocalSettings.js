/**
 * useLocalSettings
 * ─────────────────
 * Read/write Qualification, Degree & Qualification-Group settings stored in localStorage.
 *
 * Usage:
 *   const { qualifications, degrees, groups, activeGroups } = useLocalSettings();
 */

import { useState, useEffect } from 'react';

export const KEYS = {
  qualifications: 'ajk_qualifications',
  degrees:        'ajk_degrees',
  groups:         'ajk_qualification_groups',
};

export const DEFAULTS = {
  qualifications: [],
  degrees:        [],
  groups:         [],
};

const load = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const save = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

const RESET_KEY = 'ajk_settings_v2'; // bump this string to force-clear old dummy data

const seedDefaults = () => {
  // Clear any previously seeded dummy data from older versions
  if (!localStorage.getItem(RESET_KEY)) {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(RESET_KEY, '1');
  }
  // Initialise missing keys as empty arrays
  Object.entries(DEFAULTS).forEach(([type, defaults]) => {
    if (!load(KEYS[type])) save(KEYS[type], defaults);
  });
};

seedDefaults();

export const useLocalSettings = () => {
  const [qualifications, setQualifications] = useState(() => load(KEYS.qualifications) || DEFAULTS.qualifications);
  const [degrees,        setDegrees]        = useState(() => load(KEYS.degrees)        || DEFAULTS.degrees);
  const [groups,         setGroups]         = useState(() => load(KEYS.groups)         || DEFAULTS.groups);

  useEffect(() => {
    const sync = () => {
      setQualifications(load(KEYS.qualifications) || []);
      setDegrees(load(KEYS.degrees) || []);
      setGroups(load(KEYS.groups) || []);
    };
    window.addEventListener('ajk_settings_updated', sync);
    return () => window.removeEventListener('ajk_settings_updated', sync);
  }, []);

  const activeQualifications = qualifications.filter((q) => q.status === 'active');
  const activeDegrees        = degrees.filter((d) => d.status === 'active');
  const activeGroups         = groups.filter((g) => g.status === 'active');

  const degreesByQualification = (qualificationId) =>
    activeDegrees.filter((d) => !qualificationId || d.qualification_id === qualificationId);

  // Get full group objects with resolved qualification + degree names
  const resolvedGroups = activeGroups.map((g) => {
    const qual    = qualifications.find((q) => q.id === g.qualification_id);
    const degs    = degrees.filter((d) => g.degree_ids.includes(d.id));
    return { ...g, qualification_name: qual?.name ?? '—', degrees: degs };
  });

  return {
    qualifications, degrees, groups,
    activeQualifications, activeDegrees, activeGroups,
    degreesByQualification, resolvedGroups,
  };
};

export const localSettingsApi = {
  getAll: (key)       => load(KEYS[key]) || [],
  save:   (key, data) => { save(KEYS[key], data); window.dispatchEvent(new Event('ajk_settings_updated')); },
  add: (key, item) => {
    const list = localSettingsApi.getAll(key);
    const next = [...list, { ...item, id: `${key[0]}${Date.now()}` }];
    localSettingsApi.save(key, next);
    return next;
  },
  update: (key, updated) => {
    const next = localSettingsApi.getAll(key).map((i) => i.id === updated.id ? updated : i);
    localSettingsApi.save(key, next);
    return next;
  },
  remove: (key, id) => {
    const next = localSettingsApi.getAll(key).filter((i) => i.id !== id);
    localSettingsApi.save(key, next);
    return next;
  },
  toggle: (key, id) => {
    const next = localSettingsApi.getAll(key).map((i) =>
      i.id === id ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' } : i
    );
    localSettingsApi.save(key, next);
    return next;
  },
};
