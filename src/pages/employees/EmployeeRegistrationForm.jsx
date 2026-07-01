import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TextField,
  MenuItem,
  Autocomplete,
  Checkbox,
  ListItemText,
  Chip,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { UserPlus, Save, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import Config from '../../config/baseUrl';
import AuthService from '../../services/authService';
import EmployeeService from '../../services/EmployeeService';
import PermissionMatrix from 'components/permissions/PermissionMatrix';
import { PERMISSION_MODULES, buildEmptyPermissionsFrom } from 'config/permissionModules';
import '../job-creation/JobCreationForm.css';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const firstItem = (value) => (Array.isArray(value) ? value[0] : value);

const isCheckedValue = (value) =>
  value === true ||
  value === 1 ||
  value === '1' ||
  String(value).toLowerCase() === 'true' ||
  String(value).toLowerCase() === 'yes';

// Merge a saved permissions object onto an empty matrix built from PERMISSION_MODULES.
const buildPerms = (saved) => {
  const base = buildEmptyPermissionsFrom(PERMISSION_MODULES);
  let parsed = saved;

  if (Array.isArray(parsed)) {
    parsed = parsed[0]?.permissions ?? parsed;
  }

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }

  if (Array.isArray(parsed)) {
    parsed.forEach((permission) => {
      const key =
        typeof permission === 'string'
          ? permission
          : permission?.key || permission?.name || permission?.permission;

      const [moduleKey, subModuleKey, actionKey] = String(key || '').split('.');

      if (
        base[moduleKey]?.[subModuleKey] &&
        actionKey in base[moduleKey][subModuleKey]
      ) {
        base[moduleKey][subModuleKey][actionKey] = true;
      }
    });

    return base;
  }

  const src =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};

  Object.entries(src).forEach(([m, subs]) => {
    if (!base[m]) return;

    Object.entries(subs || {}).forEach(([s, acts]) => {
      if (!base[m][s]) return;

      Object.entries(acts || {}).forEach(([a, v]) => {
        if (a in base[m][s]) {
          base[m][s][a] = isCheckedValue(v);
        }
      });
    });
  });

  return base;
};

const isRoleDescriptor = (value) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (
    value.hash_id !== undefined ||
    value.id !== undefined ||
    value.role_id !== undefined ||
    value.role_hash_id !== undefined ||
    value.role_name !== undefined ||
    value.name !== undefined
  );

const getSavedRole = (employee) => {
  if (employee?.role_hash_id) return employee.role_hash_id;

  const rolePermission = firstItem(employee?.role_permission);

  if (isRoleDescriptor(rolePermission)) return rolePermission;
  if (isRoleDescriptor(employee?.role)) return employee.role;

  return (
    employee?.role_id ??
    employee?.role_name ??
    employee?.role ??
    rolePermission?.role_id ??
    rolePermission?.hash_id ??
    rolePermission?.id ??
    rolePermission?.role_name ??
    null
  );
};

const getSavedPermissions = (employee, roleValue, fallbackPermissions) => {
  const rolePermission = firstItem(employee?.role_permission);

  if (isRoleDescriptor(roleValue) && roleValue.permissions) {
    return roleValue.permissions;
  }

  if (rolePermission?.permissions) {
    return rolePermission.permissions;
  }

  if (
    rolePermission &&
    typeof rolePermission === 'object' &&
    !Array.isArray(rolePermission) &&
    !isRoleDescriptor(rolePermission)
  ) {
    return rolePermission;
  }

  return (
    employee?.permissions ??
    employee?.permission ??
    employee?.role_permissions ??
    fallbackPermissions
  );
};

