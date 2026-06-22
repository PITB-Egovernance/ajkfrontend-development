import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TextField, MenuItem, Autocomplete, Checkbox, ListItemText, Chip, Box, InputAdornment, IconButton } from '@mui/material';
import { UserPlus, Save, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import Config from '../../config/baseUrl';
import AuthService from '../../services/authService';
import EmployeeService from '../../services/EmployeeService';
import { permissionsToLabels } from 'config/permissionModules';
import '../job-creation/JobCreationForm.css';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

// Date helpers — UI shows dd/mm/yyyy, API uses yyyy-mm-dd.
const isoToDmy = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return (y && m && d) ? `${d}/${m}/${y}` : '';
};
const dmyToIso = (dmy) => {
  const match = String(dmy).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
};

// Custom input component that renders permission chips inside an MUI
// OutlinedInput — gives the proper notched-outline + floating label look.
const ChipsInput = React.forwardRef(function ChipsInput(props, ref) {
  // Strip out native input-only props MUI forwards so they don't hit the div.
  const { ownerState, permissions, ...rest } = props;
  return (
    <div
      ref={ref}
      {...rest}
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        minHeight: 36,
        alignContent: 'flex-start', width: '100%',
      }}
    >
      {permissions?.length > 0 ? (
        permissions.map((p, i) => (
          <Chip key={i} label={p} size="small"
            sx={{ backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 500, fontSize: '12px' }} />
        ))
      ) : (
        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 14 }}>Select a role to see permissions</span>
      )}
    </div>
  );
});


const mapApiErrors = (apiErrors = {}) => {
  const mapped = { ...apiErrors };
  if (mapped.date_of_birth) mapped.dob = mapped.date_of_birth;
  if (mapped.domicile) mapped.domicile_district = mapped.domicile;
  return mapped;
};

