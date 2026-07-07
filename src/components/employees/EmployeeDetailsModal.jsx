import React, { useEffect, useState } from 'react';
import SearchableSelect from 'components/ui/SearchableSelect';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Checkbox,
  ListItemText,
  Chip,
  Box,
} from '@mui/material';
import { Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import EmployeeService from 'services/EmployeeService';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { formFieldSx, formFieldAutoHeightSx } from 'components/ui/formFieldSx';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const STATUS_OPTIONS = ['active', 'inactive'];

const normalizePermissionTree = (permissions) => {
  let parsed = permissions;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return '';
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return '';

  const enabled = [];
  Object.keys(parsed).sort().forEach((moduleKey) => {
    const subModules = parsed[moduleKey];
    if (!subModules || typeof subModules !== 'object') return;
    Object.keys(subModules).sort().forEach((subModuleKey) => {
      const actions = subModules[subModuleKey];
      if (!actions || typeof actions !== 'object') return;
      Object.keys(actions).sort().forEach((actionKey) => {
        if (actions[actionKey] === true) enabled.push(`${moduleKey}.${subModuleKey}.${actionKey}`);
      });
    });
  });
  return enabled.join('|');
};

const FIELD_LABELS = {
  full_name:           'Full Name',
  cnic:                'CNIC',
  email:               'Email',
  mobile:              'Mobile Number',
  designation:         'Designation',
  scale:               'Scale',
  father_husband_name: 'Father/Husband Name',
  gender:              'Gender',
  date_of_birth:       'Date of Birth',
  domicile:            'Domicile',
  role:                'Role',
  status:              'Account Status',
  status_job:          'Job Status',
};

const toDisplayDate = (isoStr) => {
  if (!isoStr) return '';
  const datePart = String(isoStr).slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return isoStr;
  return `${d}/${m}/${y}`;
};


const EmployeeDetailsModal = ({ open, hashId, onClose, onUpdated, initialEditing = false }) => {
  const [loading,        setLoading]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [user,           setUser]           = useState(null);
  const [form,           setForm]           = useState({});

  // Dropdown lists
  const [districtOptions,    setDistrictOptions]    = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [gradeOptions,       setGradeOptions]       = useState([]);
  const [roleOptions,        setRoleOptions]        = useState([]);

  // Selected Autocomplete objects
  const [selectedDistrict,    setSelectedDistrict]    = useState(null);
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [selectedGrade,       setSelectedGrade]       = useState(null);
  const [selectedRoles,       setSelectedRoles]       = useState([]);

  /* ── Load user details when modal opens ── */
  useEffect(() => {
    if (!open || !hashId) return;

    setLoading(true);
    setEditing(initialEditing);
    if (initialEditing) loadOptions();
    EmployeeService.getUserDetails(hashId)
      .then((data) => {
        const rawGender = data?.gender || '';
        const normalised = {
          ...data,
          full_name: data?.username || data?.name || data?.full_name || '',
          scale:     data?.scale    || data?.grade || '',
          gender:    rawGender ? rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase() : '',
        };
        setUser(normalised);
        setForm({
          full_name:           normalised.full_name,
          cnic:                normalised.cnic                || '',
          email:               normalised.email               || '',
          mobile:              normalised.mobile              || '',
          designation:         normalised.designation         || '',
          scale:               normalised.scale               || '',
          father_husband_name: normalised.father_husband_name || '',
          gender:              normalised.gender              || '',
          date_of_birth:       String(normalised.date_of_birth || '').slice(0, 10),
          domicile:            normalised.domicile            || '',
          status:              normalised.status              || 'active',
        });
      })
      .catch((error) => toast.error(error.message || 'Failed to load user details'))
      .finally(() => setLoading(false));
  }, [open, hashId]);

  /* ── Fetch dropdown options (runs once per session) ── */
  const loadOptions = async () => {
    if (districtOptions.length && designationOptions.length && gradeOptions.length) return;

    setOptionsLoading(true);
    const headers = {
      Authorization: `Bearer ${AuthService.getToken()}`,
      Accept: 'application/json',
      'X-API-KEY': Config.apiKey,
    };

    try {
      const [dRes, desRes, gRes, rRes] = await Promise.all([
        fetch(`${Config.apiUrl}/settings/districts`,                     { headers }),
        fetch(`${Config.apiUrl}/settings/designations?per_page=100`,    { headers }),
        fetch(`${Config.apiUrl}/settings/grades?per_page=100`,          { headers }),
        fetch(`${Config.apiUrl}/settings/roles`,                         { headers }),
      ]);
      const [dData, desData, gData, rData] = await Promise.all([
        dRes.json(), desRes.json(), gRes.json(), rRes.json(),
      ]);

      setDistrictOptions(
        (dData.data?.data ?? dData.data ?? []).map((d) => ({ id: d.hash_id, name: d.name }))
      );
      setDesignationOptions(
        (desData.data?.data ?? desData.data ?? [])
          .filter((d) => d.wings && !['chairman', 'secretary'].includes(d.name?.toLowerCase()))
          .map((d) => ({ id: d.hash_id, name: d.name }))
      );
      setGradeOptions(
        (gData.data?.data ?? gData.data ?? []).map((g) => ({ id: g.hash_id, name: g.name }))
      );
      setRoleOptions(
        (rData.data?.data ?? rData.data ?? [])
          .filter((r) => !r.deleted_at)
          .map((r) => ({
            id: r.hash_id,
            numericId: r.id,
            name: r.role_name,
            permissions: r.permissions,
          }))
      );
    } catch {
      toast.error('Failed to load dropdown options');
    } finally {
      setOptionsLoading(false);
    }
  };

  /* ── After options load, pre-select matching objects ── */
  useEffect(() => {
    if (!editing) return;

    if (form.domicile && districtOptions.length) {
      const found = districtOptions.find(
        (d) => d.name.toLowerCase() === form.domicile.toLowerCase()
      );
      setSelectedDistrict(found || null);
    }
    if (form.designation && designationOptions.length) {
      const found = designationOptions.find(
        (d) => d.name.toLowerCase() === form.designation.toLowerCase()
      );
      setSelectedDesignation(found || null);
    }
    if (form.scale && gradeOptions.length) {
      const found = gradeOptions.find(
        (g) => g.name.toLowerCase() === form.scale.toLowerCase()
      );
      setSelectedGrade(found || null);
    }
    if (roleOptions.length) {
      const roleData = user?.role_id || user?.role_hash_id || user?.role || user?.role_permission;
      let resolvedRoleIds = [];
      if (Array.isArray(roleData)) {
        resolvedRoleIds = roleData.map((r) => {
          if (typeof r === 'object') {
            const roleId = r.hash_id || r.role_id || r.id;
            const roleName = r.role_name || r.name;
            const found = roleOptions.find((opt) =>
              String(opt.id) === String(roleId) ||
              String(opt.numericId) === String(roleId) ||
              (roleName && opt.name.toLowerCase() === String(roleName).toLowerCase())
            );
            return found?.id;
          }
          const found = roleOptions.find((opt) =>
            String(opt.id) === String(r) ||
            String(opt.numericId) === String(r) ||
            opt.name.toLowerCase() === String(r).toLowerCase()
          );
          return found?.id || r;
        }).filter((roleId) => roleOptions.some((option) => option.id === roleId));
      } else if (roleData && typeof roleData === 'object') {
        const roleId = roleData.hash_id || roleData.role_id || roleData.id;
        const roleName = roleData.role_name || roleData.name;
        const found = roleOptions.find((option) =>
          String(option.id) === String(roleId) ||
          String(option.numericId) === String(roleId) ||
          (roleName && option.name.toLowerCase() === String(roleName).toLowerCase())
        );
        resolvedRoleIds = found ? [found.id] : [];
      } else if (roleData) {
        const names = String(roleData).split(',').map((r) => r.trim()).filter(Boolean);
        const ids = names.map((n) => {
          const found = roleOptions.find((opt) =>
            String(opt.id) === n ||
            String(opt.numericId) === n ||
            opt.name.toLowerCase() === n.toLowerCase()
          );
          return found?.id || n;
        }).filter((roleId) => roleOptions.some((option) => option.id === roleId));
        resolvedRoleIds = ids;
      }

      if (resolvedRoleIds.length === 0) {
        const savedPermissions = normalizePermissionTree(user?.role_permission);
        const permissionRole = savedPermissions
          ? roleOptions.find(
              (option) => normalizePermissionTree(option.permissions) === savedPermissions
            )
          : null;
        resolvedRoleIds = permissionRole ? [permissionRole.id] : [];
      }
      setSelectedRoles(resolvedRoleIds);
    }
  }, [editing, user, form.domicile, form.designation, form.scale, districtOptions, designationOptions, gradeOptions, roleOptions]);

  const startEditing = async () => {
    await loadOptions();
    setEditing(true);
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    const resolvedGrade       = selectedGrade?.name       || form.scale       || '';
    const resolvedDesignation = selectedDesignation?.name || form.designation || '';
    const resolvedDomicile    = selectedDistrict?.name    || form.domicile    || '';
    const resolvedGender      = form.gender ? form.gender.toLowerCase() : '';

    const payload = {
      username:            form.full_name,
      full_name:           form.full_name,
      email:               form.email,
      mobile:              form.mobile,
      father_husband_name: form.father_husband_name,
      date_of_birth:       form.date_of_birth,
      gender:              resolvedGender,
      domicile:            resolvedDomicile,
      designation:         resolvedDesignation ? [resolvedDesignation] : [],
      grade:               selectedGrade?.id ? [selectedGrade.id] : [],
      role_permission:     selectedRoles,
      status:              form.status,
    };

    setSaving(true);
    try {
      const updated = await EmployeeService.updateUser(hashId, payload);
      const merged = {
        ...user,
        ...updated,
        full_name:   form.full_name,
        scale:       resolvedGrade,
        designation: resolvedDesignation,
        domicile:    resolvedDomicile,
      };
      setUser(merged);
      setEditing(false);
      onUpdated?.({ ...merged, hash_id: hashId });
      // Fire toast AFTER dialog switches back to view mode so it renders on top
      setTimeout(() => toast.success('Employee updated successfully'), 50);
    } catch (error) {
      toast.error(error.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

 const formatValue = (_key, val) => {
  if (val == null || val === '') return '-';
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(s)) return toDisplayDate(s);
  return s;
};

  const renderViewRow = (key) => (
    <div key={key} className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {FIELD_LABELS[key] || key}
      </span>
      <span className="text-sm text-slate-900">{formatValue(key, user?.[key])}</span>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <span className="text-lg font-semibold">Employee Details</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X size={18} />
        </button>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <CircularProgress size={28} />
          </div>
        ) : !user ? (
          <p className="text-sm text-slate-500 py-6 text-center">No details available.</p>
        ) : editing ? (
          <div className="pt-2 space-y-4">

            {optionsLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-400 pb-1">
                <CircularProgress size={14} />
                <span>Loading dropdown options…</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Full Name */}
              <TextField
                fullWidth
                label="Full Name"
                value={form.full_name}
                onChange={handleChange('full_name')}
                sx={formFieldSx}
              />

              {/* CNIC */}
              <TextField
                fullWidth
                label="CNIC"
                placeholder="13 digits e.g. 3740512345671"
                value={form.cnic}
                onChange={(e) =>
                  setForm((p) => ({ ...p, cnic: e.target.value.replace(/\D/g, '').slice(0, 13) }))
                }
                inputProps={{ maxLength: 13, inputMode: 'numeric' }}
                helperText={`${(form.cnic || '').length}/13 digits`}
                sx={formFieldSx}
              />

              {/* Email */}
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                sx={formFieldSx}
              />

              {/* Father/Husband Name */}
              <TextField
                fullWidth
                label="Father/Husband Name"
                value={form.father_husband_name}
                onChange={handleChange('father_husband_name')}
                sx={formFieldSx}
              />

              {/* Date of Birth */}
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={form.date_of_birth}
                onChange={handleChange('date_of_birth')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ style: { height: 28 } }}
                sx={formFieldSx}
              />

              {/* Gender */}
              <SearchableSelect
                label="Gender"
                value={form.gender}
                onChange={handleChange('gender')}
                options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))}
                placeholder="— Select Gender —"
              />

              {/* Mobile */}
              <TextField
                fullWidth
                label="Mobile Number"
                placeholder="+923XXXXXXXXX"
                value={form.mobile}
                onChange={handleChange('mobile')}
                sx={formFieldSx}
              />

              {/* Domicile District */}
              <SearchableSelect
                label="Domicile District"
                value={selectedDistrict?.id || ''}
                onChange={(e) => {
                  const opt = districtOptions.find((d) => d.id === e.target.value) || null;
                  setSelectedDistrict(opt);
                  setForm((p) => ({ ...p, domicile: opt?.name || '' }));
                }}
                options={districtOptions.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="— Select District —"
              />

              {/* Designation */}
              <SearchableSelect
                label="Designation"
                value={selectedDesignation?.id || ''}
                onChange={(e) => {
                  const opt = designationOptions.find((d) => d.id === e.target.value) || null;
                  setSelectedDesignation(opt);
                  setForm((p) => ({ ...p, designation: opt?.name || '' }));
                }}
                options={designationOptions.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="— Select Designation —"
              />

              {/* Scale / Grade */}
              <SearchableSelect
                label="Scale / Grade"
                value={selectedGrade?.id || ''}
                onChange={(e) => {
                  const opt = gradeOptions.find((g) => g.id === e.target.value) || null;
                  setSelectedGrade(opt);
                  setForm((p) => ({ ...p, scale: opt?.name || '' }));
                }}
                options={gradeOptions.map((g) => ({ value: g.id, label: g.name }))}
                placeholder="— Select Grade —"
              />

              {/* Status */}
              <SearchableSelect
                label="Account Status"
                value={form.status}
                onChange={handleChange('status')}
                options={STATUS_OPTIONS.map((o) => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                placeholder="— Select Status —"
              />

              {/* Role */}
              <TextField
                  fullWidth
                  select
                  label="Role"
                  value={selectedRoles}
                  SelectProps={{
                    multiple: true,
                    onChange: () => {},
                    renderValue: (selected) => {
                      if (!selected || selected.length === 0) return '';
                      return (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                          {selected.map((id) => {
                            const opt = roleOptions.find((r) => r.id === id);
                            return <Chip key={id} label={opt?.name || id} size="small" />;
                          })}
                        </Box>
                      );
                    },
                    MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
                  }}
                  sx={formFieldAutoHeightSx}
                >
                  <MenuItem dense onClick={(e) => {
                    e.preventDefault();
                    const allIds = roleOptions.map((r) => r.id);
                    const allSelected = allIds.length > 0 && allIds.every((id) => selectedRoles.includes(id));
                    setSelectedRoles(allSelected ? [] : allIds);
                  }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                    <Checkbox size="small"
                      checked={roleOptions.length > 0 && roleOptions.every((r) => selectedRoles.includes(r.id))}
                      indeterminate={roleOptions.some((r) => selectedRoles.includes(r.id)) && !roleOptions.every((r) => selectedRoles.includes(r.id))}
                      sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
                    />
                    <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
                  </MenuItem>

                  {roleOptions.map((r) => (
                    <MenuItem key={r.id} dense onClick={(e) => {
                      e.preventDefault();
                      setSelectedRoles((prev) =>
                        prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                      );
                    }}>
                      <Checkbox
                        size="small"
                        checked={selectedRoles.includes(r.id)}
                        sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                      />
                      <ListItemText primary={r.name} primaryTypographyProps={{ fontSize: 13 }} />
                    </MenuItem>
                  ))}
                </TextField>

            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {Object.keys(FIELD_LABELS)
              .filter((key) => key in (user || {}))
              .map(renderViewRow)}
          </div>
        )}
      </DialogContent>

      <DialogActions className="px-6 pb-4">
        {!loading && user && (
          editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={startEditing}>
              <Pencil size={14} className="mr-2" />
              Edit Employee
            </Button>
          )
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeDetailsModal;