const normalizePermissionTree = (permissions) => {
  let parsed = permissions;

  if (Array.isArray(parsed)) {
    parsed = parsed[0]?.permissions ?? parsed;
  }

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return '';
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return '';
  }

  const enabled = [];

  Object.keys(parsed).sort().forEach((moduleKey) => {
    const subModules = parsed[moduleKey];
    if (!subModules || typeof subModules !== 'object') return;

    Object.keys(subModules).sort().forEach((subModuleKey) => {
      const actions = subModules[subModuleKey];
      if (!actions || typeof actions !== 'object') return;

      Object.keys(actions).sort().forEach((actionKey) => {
        if (isCheckedValue(actions[actionKey])) {
          enabled.push(`${moduleKey}.${subModuleKey}.${actionKey}`);
        }
      });
    });
  });

  return enabled.join('|');
};

const findRoleByPermissions = (roles, savedPermissions) => {
  const savedKey = normalizePermissionTree(savedPermissions);
  if (!savedKey) return null;

  return roles.find((role) => normalizePermissionTree(role.rawPermissions) === savedKey) || null;
};

// Date helpers — UI shows dd mm yyyy, API uses yyyy-mm-dd.
const isoToDmy = (iso) => {
  if (!iso) return '';

  const [y, m, d] = String(iso).slice(0, 10).split('-');

  return y && m && d ? `${d} ${m} ${y}` : '';
};

const dmyToIso = (dmy) => {
  const match = String(dmy).match(/^(\d{2}) (\d{2}) (\d{4})$/);

  if (!match) return '';

  const [, d, m, y] = match;

  return `${y}-${m}-${d}`;
};

const mapApiErrors = (apiErrors = {}) => {
  const mapped = { ...apiErrors };

  if (mapped.date_of_birth) mapped.dob = mapped.date_of_birth;
  if (mapped.domicile) mapped.domicile_district = mapped.domicile;

  return mapped;
};