const EmployeeRegistrationForm = ({ mode = 'create', employeeHashId = null, onSuccess, onCancel } = {}) => {
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
  const [dob, setDob] = useState('');        // ISO yyyy-mm-dd (for the API)
  const [dobInput, setDobInput] = useState(''); // display dd/mm/yyyy
  const dobPickerRef = useRef(null);            // hidden native date input (calendar)
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedWings, setSelectedWings] = useState([]);

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
        const response = await fetch(`${Config.apiUrl}/settings/districts`, { headers: authHeaders });
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
          fetch(`${Config.apiUrl}/settings/designations?per_page=100`, { headers: authHeaders }),
          fetch(`${Config.apiUrl}/settings/wings?per_page=200`, { headers: authHeaders }),
        ]);
        const desigResult = await desigRes.json();
        const wingsResult = await wingsRes.json();

        const wingsList = wingsResult.success
          ? (wingsResult.data?.data ?? wingsResult.data ?? [])
          : [];

        setWingOptions(
          wingsList.filter((w) => w.status === 'active' || !w.status)
            .map((w) => ({ id: w.hash_id || String(w.id), name: w.name }))
        );

        if (desigResult.success) {
          setDesignationOptions(
            (desigResult.data?.data ?? desigResult.data ?? [])
              .filter((d) => !['chairman', 'secretary'].includes(d.name?.toLowerCase()))
              .map((d) => {
                let wingName = '';
                if (d.wings) {
                  const wing = wingsList.find((w) => w.hash_id === d.wings || String(w.id) === String(d.wings));
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
        const response = await fetch(`${Config.apiUrl}/settings/roles`, { headers: authHeaders });
        const result = await response.json();
        if (result.success) {
          setRoleOptions(
            (result.data?.data ?? result.data ?? [])
              .filter((r) => !r.deleted_at)
              .map((r) => ({
                id: r.hash_id,
                name: r.role_name,
                permissions: permissionsToLabels(r.permissions),
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
    // fetchGrades not needed — grade auto-derived from designation
  }, []);

  // Edit mode: load the employee, prefill the plain text fields.
  useEffect(() => {
    if (!isEdit || !effectiveHashId) return;
    let active = true;
    (async () => {
      try {
        const data = await EmployeeService.getUserDetails(effectiveHashId);
        console.log("Data", data)
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
        setGender(g ? g.charAt(0).toUpperCase() + g.slice(1).toLowerCase() : '');
        setMobile(String(data.mobile || data.phone || '').replace(/\D/g, '').slice(0, 11));
      } catch (error) {
        toast.error(error.message || 'Failed to load employee details');
      }
    })();
    return () => { active = false; };
  }, [isEdit, effectiveHashId]);

  // Edit mode: once option lists are loaded, match the saved values to objects.
  useEffect(() => {
    if (!isEdit || !rawEmployee) return;

    const e = rawEmployee;

    if (districtOptions.length && (e.domicile || e.domicile_district)) {
      const name = String(e.domicile || e.domicile_district).toLowerCase();
      setDistrict(districtOptions.find((d) => d.name.toLowerCase() === name) || null);
    }

    if (designationOptions.length) {
      const desigRaw = Array.isArray(e.designation) ? e.designation[0] : e.designation;
      if (desigRaw) {
        const name = String(typeof desigRaw === 'object' ? desigRaw.name : desigRaw).toLowerCase();
        setDesignation(designationOptions.find((d) => d.name.toLowerCase() === name) || null);
      }
    }

    if (roleOptions.length) {
      const roleRaw = (Array.isArray(e.role_permission) ? e.role_permission[0] : e.role_permission) ?? e.role;
      if (roleRaw) {
        const val = typeof roleRaw === 'object' ? (roleRaw.hash_id || roleRaw.id) : roleRaw;
        const found = roleOptions.find(
          (r) => r.id === val || r.name.toLowerCase() === String(val).toLowerCase()
        );
        setSelectedRole(found || null);
      }
    }

    if (wingOptions.length && e.wing) {
      const wingsArr = Array.isArray(e.wing) ? e.wing : String(e.wing).split(',').map((w) => w.trim());
      const ids = wingsArr
        .map((w) => {
          const val = typeof w === 'object' ? (w.hash_id || w.id || w.name) : w;
          const found = wingOptions.find(
            (wo) => wo.id === val || wo.name.toLowerCase() === String(val).toLowerCase()
          );
          return found?.id;
        })
        .filter(Boolean);
      setSelectedWings(ids);
    }
  }, [isEdit, rawEmployee, districtOptions, designationOptions, roleOptions, wingOptions]);

  const fieldSx = {
    '& .MuiOutlinedInput-root': { minHeight: 64 },
    '& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)': { height: 64 },
    '& .MuiOutlinedInput-input': { padding: '16px 14px', fontSize: '15px' },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!username.trim()) errors.username = ['Username is required'];
    if (!cnic.trim()) errors.cnic = ['CNIC is required'];
    else if (cnic.length !== 13) errors.cnic = ['CNIC must be exactly 13 digits'];
    if (!email.trim()) errors.email = ['Email address is required'];
    if (!fatherHusbandName.trim()) errors.father_husband_name = ['Father/Husband name is required'];
    if (!dob) errors.dob = ['Date of birth is required'];
    if (!gender) errors.gender = ['Gender is required'];
    if (!mobile.trim()) errors.mobile = ['Mobile number is required'];
    else if (mobile.length !== 11) errors.mobile = ['Mobile number must be exactly 11 digits'];
    if (!district) errors.domicile_district = ['Domicile district is required'];
    if (!designation) errors.designation = ['Designation is required'];
    // Role is not validated/sent while backend role assignment is unavailable.
    if (!selectedWings || selectedWings.length === 0) errors.wing = ['At least one wing is required'];
    if (!selectedRole) errors.wing = ['At least one wing is required'];

     
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    console.log("Role:", selectedRole.id)
    setLoading(true);
    const loadingToast = toast.loading(isEdit ? 'Updating employee...' : 'Registering employee...');
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
        // Send hash_id strings so the backend links the relations correctly.
        designation: designation.id,
        grade: designation.gradeId || '',
        role_permission:selectedRole.id,
        wings: selectedWings,
      };

      console.log('Paylod', payload)
      // role_permission should carry the selected role's hash_id (from /settings/roles),
      // but the live backend currently throws "Failed to ..." on any non-empty value
      // (and ignores the `permission` field). Sending it breaks every save, so it is
      // held behind this flag until the backend accepts it. Flip to true once fixed.
      const SEND_ROLE_PERMISSION = false;
      if (SEND_ROLE_PERMISSION && selectedRole?.id) {
        payload.role_permission = selectedRole.id;
      }

      const result = isEdit
        ? await EmployeeService.updateUser(effectiveHashId, payload)
        : await EmployeeService.register(payload);

      toast.success(
        result?.message || (isEdit ? 'Employee updated successfully' : 'Employee registered successfully'),
        { id: loadingToast }
      );

      if (onSuccess) onSuccess(result);
      else navigate('/dashboard/employees/list');
    } catch (error) {
      if (error.errors && Object.keys(error.errors).length > 0) {
        setFieldErrors(mapApiErrors(error.errors));
      }
      toast.error(error.message || (isEdit ? 'Failed to update employee' : 'Failed to register employee'), { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-creation-container">
      <div className="container" style={{ minWidth: "-webkit-fill-available" }}>
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-2xl font-bold shadow-lg mb-6">
          <div className="flex items-center justify-center gap-3">
            <UserPlus className="w-8 h-8" />
            <span>{isEdit ? 'Edit Employee' : 'Employee Manual Registration'}</span>
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
                    onChange={(e) => setCnic(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    required
                    inputProps={{ maxLength: 13, inputMode: 'numeric' }}
                    sx={fieldSx}
                    error={!!fieldErrors?.cnic}
                    helperText={fieldErrors?.cnic?.join(', ') || `${cnic.length}/13 digits`}
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

              {/* Row 3: DOB + Gender */}
              <div className="row">
                <div className="col-md-6 form-group">
                  <div style={{ position: 'relative' }}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      placeholder="dd/mm/yyyy"
                      value={dobInput}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 8); // ddmmyyyy
                        let out = digits;
                        if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
                        else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                        setDobInput(out);
                        setDob(dmyToIso(out));
                      }}
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ inputMode: 'numeric', maxLength: 10 }}
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
                                if (typeof el.showPicker === 'function') el.showPicker();
                                else el.click();
                              }}
                            >
                              <CalendarDays size={18} />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={fieldSx}
                      error={!!fieldErrors?.dob}
                      helperText={fieldErrors?.dob?.join(', ') || 'Format: dd/mm/yyyy'}
                    />
                    {/* Hidden native date input — provides the calendar popup */}
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
                      style={{ position: 'absolute', right: 12, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
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
                    <MenuItem value=""><em>— Select Gender —</em></MenuItem>
                    {GENDER_OPTIONS.map((g) => (
                      <MenuItem key={g} value={g}>{g}</MenuItem>
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
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    required
                    inputProps={{ maxLength: 11, inputMode: 'numeric' }}
                    sx={fieldSx}
                    error={!!fieldErrors?.mobile}
                    helperText={fieldErrors?.mobile?.join(', ') || `${mobile.length}/11 digits`}
                  />
                </div>
                <div className="col-md-6 form-group">
                  <Autocomplete
                    options={districtOptions}
                    getOptionLabel={(option) => option.name || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
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

              {/* Designation (single select) + Grade (auto-filled) */}
              <div className="row">
                <div className="col-md-6 form-group">
                  <Autocomplete
                    options={designationOptions}
                    getOptionLabel={(o) => o.wingName ? `${o.name} — ${o.wingName}` : (o.name || '')}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={designation}
                    onChange={(_, v) => setDesignation(v)}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <span>{option.name}</span>
                        {option.wingName && <span style={{ marginLeft: 8, color: '#64748b', fontSize: '0.85em' }}>— {option.wingName}</span>}
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField {...params} label="Designation" required sx={fieldSx}
                        error={!!fieldErrors?.designation} helperText={fieldErrors?.designation?.join(', ')} />
                    )}
                  />
                </div>
                <div className="col-md-6 form-group">
                  <TextField fullWidth label="Grade" value={designation?.gradeName || ''} InputProps={{ readOnly: true }}
                    sx={{ ...fieldSx, '& .MuiOutlinedInput-root': { backgroundColor: '#f8fafc' } }}
                    helperText={!designation ? 'Select a designation to auto-fill grade' : ''} />
                </div>
              </div>

              {/* Row 6: Wing + Role */}
              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField fullWidth required select label="Wing" value={selectedWings}
                    error={!!fieldErrors?.wing} helperText={fieldErrors?.wing?.join(', ')}
                    SelectProps={{
                      multiple: true, onChange: () => {},
                      renderValue: (selected) => {
                        if (!selected || selected.length === 0) return '';
                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((id) => {
                              const opt = wingOptions.find((w) => w.id === id);
                              return <Chip key={id} label={opt?.name || id} size="small"
                                sx={{ backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 500 }} />;
                            })}
                          </Box>
                        );
                      },
                      MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
                    }}
                    sx={{ ...fieldSx, '& .MuiOutlinedInput-root': { minHeight: 64, height: 'auto' } }}>
                    <MenuItem dense onClick={(e) => {
                      e.preventDefault();
                      const allIds = wingOptions.map((w) => w.id);
                      const allSelected = allIds.length > 0 && allIds.every((id) => selectedWings.includes(id));
                      setSelectedWings(allSelected ? [] : allIds);
                    }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                      <Checkbox size="small"
                        checked={wingOptions.length > 0 && wingOptions.every((w) => selectedWings.includes(w.id))}
                        indeterminate={wingOptions.some((w) => selectedWings.includes(w.id)) && !wingOptions.every((w) => selectedWings.includes(w.id))}
                        sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }} />
                      <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
                    </MenuItem>
                    {wingOptions.map((w) => (
                      <MenuItem key={w.id} dense onClick={(e) => {
                        e.preventDefault();
                        setSelectedWings((prev) => prev.includes(w.id) ? prev.filter((id) => id !== w.id) : [...prev, w.id]);
                      }}>
                        <Checkbox size="small" checked={selectedWings.includes(w.id)}
                          sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }} />
                        <ListItemText primary={w.name} primaryTypographyProps={{ fontSize: 13 }} />
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
                <div className="col-md-6 form-group">
                  <Autocomplete
                    options={roleOptions}
                    getOptionLabel={(o) => o.name || ''}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={selectedRole}
                    onChange={(_, v) => setSelectedRole(v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Role" required sx={fieldSx}
                        error={!!fieldErrors?.role} helperText={fieldErrors?.role?.join(', ')} />
                    )}
                  />
                </div>
              </div>

              {/* Row 7: Permissions (full width, outlined MUI style) */}
              <div className="row">
                <div className="col-md-12 form-group" style={{ width: '-webkit-fill-available' }}>
                  <TextField
                    fullWidth
                    label="Permissions"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      readOnly: true,
                      inputComponent: ChipsInput,
                      inputProps: { permissions: selectedRole?.permissions || [] },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { minHeight: 64, height: 'auto', alignItems: 'flex-start', padding: '14px' },
                      '& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)': { height: 'auto' },
                      '& .MuiOutlinedInput-input': { padding: 0, height: 'auto' },
                    }}
                  />
                </div>
              </div>

            </div>

            <div className="navigation-buttons">
              <button
                type="button"
                className="btn btn-prev"
                onClick={() => (onCancel ? onCancel() : navigate(isEdit ? '/dashboard/employees/list' : '/dashboard/employees'))}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
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
