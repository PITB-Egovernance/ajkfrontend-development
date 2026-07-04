import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TextField, MenuItem, Box, Chip, Checkbox, ListItemText, ListSubheader } from '@mui/material';
import { useLocalSettings, localSettingsApi } from 'hooks/useLocalSettings';
import { InlineLoader } from 'components/ui/Loader';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import toast from 'react-hot-toast';

// Sentinel value used to detect "Other" selection in every dropdown.
const OTHER = '__other__';

// Ascending, natural-order sort — handles both plain alphabetical names and
// numbered names (e.g. "Grade 2" before "Grade 10", which a plain string
// sort would get wrong).
const byNameAscending = (a, b) =>
  String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });

// Reusable "Other" reveal block. Declared at module scope (not inside the
// component) so it keeps a stable identity and does NOT remount on every
// keystroke — otherwise the input would lose focus while typing.
const OtherInput = React.forwardRef(
  ({ fieldName, value, setValue, placeholder = 'Enter custom value…', onConfirm, onCancel }, ref) => (
    <div className="mt-2 flex gap-2 items-center animate-in fade-in duration-200">
      <TextField
        fullWidth
        size="small"
        inputRef={ref}
        label={`Custom ${fieldName === 'degree_equivalence' ? 'Degree' : 'Qualification'}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm();
          }
        }}
        autoFocus
      />
      <button
        type="button"
        onClick={onConfirm}
        className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg whitespace-nowrap"
      >
        Add &amp; Set
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
      >
        Cancel
      </button>
    </div>
  )
);

const Step2Criteria = ({ data = {}, onNext, onBack, onSaveDraft }) => {
  const { activeQualifications, activeDegrees } = useLocalSettings();

  // Split qualifications by their configured type so each dropdown only shows
  // its own kind (Required vs Professional). Untyped/legacy entries default to
  // "required".
  const requiredQualifications     = activeQualifications.filter((q) => String(q.type ?? 'required').toLowerCase() !== 'professional');
  const professionalQualifications = activeQualifications.filter((q) => String(q.type ?? 'required').toLowerCase() === 'professional');

  const [formData, setFormData] = useState({
    academic_qualification:   [],
    professional_qualification: [],
    equivalent_qualification: '',
    authority_certificate:    '',
    degree_equivalence:       '',
    any_other_qualification:  '',
    training_institute:       '',
    experience_type:          '',
    experience_length:        '',
    qualification_experience: {},
    min_qualification:        [],
    eligible_degrees:         '', // Stores comma-separated degree names
  });

  // Ref to prevent useEffect from overwriting user changes after initialization
  const isInitializedRef = useRef(false);

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [allDegrees, setAllDegrees] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(false);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  // Fetch all degrees to handle grouping
  useEffect(() => {
    const fetchAllDegrees = async () => {
      setLoadingDegrees(true);
      try {
        const response = await fetch(`${API_BASE}/settings/degrees?per_page=1000`, {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/json',
            'X-API-KEY': API_KEY,
          },
        });
        const result = await response.json();
        if (result.success || result.status === 200) {
          const degrees = Array.isArray(result.data?.data) ? result.data.data : result.data || [];
          setAllDegrees(
            (Array.isArray(degrees) ? degrees : [])
              .filter(Boolean)
              .filter(
                (degree) =>
                  String(degree.status || 'active').toLowerCase() === 'active'
              )
          );
        }
      } catch (error) {
      } finally {
        setLoadingDegrees(false);
      }
    };
    fetchAllDegrees();
  }, [API_BASE, TOKEN, API_KEY]);

  // Group degrees by their group name
  const groupedDegrees = useMemo(() => {
    const grouped = {};
    allDegrees.forEach(d => {
      const groupName = d.degree_group || 'Other';
      if (!grouped[groupName]) grouped[groupName] = [];
      const code = d.degree_code || d.name || d.hash_id || d.id || '';
      grouped[groupName].push({
        id: d.hash_id || d.id,
        name: d.degree_name || d.name || '',
        code: String(code),
        group: groupName
      });
    });
    return grouped;
  }, [allDegrees]);

  // Helper to get selected degree names as array (trim whitespace for robust matching)
  const selectedDegreeList = useMemo(() => {
    return formData.eligible_degrees
      ? formData.eligible_degrees.split(',').map(d => d ? String(d).trim() : '').filter(d => d)
      : [];
  }, [formData.eligible_degrees]);

  // Handle group selection change from dropdown
  const handleGroupChange = (event) => {
    const newGroups = typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
    
    // Find groups that were just added
    const addedGroups = newGroups.filter(g => !selectedGroups.includes(g));
    // Find groups that were just removed
    const removedGroups = selectedGroups.filter(g => !newGroups.includes(g));

    let updatedDegrees = [...selectedDegreeList];

    // If a group was added, add all its degrees by default
    addedGroups.forEach(groupName => {
      const groupDegrees = groupedDegrees[groupName] || [];
      groupDegrees.forEach(d => {
        if (!updatedDegrees.includes(d.name)) {
          updatedDegrees.push(d.name);
        }
      });
    });

    // If a group was removed, remove all its degrees
    removedGroups.forEach(groupName => {
      const groupDegreeNames = (groupedDegrees[groupName] || []).map(d => d.name);
      updatedDegrees = updatedDegrees.filter(name => !groupDegreeNames.includes(name));
    });

    setSelectedGroups(newGroups);
    setFormData(prev => {
      const nextStr = updatedDegrees.join(',');
      return {
        ...prev,
        eligible_degrees: nextStr,
        degree_equivalence: nextStr
      };
    });
  };

  // Handle individual degree checkbox toggle
  const handleDegreeCheckboxToggle = (degreeName) => {
    if (!degreeName) return;
    const trimmedName = String(degreeName).trim();
    setFormData(prev => {
      const current = prev.eligible_degrees
        ? prev.eligible_degrees.split(',').map(d => d ? String(d).trim() : '').filter(d => d)
        : [];
      const index = current.indexOf(trimmedName);

      let updated;
      if (index > -1) {
        updated = current.filter(c => c !== trimmedName);
      } else {
        updated = [...current, trimmedName];
      }

      const newEligibleDegrees = updated.join(',');
      return { ...prev, eligible_degrees: newEligibleDegrees, degree_equivalence: newEligibleDegrees };
    });
  };

  // ── Tree-select helpers (Select All / per-group / per-degree) ────────────
  const allDegreeNames = useMemo(
    () => Object.values(groupedDegrees).flat().map((d) => d.name),
    [groupedDegrees]
  );

  const isGroupFullySelected = (groupName) => {
    const group = groupedDegrees[groupName] || [];
    return group.length > 0 && group.every((d) => selectedDegreeList.includes(d.name));
  };

  const isGroupPartiallySelected = (groupName) => {
    const group = groupedDegrees[groupName] || [];
    const some  = group.some((d) => selectedDegreeList.includes(d.name));
    return some && !isGroupFullySelected(groupName);
  };

  const allSelected     = allDegreeNames.length > 0 && allDegreeNames.every((n) => selectedDegreeList.includes(n));
  const someSelected    = selectedDegreeList.length > 0 && !allSelected;

  const handleToggleAll = () => {
    const nextStr = allSelected ? '' : allDegreeNames.join(',');
    setFormData((prev) => ({
      ...prev,
      eligible_degrees: nextStr,
      degree_equivalence: nextStr,
    }));
  };

  const handleToggleGroup = (groupName) => {
    const groupDegreeNames = (groupedDegrees[groupName] || []).map((d) => d.name);
    setFormData((prev) => {
      const current = prev.eligible_degrees
        ? prev.eligible_degrees.split(',').map((d) => d ? String(d).trim() : '').filter(Boolean)
        : [];
      const fullySelected = groupDegreeNames.every((n) => current.includes(n));
      const next = fullySelected
        ? current.filter((n) => !groupDegreeNames.includes(n))           // unselect all in group
        : Array.from(new Set([...current, ...groupDegreeNames]));        // select all in group
      const nextStr = next.join(',');
      return { ...prev, eligible_degrees: nextStr, degree_equivalence: nextStr };
    });
  };

  // "Other" custom text inputs — one per dropdown that supports it.
  const [customAcademic, setCustomAcademic] = useState('');
  const [customDegree,   setCustomDegree]   = useState('');
  const [customMinQual,  setCustomMinQual]  = useState('');
  const [customProfessional, setCustomProfessional] = useState('');

  // Tracks which dropdowns are in "Other" mode.
  const [showOther, setShowOther] = useState({
    academic_qualification: false,
    professional_qualification: false,
    degree_equivalence:     false,
    min_qualification:      false,
  });

  // Controlled open state for the multi-select dropdowns so we can close them
  // programmatically (e.g. when "Other (specify)" is chosen).
  const [openAcademicSelect, setOpenAcademicSelect] = useState(false);
  const [openMinQualSelect,  setOpenMinQualSelect]  = useState(false);
  const [openProfessionalSelect, setOpenProfessionalSelect] = useState(false);

  // Search text for each dropdown's in-menu search box — cleared on close.
  const [searchAcademic,     setSearchAcademic]     = useState('');
  const [searchProfessional, setSearchProfessional] = useState('');
  const [searchMinQual,      setSearchMinQual]      = useState('');
  const [searchDegree,       setSearchDegree]       = useState('');

  // Refs to the custom "Other" inputs so we can move the cursor into them once
  // the dropdown has fully closed (the menu's focus trap releases on close).
  const academicOtherRef = useRef(null);
  const minQualOtherRef   = useRef(null);
  const professionalOtherRef = useRef(null);

  useEffect(() => {
    if (!showOther.academic_qualification) return;
    const t = setTimeout(() => academicOtherRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [showOther.academic_qualification]);

  useEffect(() => {
    if (!showOther.min_qualification) return;
    const t = setTimeout(() => minQualOtherRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [showOther.min_qualification]);

  useEffect(() => {
    if (!showOther.professional_qualification) return;
    const t = setTimeout(() => professionalOtherRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [showOther.professional_qualification]);

  const [showAuthority, setShowAuthority] = useState(false);

  useEffect(() => {
    if (data && Object.keys(data).length > 0 && !isInitializedRef.current) {
      isInitializedRef.current = true;

      // Decode degree_equivalence (stored as comma-separated degree names, e.g. "MSCS,MCS")
      const raw = data.degree_equivalence || '';
      const degreeNames = raw.split(',').map(d => d ? String(d).trim() : '').filter(d => d);

      // Parse the stored experience_length string back into the
      // qualification_experience object so the checkboxes and year
      // inputs are restored when navigating back to Step 2.
      // Format: "Master: 9 years, MS English: 16 years, MA Islamiat: 3 years"
      let restoredQualExp = data.qualification_experience || {};
      if (Object.keys(restoredQualExp).length === 0 && data.experience_length) {
        const parsed = {};
        const entries = String(data.experience_length).split(',').map(s => s.trim()).filter(Boolean);
        entries.forEach(entry => {
          const match = entry.match(/^(.+?):\s*(\d+)\s*years?$/i);
          if (match) {
            parsed[match[1].trim()] = parseInt(match[2], 10) || 0;
          }
        });
        if (Object.keys(parsed).length > 0) {
          restoredQualExp = parsed;
        }
      }

      setFormData({
        academic_qualification:   data.academic_qualification
          ? (Array.isArray(data.academic_qualification)
              ? data.academic_qualification
              : String(data.academic_qualification).split(',').map((s) => s.trim()).filter(Boolean))
          : [],
        professional_qualification: data.professional_qualification
          ? (Array.isArray(data.professional_qualification)
              ? data.professional_qualification
              : String(data.professional_qualification).split(',').map((s) => s.trim()).filter(Boolean))
          : [],
        equivalent_qualification: data.equivalent_qualification || '',
        authority_certificate:    data.authority_certificate    || '',
        degree_equivalence:       degreeNames.length > 0 ? degreeNames.join(',') : (data.degree_equivalence || ''),
        any_other_qualification:  data.any_other_qualification  || '',
        training_institute:       data.training_institute       || '',
        experience_type:          data.experience_type          || '',
        experience_length:        data.experience_length        || '',
        qualification_experience: restoredQualExp,
        min_qualification:        data.min_qualification
          ? (Array.isArray(data.min_qualification)
              ? data.min_qualification
              : String(data.min_qualification).split(',').map((s) => s.trim()).filter(Boolean))
          : [],
        eligible_degrees:         degreeNames.length > 0 ? degreeNames.join(',') : (data.eligible_degrees || ''),
      });
      setShowAuthority(data.equivalent_qualification === 'Yes');
    }
    // Use a string fingerprint of `data` as the dependency so this effect
    // only re-runs when the loaded data's content actually changes — not
    // on every parent re-render.
  }, [data && JSON.stringify(data)]);

  // Separate effect for selectedGroups — runs after allDegrees are available
  useEffect(() => {
    if (isInitializedRef.current && formData.eligible_degrees && allDegrees.length > 0 && selectedGroups.length === 0) {
      const names = formData.eligible_degrees.split(',').map(d => d ? String(d).trim() : '').filter(d => d);
      const groupsFound = new Set();
      names.forEach(name => {
        // Match by degree_name or degree_code
        const deg = allDegrees.find(d => (d.degree_name || d.name) === name || (d.degree_code || d.name) === name);
        if (deg?.degree_group) groupsFound.add(deg.degree_group);
      });
      const groups = Array.from(groupsFound);
      if (groups.length > 0) {
        setSelectedGroups(groups);
      }
    }
  }, [allDegrees, formData.eligible_degrees]);

  // Ascending, search-filtered option lists for the three checkbox dropdowns
  // above. "Select All" / toggle handlers keep using the unfiltered
  // `requiredQualifications` / `professionalQualifications` lists so search
  // text never affects which items get bulk-selected.
  const visibleRequiredQualifications = [...requiredQualifications]
    .filter((q) => q.name.toLowerCase().includes(searchAcademic.trim().toLowerCase()))
    .sort((a, b) => byNameAscending(a.name, b.name));
  const visibleProfessionalQualifications = [...professionalQualifications]
    .filter((q) => q.name.toLowerCase().includes(searchProfessional.trim().toLowerCase()))
    .sort((a, b) => byNameAscending(a.name, b.name));
  const visibleMinQualifications = [...requiredQualifications]
    .filter((q) => q.name.toLowerCase().includes(searchMinQual.trim().toLowerCase()))
    .sort((a, b) => byNameAscending(a.name, b.name));

  // Ascending-sorted groups/degrees, filtered by the degree search box. Group
  // and degree membership used by "Select All" / group-toggle stays based on
  // the full `groupedDegrees` above — only what's *rendered* is filtered.
  const visibleGroupedDegrees = useMemo(() => {
    const needle = searchDegree.trim().toLowerCase();
    const result = {};
    Object.keys(groupedDegrees).sort(byNameAscending).forEach((groupName) => {
      const items = [...groupedDegrees[groupName]].sort((a, b) => byNameAscending(a.name, b.name));
      const filtered = needle
        ? items.filter((d) => d.name.toLowerCase().includes(needle) || groupName.toLowerCase().includes(needle))
        : items;
      if (filtered.length > 0) result[groupName] = filtered;
    });
    return result;
  }, [groupedDegrees, searchDegree]);

  // Degrees filtered to match the selected academic qualification.
  const filteredDegrees = activeDegrees.filter((d) => {
    const qualArr = Array.isArray(formData.academic_qualification) ? formData.academic_qualification : [];
    if (qualArr.length === 0) return true;
    const matchingQualIds = activeQualifications
      .filter((q) => qualArr.includes(q.name))
      .map((q) => q.id);
    return matchingQualIds.length === 0 || matchingQualIds.includes(d.qualification_id);
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAcademicQualToggle = (qualName) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.academic_qualification) ? prev.academic_qualification : [];
      const adding = !current.includes(qualName);
      const next = adding
        ? [...current, qualName]
        : current.filter((q) => q !== qualName);
      const nextExp = { ...prev.qualification_experience };
      if (adding) {
        nextExp[qualName] = nextExp[qualName] ?? 0;
      } else {
        delete nextExp[qualName];
      }
      return { ...prev, academic_qualification: next, qualification_experience: nextExp, degree_equivalence: '', eligible_degrees: '' };
    });
  };

  const handleMinQualToggle = (qualName) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.min_qualification) ? prev.min_qualification : [];
      const next = current.includes(qualName)
        ? current.filter((q) => q !== qualName)
        : [...current, qualName];
      return { ...prev, min_qualification: next };
    });
  };

  const handleProfessionalQualToggle = (qualName) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.professional_qualification) ? prev.professional_qualification : [];
      const next = current.includes(qualName)
        ? current.filter((q) => q !== qualName)
        : [...current, qualName];
      return { ...prev, professional_qualification: next };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'academic_qualification' || name === 'min_qualification' || name === 'professional_qualification') return;

    if (value === OTHER) {
      setShowOther((prev) => ({ ...prev, [name]: true }));
      return;
    }

    setShowOther((prev) => ({ ...prev, [name]: false }));

    if (name === 'equivalent_qualification') {
      setShowAuthority(value === 'Yes');
    }

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: name === 'experience_length' ? parseInt(value) || 0 : value,
      };

      if (name === 'equivalent_qualification') {
        if (value !== 'Yes') {
          newData.authority_certificate = '';
          newData.degree_equivalence = '';
          newData.eligible_degrees = '';
        }
      }

      if (name === 'degree_equivalence') {
        if (value !== OTHER && value !== '') {
          const groupDegrees = groupedDegrees[value] || [];
          const nextStr = groupDegrees.map(d => d.name).join(',');
          newData.eligible_degrees = nextStr;
          newData.degree_equivalence = nextStr;
        } else {
          newData.eligible_degrees = '';
          newData.degree_equivalence = '';
        }
      }

      return newData;
    });
  };

  // Confirms a custom "Other" value: saves it to localStorage and sets the field.
  const confirmCustom = (fieldName, customValue, setCustom) => {
    const trimmed = customValue.trim();
    if (!trimmed) return;

    // Persist to settings so it appears in future sessions.
    if (fieldName === 'academic_qualification' || fieldName === 'min_qualification') {
      const alreadyExists = activeQualifications.some(
        (q) => q.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyExists) {
        localSettingsApi.add('qualifications', { name: trimmed, status: 'active' });
      }
    } else if (fieldName === 'degree_equivalence') {
      const alreadyExists = activeDegrees.some(
        (d) => d.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyExists) {
        // Link to selected qualification if available.
        const qualArr = Array.isArray(formData.academic_qualification) ? formData.academic_qualification : [];
        const matchingQual = activeQualifications.find(
          (q) => qualArr.includes(q.name)
        );
        localSettingsApi.add('degrees', {
          name:             trimmed,
          qualification_id: matchingQual?.id ?? '',
          status:           'active',
        });
      }
    }

    if (fieldName === 'academic_qualification') {
      setFormData((prev) => {
        const current = Array.isArray(prev.academic_qualification) ? prev.academic_qualification : [];
        return { ...prev, academic_qualification: current.includes(trimmed) ? current : [...current, trimmed] };
      });
    } else if (fieldName === 'min_qualification') {
      setFormData((prev) => {
        const current = Array.isArray(prev.min_qualification) ? prev.min_qualification : [];
        return { ...prev, min_qualification: current.includes(trimmed) ? current : [...current, trimmed] };
      });
    } else if (fieldName === 'professional_qualification') {
      setFormData((prev) => {
        const current = Array.isArray(prev.professional_qualification) ? prev.professional_qualification : [];
        return { ...prev, professional_qualification: current.includes(trimmed) ? current : [...current, trimmed] };
      });
    } else if (fieldName === 'degree_equivalence') {
      setFormData((prev) => {
        const current = prev.eligible_degrees
          ? prev.eligible_degrees.split(',').map(d => d ? String(d).trim() : '').filter(d => d)
          : [];
        const next = current.includes(trimmed) ? current : [...current, trimmed];
        const nextStr = next.join(',');
        return {
          ...prev,
          degree_equivalence: nextStr,
          eligible_degrees: nextStr
        };
      });
    } else {
      setFormData((prev) => ({ ...prev, [fieldName]: trimmed }));
    }
    setShowOther((prev) => ({ ...prev, [fieldName]: false }));
    setCustom('');
  };

  // ── Build submit payload ──────────────────────────────────────────────────
  //  degree_equivalence stores only the checked degree names (e.g. "MSCS,MCS")
  //  No group name is stored — only the checkbox selections.

  const buildSubmitData = () => {
    const submitData = { ...formData };
    if (Array.isArray(submitData.academic_qualification)) {
      submitData.academic_qualification = submitData.academic_qualification.join(', ');
    }
    if (Array.isArray(submitData.min_qualification)) {
      submitData.min_qualification = submitData.min_qualification.join(', ');
    }
    if (Array.isArray(submitData.professional_qualification)) {
      submitData.professional_qualification = submitData.professional_qualification.join(', ');
    }
    if (selectedDegreeList.length > 0) {
      submitData.degree_equivalence = selectedDegreeList.join(',');
    }
    const qe = submitData.qualification_experience || {};
    const expEntries = Object.entries(qe).filter(([, yrs]) => yrs !== null && yrs !== undefined);
    if (expEntries.length > 0) {
      submitData.experience_length = expEntries.map(([qual, yrs]) => `${qual}: ${yrs} years`).join(', ');
    }
    return submitData;
  };

  // ── Validation + submit ────────────────────────────────────────────────────

  // Gate the Next button on the required fields so the admin can't advance
  // with a half-filled form. Academic Qualification is always required;
  // Authority Certificate and Degree of Equivalence are only required when
  // Equivalent Qualification is "Yes".
  const isStep2Valid =
    (Array.isArray(formData.academic_qualification) ? formData.academic_qualification.length > 0 : !!formData.academic_qualification) &&
    (formData.equivalent_qualification !== 'Yes' ||
      (!!formData.authority_certificate && !!formData.degree_equivalence));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.academic_qualification || (Array.isArray(formData.academic_qualification) && formData.academic_qualification.length === 0)) {
      alert('Required Qualification is required');
      return;
    }
    if (formData.equivalent_qualification === 'Yes') {
      if (!formData.authority_certificate) {
        alert('Authority Certificate is required when Equivalent Qualification is Yes');
        return;
      }
      if (!formData.degree_equivalence) {
        alert('Name Degree of Equivalence is required when Equivalent Qualification is Yes');
        return;
      }
    }

    onNext(buildSubmitData());
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit}>

      <h6 className="section-title">Qualification Required</h6>

      <div className="row">

        {/* Academic Qualification (multi-select with checkboxes) */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth required select
            label="Required Qualification"
            name="academic_qualification"
            value={Array.isArray(formData.academic_qualification) ? formData.academic_qualification : []}
            SelectProps={{
              multiple: true,
              open: openAcademicSelect,
              onOpen: () => setOpenAcademicSelect(true),
              onClose: () => { setOpenAcademicSelect(false); setSearchAcademic(''); },
              onChange: () => {},
              renderValue: (selected) => {
                if (!selected || selected.length === 0) return '';
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                    {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                  </Box>
                );
              },
              MenuProps: { PaperProps: { sx: { maxHeight: 380 } }, disableRestoreFocus: true, disableEnforceFocus: true },
            }}
          >
            <ListSubheader sx={{ p: 0.5 }} onClick={(e) => e.stopPropagation()}>
              <TextField
                fullWidth size="small" autoFocus
                placeholder="Search…"
                value={searchAcademic}
                onChange={(e) => setSearchAcademic(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </ListSubheader>
            <MenuItem dense onClick={(e) => {
              e.preventDefault();
              const allNames = requiredQualifications.map((q) => q.name);
              const current = Array.isArray(formData.academic_qualification) ? formData.academic_qualification : [];
              const allSelected = allNames.every((n) => current.includes(n));
              const nextExp = allSelected ? {} : Object.fromEntries(allNames.map((n) => [n, (formData.qualification_experience || {})[n] ?? 0]));
              setFormData((prev) => ({
                ...prev,
                academic_qualification: allSelected ? [] : allNames,
                qualification_experience: nextExp,
                degree_equivalence: '', eligible_degrees: '',
              }));
            }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
              <Checkbox size="small"
                checked={requiredQualifications.length > 0 && requiredQualifications.every((q) => (formData.academic_qualification || []).includes(q.name))}
                indeterminate={requiredQualifications.some((q) => (formData.academic_qualification || []).includes(q.name)) && !requiredQualifications.every((q) => (formData.academic_qualification || []).includes(q.name))}
                sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
              />
              <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
            </MenuItem>
            {visibleRequiredQualifications.length === 0 && (
              <MenuItem disabled dense><ListItemText primary="No matches" /></MenuItem>
            )}
            {visibleRequiredQualifications.map((q) => (
              <MenuItem key={q.id} dense onClick={(e) => { e.preventDefault(); handleAcademicQualToggle(q.name); }}>
                <Checkbox
                  size="small"
                  checked={(formData.academic_qualification || []).includes(q.name)}
                  sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                />
                <ListItemText primary={q.name} />
              </MenuItem>
            ))}
            <MenuItem dense onClick={(e) => { e.preventDefault(); setOpenAcademicSelect(false); setShowOther((prev) => ({ ...prev, academic_qualification: true })); }}
              sx={{ color: 'text.secondary', fontStyle: 'italic', borderTop: '1px solid #e2e8f0' }}>
              <ListItemText primary="Other (specify)" />
            </MenuItem>
          </TextField>
          {showOther.academic_qualification && (
            <OtherInput
              ref={academicOtherRef}
              fieldName="academic_qualification"
              value={customAcademic}
              setValue={setCustomAcademic}
              placeholder="e.g. Diploma in Engineering"
              onConfirm={() => confirmCustom('academic_qualification', customAcademic, setCustomAcademic)}
              onCancel={() => setShowOther((prev) => ({ ...prev, academic_qualification: false }))}
            />
          )}
        </div>

        {/* Professional Qualification (multi-select with checkboxes) — qualifications of type "professional" */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth select
            label="Professional Qualification"
            name="professional_qualification"
            value={Array.isArray(formData.professional_qualification) ? formData.professional_qualification : []}
            SelectProps={{
              multiple: true,
              open: openProfessionalSelect,
              onOpen: () => setOpenProfessionalSelect(true),
              onClose: () => { setOpenProfessionalSelect(false); setSearchProfessional(''); },
              onChange: () => {},
              renderValue: (selected) => {
                if (!selected || selected.length === 0) return '';
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                    {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                  </Box>
                );
              },
              MenuProps: { PaperProps: { sx: { maxHeight: 380 } }, disableRestoreFocus: true, disableEnforceFocus: true },
            }}
          >
            <ListSubheader sx={{ p: 0.5 }} onClick={(e) => e.stopPropagation()}>
              <TextField
                fullWidth size="small" autoFocus
                placeholder="Search…"
                value={searchProfessional}
                onChange={(e) => setSearchProfessional(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </ListSubheader>
            <MenuItem dense onClick={(e) => {
              e.preventDefault();
              const allNames = professionalQualifications.map((q) => q.name);
              const current = Array.isArray(formData.professional_qualification) ? formData.professional_qualification : [];
              const allSelected = allNames.every((n) => current.includes(n));
              setFormData((prev) => ({
                ...prev,
                professional_qualification: allSelected ? [] : allNames,
              }));
            }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
              <Checkbox size="small"
                checked={professionalQualifications.length > 0 && professionalQualifications.every((q) => (formData.professional_qualification || []).includes(q.name))}
                indeterminate={professionalQualifications.some((q) => (formData.professional_qualification || []).includes(q.name)) && !professionalQualifications.every((q) => (formData.professional_qualification || []).includes(q.name))}
                sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
              />
              <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
            </MenuItem>
            {visibleProfessionalQualifications.length === 0 && (
              <MenuItem disabled dense><ListItemText primary="No matches" /></MenuItem>
            )}
            {visibleProfessionalQualifications.map((q) => (
              <MenuItem key={q.id} dense onClick={(e) => { e.preventDefault(); handleProfessionalQualToggle(q.name); }}>
                <Checkbox
                  size="small"
                  checked={(formData.professional_qualification || []).includes(q.name)}
                  sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                />
                <ListItemText primary={q.name} />
              </MenuItem>
            ))}
            <MenuItem dense onClick={(e) => { e.preventDefault(); setOpenProfessionalSelect(false); setShowOther((prev) => ({ ...prev, professional_qualification: true })); }}
              sx={{ color: 'text.secondary', fontStyle: 'italic', borderTop: '1px solid #e2e8f0' }}>
              <ListItemText primary="Other (specify)" />
            </MenuItem>
          </TextField>
          {showOther.professional_qualification && (
            <OtherInput
              ref={professionalOtherRef}
              fieldName="professional_qualification"
              value={customProfessional}
              setValue={setCustomProfessional}
              placeholder="e.g. Certified Internal Auditor"
              onConfirm={() => confirmCustom('professional_qualification', customProfessional, setCustomProfessional)}
              onCancel={() => setShowOther((prev) => ({ ...prev, professional_qualification: false }))}
            />
          )}
        </div>

        {/* Equivalent Qualification */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth select
            label="Equivalent Qualification"
            name="equivalent_qualification"
            value={formData.equivalent_qualification}
            onChange={handleChange}
          >
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
        </div>

        {/* Authority Certificate (conditional) */}
        {showAuthority && (
          <div className="col-md-6 form-group">
            <TextField
              fullWidth
              label="Authority for Equivalent Certificate"
              name="authority_certificate"
              value={formData.authority_certificate}
              onChange={handleChange}
            />
          </div>
        )}

        {/* Degree of Equivalence — nested checkbox dropdown (matches sibling fields) */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            select
            label={
              formData.equivalent_qualification === 'Yes'
                ? 'Name Degree / Equivalent degree *'
                : 'Name Degree / Equivalent degree (Optional)'
            }
            value={selectedDegreeList}
            SelectProps={{
              multiple: true,
              onChange: () => { /* manual state via item onClick to keep menu open */ },
              onClose: () => setSearchDegree(''),
              renderValue: (selected) => {
                if (!selected || selected.length === 0) return '';
                if (selected.length <= 3) {
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                      {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                    </Box>
                  );
                }
                return `${selected.length} degrees selected`;
              },
              MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
            }}
          >
            <ListSubheader sx={{ p: 0.5 }} onClick={(e) => e.stopPropagation()}>
              <TextField
                fullWidth size="small" autoFocus
                placeholder="Search…"
                value={searchDegree}
                onChange={(e) => setSearchDegree(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </ListSubheader>

            {/* Master "Select All" */}
            <MenuItem dense onClick={(e) => { e.preventDefault(); handleToggleAll(); }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
              <Checkbox size="small" checked={allSelected} indeterminate={someSelected}
                sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }} />
              <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
            </MenuItem>

            {Object.keys(visibleGroupedDegrees).length === 0 && (
              <MenuItem disabled dense><ListItemText primary="No matches" /></MenuItem>
            )}

            {/* Groups with nested degree checkboxes — already ascending-sorted and search-filtered */}
            {Object.keys(visibleGroupedDegrees).flatMap((groupName) => [
              <MenuItem
                key={`grp-${groupName}`}
                dense
                onClick={(e) => { e.preventDefault(); handleToggleGroup(groupName); }}
                sx={{ bgcolor: '#f8fafc', '&:hover': { bgcolor: '#f1f5f9' } }}
              >
                <Checkbox
                  size="small"
                  checked={isGroupFullySelected(groupName)}
                  indeterminate={isGroupPartiallySelected(groupName)}
                  sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
                />
                <ListItemText primary={groupName} primaryTypographyProps={{ fontSize: 12.5, fontWeight: 600, color: '#064e3b' }} />
              </MenuItem>,
              ...visibleGroupedDegrees[groupName].map((d) => (
                <MenuItem
                  key={d.id ?? d.name}
                  dense
                  onClick={(e) => { e.preventDefault(); handleDegreeCheckboxToggle(d.name); }}
                  sx={{ pl: 5 }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedDegreeList.includes(d.name)}
                    sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                  />
                  <ListItemText primary={d.name} primaryTypographyProps={{ fontSize: 12 }} />
                </MenuItem>
              )),
            ])}

            {/* Other (custom) */}
            <MenuItem
              dense
              onClick={(e) => { e.preventDefault(); setShowOther((p) => ({ ...p, degree_equivalence: true })); }}
              sx={{ borderTop: '1px solid #e2e8f0', color: 'text.secondary', fontStyle: 'italic' }}
            >
              Other (specify)
            </MenuItem>
          </TextField>

          {showOther.degree_equivalence && (
            <OtherInput
              fieldName="degree_equivalence"
              value={customDegree}
              setValue={setCustomDegree}
              placeholder="e.g. BS Environmental Science"
              onConfirm={() => confirmCustom('degree_equivalence', customDegree, setCustomDegree)}
              onCancel={() => setShowOther((prev) => ({ ...prev, degree_equivalence: false }))}
            />
          )}

          {Object.keys(groupedDegrees).length === 0 && !showOther.degree_equivalence && (
            <p className="text-xs text-slate-400 mt-1">
              No degrees found — select "Other" to enter one.
            </p>
          )}
        </div>

        {/* Any Other Qualification */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Any Other Qualification under Rules (Optional)"
            name="any_other_qualification"
            value={formData.any_other_qualification}
            onChange={handleChange}
          />
        </div>
      </div>

      <h6 className="section-title">Experience Required</h6>

      <div className="row">

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Training Institute Name (Optional)"
            name="training_institute"
            value={formData.training_institute}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 form-group">
          <TextField
            fullWidth
            label="Type of Experience Required"
            name="experience_type"
            value={formData.experience_type}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 form-group">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Experience per Qualification (years)
          </label>
          {(Array.isArray(formData.academic_qualification) && formData.academic_qualification.length > 0) ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {formData.academic_qualification.map((qual) => {
                const qe = formData.qualification_experience || {};
                const isEnabled = qe[qual] !== undefined && qe[qual] !== null;
                return (
                  <div key={qual} className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <Checkbox
                      size="small"
                      checked={isEnabled}
                      onChange={() => {
                        setFormData((prev) => {
                          const next = { ...prev.qualification_experience };
                          if (isEnabled) {
                            delete next[qual];
                          } else {
                            next[qual] = 0;
                          }
                          return { ...prev, qualification_experience: next };
                        });
                      }}
                      sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                    />
                    <span className="text-sm text-slate-700 font-medium flex-1">{qual}</span>
                    {isEnabled && (
                      <TextField
                        size="small"
                        type="number"
                        value={qe[qual] ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setFormData((prev) => ({
                            ...prev,
                            qualification_experience: { ...prev.qualification_experience, [qual]: val },
                          }));
                        }}
                        inputProps={{ min: 0, max: 50, style: { width: 60, textAlign: 'center' } }}
                        sx={{ width: 100 }}
                        label="Years"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Select academic qualifications first to set experience per qualification.</p>
          )}
        </div>

        {/* Minimum Qualification (multi-select with checkboxes) */}
        <div className="col-md-6 form-group">
          <TextField
            fullWidth select
            label="Minimum Qualification"
            name="min_qualification"
            value={Array.isArray(formData.min_qualification) ? formData.min_qualification : []}
            SelectProps={{
              multiple: true,
              open: openMinQualSelect,
              onOpen: () => setOpenMinQualSelect(true),
              onClose: () => { setOpenMinQualSelect(false); setSearchMinQual(''); },
              onChange: () => {},
              renderValue: (selected) => {
                if (!selected || selected.length === 0) return '';
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                    {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                  </Box>
                );
              },
              MenuProps: { PaperProps: { sx: { maxHeight: 380 } }, disableRestoreFocus: true, disableEnforceFocus: true },
            }}
          >
            <ListSubheader sx={{ p: 0.5 }} onClick={(e) => e.stopPropagation()}>
              <TextField
                fullWidth size="small" autoFocus
                placeholder="Search…"
                value={searchMinQual}
                onChange={(e) => setSearchMinQual(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </ListSubheader>
            <MenuItem dense onClick={(e) => {
              e.preventDefault();
              const allNames = requiredQualifications.map((q) => q.name);
              const current = Array.isArray(formData.min_qualification) ? formData.min_qualification : [];
              const allSelected = allNames.every((n) => current.includes(n));
              setFormData((prev) => ({
                ...prev,
                min_qualification: allSelected ? [] : allNames,
              }));
            }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
              <Checkbox size="small"
                checked={requiredQualifications.length > 0 && requiredQualifications.every((q) => (formData.min_qualification || []).includes(q.name))}
                indeterminate={requiredQualifications.some((q) => (formData.min_qualification || []).includes(q.name)) && !requiredQualifications.every((q) => (formData.min_qualification || []).includes(q.name))}
                sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
              />
              <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
            </MenuItem>
            {visibleMinQualifications.length === 0 && (
              <MenuItem disabled dense><ListItemText primary="No matches" /></MenuItem>
            )}
            {visibleMinQualifications.map((q) => (
              <MenuItem key={q.id} dense onClick={(e) => { e.preventDefault(); handleMinQualToggle(q.name); }}>
                <Checkbox
                  size="small"
                  checked={(formData.min_qualification || []).includes(q.name)}
                  sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                />
                <ListItemText primary={q.name} />
              </MenuItem>
            ))}
            <MenuItem dense onClick={(e) => { e.preventDefault(); setOpenMinQualSelect(false); setShowOther((prev) => ({ ...prev, min_qualification: true })); }}
              sx={{ color: 'text.secondary', fontStyle: 'italic', borderTop: '1px solid #e2e8f0' }}>
              <ListItemText primary="Other (specify)" />
            </MenuItem>
          </TextField>
          {showOther.min_qualification && (
            <OtherInput
              ref={minQualOtherRef}
              fieldName="min_qualification"
              value={customMinQual}
              setValue={setCustomMinQual}
              placeholder="e.g. Associate Degree"
              onConfirm={() => confirmCustom('min_qualification', customMinQual, setCustomMinQual)}
              onCancel={() => setShowOther((prev) => ({ ...prev, min_qualification: false }))}
            />
          )}
        </div>
      </div>



      <div className="navigation-buttons">
        <button
          type="button"
          className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200"
          onClick={onBack}
        >
          Previous
        </button>
        <div className="flex gap-2">
          {onSaveDraft && (
            <button
              type="button"
              onClick={() => onSaveDraft?.(buildSubmitData())}
              className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all duration-200"
            >
              Save Draft
            </button>
          )}
          <button
            type="submit"
            disabled={!isStep2Valid}
            title={!isStep2Valid ? 'Fill in all required fields to continue' : undefined}
            className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-950 disabled:hover:to-emerald-950"
          >
            Next
          </button>
        </div>
      </div>

    </form>
  );
};

export default Step2Criteria;