const EmployeeRegistrationForm = ({
  mode = 'create',
  employeeHashId = null,
  onSuccess,
  onCancel,
} = {}) => {
  const navigate = useNavigate();
  const { hashId: routeHashId } = useParams();

  const effectiveHashId = employeeHashId || routeHashId || null;
  const isEdit = mode === 'edit' || !!routeHashId;

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [rawEmployee, setRawEmployee] = useState(null);

  const [username, setUsername] = useState('');
  const [cnic, setCnic] = useState('');
  const [email, setEmail] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [dob, setDob] = useState('');
  const [dobInput, setDobInput] = useState('');
  const dobPickerRef = useRef(null);
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState(() =>
    buildEmptyPermissionsFrom(PERMISSION_MODULES)
  );
  const [selectedWings, setSelectedWings] = useState([]);

  const [rolePermTab, setRolePermTab] = useState('roles');

  const [districtOptions, setDistrictOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [wingOptions, setWingOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    const authHeaders = {
      Authorization: `Bearer ${AuthService.getToken()}`,
      Accept: 'application/json',
      'X-API-KEY': Config.apiKey,
    };

    const fetchDistricts = async () => {
      try {
        const response = await fetch(`${Config.apiUrl}/settings/districts`, {
          headers: authHeaders,
        });

        const result = await response.json();

        if (result.success) {
          setDistrictOptions(
            (result.data?.data ?? result.data ?? []).map((d) => ({
              id: d.hash_id,
              name: d.name,
            }))
          );
        }
      } catch (error) {
        toast.error('Failed to load districts');
      }
    };

    const fetchDesignations = async () => {
      try {
        const [desigRes, wingsRes] = await Promise.all([
          fetch(`${Config.apiUrl}/settings/designations?per_page=100`, {
            headers: authHeaders,
          }),
          fetch(`${Config.apiUrl}/settings/wings?per_page=200`, {
            headers: authHeaders,
          }),
        ]);

        const desigResult = await desigRes.json();
        const wingsResult = await wingsRes.json();

        const wingsList = wingsResult.success
          ? wingsResult.data?.data ?? wingsResult.data ?? []
          : [];

        setWingOptions(
          wingsList
            .filter((w) => w.status === 'active' || !w.status)
            .map((w) => ({
              id: w.hash_id || String(w.id),
              name: w.name,
            }))
        );

        if (desigResult.success) {
          setDesignationOptions(
            (desigResult.data?.data ?? desigResult.data ?? [])
              .filter((d) => String(d.type || '').toLowerCase() === 'internal')
              .filter((d) => String(d.status ?? 'active').toLowerCase() === 'active')
              .filter(
                (d) =>
                  !['chairman', 'secretary'].includes(
                    d.name?.toLowerCase()
                  )
              )
              .map((d) => {
                let wingName = '';

                if (d.wings) {
                  const wing = wingsList.find(
                    (w) =>
                      w.hash_id === d.wings ||
                      String(w.id) === String(d.wings)
                  );

                  wingName = wing?.name || '';
                }

                return {
                  id: d.hash_id,
                  name: d.name,
                  wingName,
                  gradeName: d.grade?.name || '',
                  gradeId: d.grade?.hash_id || d.grade_id || '',
                };
              })
          );
        }
      } catch (error) {
        toast.error('Failed to load designations');
      }
    };

    const fetchRoles = async () => {
      try {
        const response = await fetch(`${Config.apiUrl}/settings/roles`, {
          headers: authHeaders,
        });

        const result = await response.json();

        if (result.success) {
          const EXCLUDED_ROLES = [
            'root / super admin',
            'super admin',
            'root',
            'admin',
            'secretary',
            'chairman',
          ];

          setRoleOptions(
            (result.data?.data ?? result.data ?? [])
              .filter((r) => !r.deleted_at)
              .filter((r) => !r.is_super_admin)
              .filter(
                (r) =>
                  !EXCLUDED_ROLES.includes(
                    String(r.role_name || '').trim().toLowerCase()
                  )
              )
              .map((r) => ({
                id: r.hash_id || String(r.id),
                hash_id: r.hash_id,
                numericId: r.id,
                role_id: r.role_id || r.id,
                name: r.role_name || r.name,
                rawPermissions: r.permissions,
              }))
          );
        }
      } catch {
        setRoleOptions([]);
      }
    };

    fetchDistricts();
    fetchDesignations();
    fetchRoles();
  }, []);

  useEffect(() => {
    if (!isEdit || !effectiveHashId) return;

    let active = true;

    (async () => {
      try {
        const data = await EmployeeService.getUserDetails(effectiveHashId);

        if (!active) return;

        setRawEmployee(data);
        setUsername(data.username || data.name || data.full_name || '');
        setCnic(String(data.cnic || '').replace(/\D/g, '').slice(0, 13));
        setEmail(data.email || '');
        setFatherHusbandName(data.father_husband_name || '');

        const iso = String(data.date_of_birth || '').slice(0, 10);

        setDob(iso);
        setDobInput(isoToDmy(iso));

        const g = String(data.gender || '');

        setGender(
          g ? g.charAt(0).toUpperCase() + g.slice(1).toLowerCase() : ''
        );

        setMobile(
          String(data.mobile || data.phone || '')
            .replace(/\D/g, '')
            .slice(0, 11)
        );
      } catch (error) {
        toast.error(error.message || 'Failed to load employee details');
      }
    })();

    return () => {
      active = false;
    };
  }, [isEdit, effectiveHashId]);

  useEffect(() => {
    if (!isEdit || !rawEmployee) return;

    const e = rawEmployee;

    if (districtOptions.length && (e.domicile || e.domicile_district)) {
      const name = String(e.domicile || e.domicile_district).toLowerCase();

      setDistrict(
        districtOptions.find((d) => d.name.toLowerCase() === name) || null
      );
    }

    if (designationOptions.length) {
      const desigRaw = Array.isArray(e.designation)
        ? e.designation[0]
        : e.designation;

      if (desigRaw) {
        const hid =
          typeof desigRaw === 'object'
            ? desigRaw.hash_id || desigRaw.id
            : null;

        const nm = String(
          typeof desigRaw === 'object' ? desigRaw.name : desigRaw
        ).toLowerCase();

        setDesignation(
          designationOptions.find(
            (d) => (hid && d.id === hid) || d.name.toLowerCase() === nm
          ) || null
        );
      }
    }

    // Role and permissions prefill fix.
    if (roleOptions.length) {
      const rolePermission = firstItem(e.role_permission);

      const roleRaw = getSavedRole(e);
      const savedPermsForMatch = getSavedPermissions(e, roleRaw, null);

      let foundRole = null;

      const savedRoleId =
        e.role_id ||
        e.role_hash_id ||
        rolePermission?.role_id ||
        rolePermission?.role_hash_id ||
        rolePermission?.hash_id ||
        rolePermission?.id ||
        roleRaw?.role_id ||
        roleRaw?.role_hash_id ||
        roleRaw?.hash_id ||
        roleRaw?.id ||
        null;

      const savedRoleName = String(
        e.role_name ||
        rolePermission?.role_name ||
        rolePermission?.name ||
        roleRaw?.role_name ||
        roleRaw?.name ||
        ''
      )
        .trim()
        .toLowerCase();

      if (savedRoleId) {
        foundRole =
          roleOptions.find((r) => {
            return (
              String(r.id) === String(savedRoleId) ||
              String(r.numericId) === String(savedRoleId) ||
              String(r.role_id) === String(savedRoleId) ||
              String(r.hash_id) === String(savedRoleId)
            );
          }) || null;
      }

      if (!foundRole && savedRoleName) {
        foundRole =
          roleOptions.find(
            (r) =>
              String(r.name || '')
                .trim()
                .toLowerCase() === savedRoleName
          ) || null;
      }

      if (!foundRole && savedPermsForMatch) {
        foundRole = findRoleByPermissions(roleOptions, savedPermsForMatch);
      }

      setSelectedRole(foundRole || null);

      const finalPermissions = savedPermsForMatch || foundRole?.rawPermissions || {};

      setPermissions(buildPerms(finalPermissions));

      if (foundRole) {
        setRolePermTab('permissions');
      }
    }

    if (wingOptions.length) {
      const wingsArr = Array.isArray(e.wings)
        ? e.wings
        : Array.isArray(e.wing)
          ? e.wing
          : e.wing
            ? String(e.wing)
                .split(',')
                .map((w) => w.trim())
            : [];

      const ids = wingsArr
        .map((w) => {
          const hid = typeof w === 'object' ? w.hash_id || w.id : null;
          const nm = typeof w === 'object' ? w.name : w;

          const found = wingOptions.find(
            (wo) =>
              (hid && wo.id === hid) ||
              wo.name.toLowerCase() === String(nm).toLowerCase()
          );

          return found?.id;
        })
        .filter(Boolean);

      setSelectedWings(ids);
    }
  }, [
    isEdit,
    rawEmployee,
    districtOptions,
    designationOptions,
    roleOptions,
    wingOptions,
  ]);

  const fieldSx = {
    '& .MuiOutlinedInput-input': { padding: '8.5px 14px' },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFieldErrors({});

    const errors = {};

    if (!username.trim()) errors.username = ['Username is required'];

    if (!cnic.trim()) errors.cnic = ['CNIC is required'];
    else if (cnic.length !== 13) errors.cnic = ['CNIC must be exactly 13 digits'];

    if (!email.trim()) errors.email = ['Email address is required'];

    if (!fatherHusbandName.trim()) {
      errors.father_husband_name = ['Father/Husband name is required'];
    }

    if (!dob) errors.dob = ['Date of birth is required'];
    if (!gender) errors.gender = ['Gender is required'];

    if (!mobile.trim()) errors.mobile = ['Mobile number is required'];
    else if (mobile.length !== 11) {
      errors.mobile = ['Mobile number must be exactly 11 digits'];
    }

    if (!district) errors.domicile_district = ['Domicile district is required'];
    if (!designation) errors.designation = ['Designation is required'];

    if (!selectedWings || selectedWings.length === 0) {
      errors.wing = ['At least one wing is required'];
    }

    if (!selectedRole) errors.role = ['Role is required'];

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    const loadingToast = toast.loading(
      isEdit ? 'Updating employee...' : 'Registering employee...'
    );

    try {
      const payload = {
        username: username.trim(),
        cnic: cnic.trim().replace(/[^0-9]/g, ''),
        father_husband_name: fatherHusbandName.trim(),
        email: email.trim(),
        gender: gender.toLowerCase(),
        date_of_birth: dob,
        domicile: district.name,
        mobile: mobile.trim(),

        designation: designation.id,
        grade: designation.gradeId || '',
        role_id: selectedRole.id,

        role_permission: permissions,
        wings: selectedWings,
      };

      console.log('Employee Payload:', payload);

      const result = isEdit
        ? await EmployeeService.updateUser(effectiveHashId, payload)
        : await EmployeeService.register(payload);

      toast.success(
        result?.message ||
          (isEdit
            ? 'Employee updated successfully'
            : 'Employee registered successfully'),
        { id: loadingToast }
      );

      if (onSuccess) onSuccess(result);
      else navigate('/dashboard/employees/list');
    } catch (error) {
      if (error.errors && Object.keys(error.errors).length > 0) {
        setFieldErrors(mapApiErrors(error.errors));
      }

      toast.error(
        error.message ||
          (isEdit ? 'Failed to update employee' : 'Failed to register employee'),
        { id: loadingToast }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-creation-container">
      <div className="container" style={{ minWidth: '-webkit-fill-available' }}>
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-2xl font-bold shadow-lg mb-6">
          <div className="flex items-center justify-center gap-3">
            <UserPlus className="w-8 h-8" />
            <span>
              {isEdit ? 'Edit Employee' : 'Employee Manual Registration'}
            </span>
          </div>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="card-body">
            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">Personal Information</h6>
              </div>
            </div>

            <div className="mb-8 p-8 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full space-y-2">
              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    sx={fieldSx}
                    error={!!fieldErrors?.username}
                    helperText={fieldErrors?.username?.join(', ')}
                  />
                </div>

                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="CNIC"
                    placeholder="13 digits e.g. 3740512345671"
                    value={cnic}
                    onChange={(e) =>
                      setCnic(e.target.value.replace(/\D/g, '').slice(0, 13))
                    }
                    required
                    inputProps={{
                      maxLength: 13,
                      inputMode: 'numeric',
                    }}
                    sx={fieldSx}
                    error={!!fieldErrors?.cnic}
                    helperText={
                      fieldErrors?.cnic?.join(', ') || `${cnic.length}/13 digits`
                    }
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    sx={fieldSx}
                    error={!!fieldErrors?.email}
                    helperText={fieldErrors?.email?.join(', ')}
                  />
                </div>

                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Father/Husband Name"
                    value={fatherHusbandName}
                    onChange={(e) => setFatherHusbandName(e.target.value)}
                    required
                    sx={fieldSx}
                    error={!!fieldErrors?.father_husband_name}
                    helperText={fieldErrors?.father_husband_name?.join(', ')}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 form-group">
                  <div style={{ position: 'relative' }}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      placeholder="dd mm yyyy"
                      value={dobInput}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 8);

                        let out = digits;

                        if (digits.length > 4) {
                          out = `${digits.slice(0, 2)} ${digits.slice(
                            2,
                            4
                          )} ${digits.slice(4)}`;
                        } else if (digits.length > 2) {
                          out = `${digits.slice(0, 2)} ${digits.slice(2)}`;
                        }

                        setDobInput(out);
                        setDob(dmyToIso(out));
                      }}
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        inputMode: 'numeric',
                        maxLength: 10,
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              size="small"
                              aria-label="Open calendar"
                              onClick={() => {
                                const el = dobPickerRef.current;

                                if (!el) return;

                                if (typeof el.showPicker === 'function') {
                                  el.showPicker();
                                } else {
                                  el.click();
                                }
                              }}
                            >
                              <CalendarDays size={18} />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={fieldSx}
                      error={!!fieldErrors?.dob}
                      helperText={
                        fieldErrors?.dob?.join(', ') || 'Format: dd mm yyyy'
                      }
                    />

                    <input
                      ref={dobPickerRef}
                      type="date"
                      value={dob}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const iso = e.target.value;

                        setDob(iso);
                        setDobInput(isoToDmy(iso));
                      }}
                      tabIndex={-1}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        right: 12,
                        bottom: 0,
                        width: 1,
                        height: 1,
                        opacity: 0,
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                </div>

                <div className="col-md-6 form-group">
                  <TextField
                    select
                    fullWidth
                    label="Gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    sx={fieldSx}
                    error={!!fieldErrors?.gender}
                    helperText={fieldErrors?.gender?.join(', ')}
                  >
                    <MenuItem value="">
                      <em>— Select Gender —</em>
                    </MenuItem>

                    {GENDER_OPTIONS.map((g) => (
                      <MenuItem key={g} value={g}>
                        {g}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Mobile Number"
                    placeholder="11 digits e.g. 03001234567"
                    value={mobile}
                    onChange={(e) =>
                      setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))
                    }
                    required
                    inputProps={{
                      maxLength: 11,
                      inputMode: 'numeric',
                    }}
                    sx={fieldSx}
                    error={!!fieldErrors?.mobile}
                    helperText={
                      fieldErrors?.mobile?.join(', ') ||
                      `${mobile.length}/11 digits`
                    }
                  />
                </div>

                <div className="col-md-6 form-group">
                  <Autocomplete
                    options={districtOptions}
                    getOptionLabel={(option) => option.name || ''}
                    isOptionEqualToValue={(option, value) =>
                      option?.id === value?.id
                    }
                    value={district}
                    onChange={(_, newValue) => setDistrict(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Domicile District"
                        required
                        sx={fieldSx}
                        error={!!fieldErrors?.domicile_district}
                        helperText={fieldErrors?.domicile_district?.join(', ')}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 form-group">
                  <Autocomplete
                    options={designationOptions}
                    getOptionLabel={(o) =>
                      o.wingName ? `${o.name} — ${o.wingName}` : o.name || ''
                    }
                    isOptionEqualToValue={(o, v) => o?.id === v?.id}
                    value={designation}
                    onChange={(_, v) => setDesignation(v)}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <span>{option.name}</span>

                        {option.wingName && (
                          <span
                            style={{
                              marginLeft: 8,
                              color: '#64748b',
                              fontSize: '0.85em',
                            }}
                          >
                            — {option.wingName}
                          </span>
                        )}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Designation"
                        required
                        sx={fieldSx}
                        error={!!fieldErrors?.designation}
                        helperText={fieldErrors?.designation?.join(', ')}
                      />
                    )}
                  />
                </div>

                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Grade"
                    value={designation?.gradeName || ''}
                    InputProps={{ readOnly: true }}
                    sx={{
                      ...fieldSx,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f8fafc',
                      },
                    }}
                    helperText={
                      !designation ? 'Select a designation to auto-fill grade' : ''
                    }
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    required
                    select
                    label="Wing"
                    value={selectedWings}
                    error={!!fieldErrors?.wing}
                    helperText={fieldErrors?.wing?.join(', ')}
                    SelectProps={{
                      multiple: true,
                      onChange: () => {},
                      renderValue: (selected) => {
                        if (!selected || selected.length === 0) return '';

                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((id) => {
                              const opt = wingOptions.find((w) => w.id === id);

                              return (
                                <Chip
                                  key={id}
                                  label={opt?.name || id}
                                  size="small"
                                  sx={{
                                    backgroundColor: '#ecfdf5',
                                    color: '#065f46',
                                    fontWeight: 500,
                                  }}
                                />
                              );
                            })}
                          </Box>
                        );
                      },
                      MenuProps: {
                        PaperProps: {
                          sx: {
                            maxHeight: 380,
                          },
                        },
                      },
                    }}
                    sx={{
                      ...fieldSx,
                      '& .MuiOutlinedInput-root': {
                        minHeight: 64,
                        height: 'auto',
                      },
                    }}
                  >
                    <MenuItem
                      dense
                      onClick={(e) => {
                        e.preventDefault();

                        const allIds = wingOptions.map((w) => w.id);
                        const allSelected =
                          allIds.length > 0 &&
                          allIds.every((id) => selectedWings.includes(id));

                        setSelectedWings(allSelected ? [] : allIds);
                      }}
                      sx={{
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={
                          wingOptions.length > 0 &&
                          wingOptions.every((w) => selectedWings.includes(w.id))
                        }
                        indeterminate={
                          wingOptions.some((w) => selectedWings.includes(w.id)) &&
                          !wingOptions.every((w) => selectedWings.includes(w.id))
                        }
                        sx={{
                          p: 0.5,
                          color: '#10b981',
                          '&.Mui-checked': {
                            color: '#059669',
                          },
                          '&.MuiCheckbox-indeterminate': {
                            color: '#059669',
                          },
                        }}
                      />

                      <ListItemText
                        primary="Select All"
                        primaryTypographyProps={{
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      />
                    </MenuItem>

                    {wingOptions.map((w) => (
                      <MenuItem
                        key={w.id}
                        dense
                        onClick={(e) => {
                          e.preventDefault();

                          setSelectedWings((prev) =>
                            prev.includes(w.id)
                              ? prev.filter((id) => id !== w.id)
                              : [...prev, w.id]
                          );
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={selectedWings.includes(w.id)}
                          sx={{
                            p: 0.5,
                            color: '#10b981',
                            '&.Mui-checked': {
                              color: '#059669',
                            },
                          }}
                        />

                        <ListItemText
                          primary={w.name}
                          primaryTypographyProps={{
                            fontSize: 13,
                          }}
                        />
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
              </div>
            </div>

            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">Roles and Permissions</h6>
              </div>
            </div>

            <div className="mb-8 p-8 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full space-y-2">
              <div className="flex gap-1 mb-5 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setRolePermTab('roles')}
                  className={`px-5 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors ${
                    rolePermTab === 'roles'
                      ? 'border-emerald-700 text-emerald-800'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Roles
                </button>

                <button
                  type="button"
                  onClick={() => setRolePermTab('permissions')}
                  className={`px-5 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    rolePermTab === 'permissions'
                      ? 'border-emerald-700 text-emerald-800'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Permissions

                  {selectedRole && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded">
                      {selectedRole.name}
                    </span>
                  )}
                </button>
              </div>

              {rolePermTab === 'roles' && (
                <div className="row">
                  <div className="col-md-6 form-group">
                    <Autocomplete
                      options={roleOptions}
                      getOptionLabel={(o) => o.name || ''}
                      isOptionEqualToValue={(o, v) => o?.id === v?.id}
                      value={selectedRole}
                      onChange={(_, v) => {
                        setSelectedRole(v);

                        setPermissions(
                          v
                            ? buildPerms(v.rawPermissions)
                            : buildEmptyPermissionsFrom(PERMISSION_MODULES)
                        );

                        if (v) setRolePermTab('permissions');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Role"
                          required
                          sx={fieldSx}
                          error={!!fieldErrors?.role}
                          helperText={fieldErrors?.role?.join(', ')}
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              {rolePermTab === 'permissions' && (
                <div className="row">
                  <div
                    className="col-md-12 form-group"
                    style={{
                      width: '-webkit-fill-available',
                    }}
                  >
                    {selectedRole ? (
                      <PermissionMatrix
                        modules={PERMISSION_MODULES}
                        permissions={permissions}
                        setPermissions={setPermissions}
                      />
                    ) : (
                      <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-sm text-slate-400 italic">
                        Select a role in the{' '}
                        <span className="font-semibold">Roles</span> tab to view
                        and edit its permissions
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="navigation-buttons">
              <button
                type="button"
                className="btn btn-prev"
                onClick={() =>
                  onCancel ? onCancel() : navigate('/dashboard/employees/list')
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? (
                  'Saving...'
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isEdit ? 'Update Employee' : 'Register Employee'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeRegistrationForm;
