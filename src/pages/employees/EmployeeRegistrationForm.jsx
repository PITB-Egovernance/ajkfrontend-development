import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, MenuItem, Autocomplete, Checkbox, ListItemText, Chip, Box } from '@mui/material';
import { UserPlus, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Config from '../../config/baseUrl';
import AuthService from '../../services/authService';
import EmployeeService from '../../services/EmployeeService';
import '../job-creation/JobCreationForm.css';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];


const mapApiErrors = (apiErrors = {}) => {
  const mapped = { ...apiErrors };
  if (mapped.date_of_birth) mapped.dob = mapped.date_of_birth;
  if (mapped.domicile) mapped.domicile_district = mapped.domicile;
  return mapped;
};

const EmployeeRegistrationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [username, setUsername] = useState('');
  const [cnic, setCnic] = useState('');
  const [email, setEmail] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState(null);
  const [designation, setDesignation] = useState([]);
  const [grade, setGrade] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);

  const [districtOptions, setDistrictOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
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

        if (desigResult.success) {
          setDesignationOptions(
            (desigResult.data?.data ?? desigResult.data ?? [])
              .filter((d) => d.wings && !['chairman', 'secretary'].includes(d.name?.toLowerCase()))
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

    const fetchGrades = async () => {
      try {
        const response = await fetch(`${Config.apiUrl}/settings/grades?per_page=100`, { headers: authHeaders });
        const result = await response.json();
        if (result.success) {
          setGradeOptions(
            (result.data?.data ?? result.data ?? []).map((g) => ({
              id: g.hash_id,
              name: g.name,
            }))
          );
        }
      } catch (error) {
        toast.error('Failed to load grades');
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
              }))
          );
        }
      } catch {
        setRoleOptions([]);
      }
    };

    fetchDistricts();
    fetchDesignations();
    fetchGrades();
    fetchRoles();
  }, []);

  const fieldSx = {
    '& .MuiOutlinedInput-root': { minHeight: 56 },
    '& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)': { height: 56 },
    '& .MuiOutlinedInput-input': { padding: '14px' },
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
    if (!designation || designation.length === 0) errors.designation = ['Designation is required'];
    const derivedGrades = [...new Set(
      designation.map((id) => designationOptions.find((d) => d.id === id)?.gradeName).filter(Boolean)
    )];
    if (derivedGrades.length === 0) errors.grade = ['Select a designation with a valid grade'];
    if (!selectedRoles || selectedRoles.length === 0) errors.role = ['Role is required'];

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Registering employee...');
    try {
      const result = await EmployeeService.register({
        username: username.trim(),
        cnic: cnic.trim().replace(/[^0-9]/g, ''),
        father_husband_name: fatherHusbandName.trim(),
        email: email.trim(),
        gender: gender.toLowerCase(),
        date_of_birth: dob,
        domicile: district.name,
        mobile: mobile.trim(),
        designation: designation.map((id) => {
          const opt = designationOptions.find((d) => d.id === id);
          return opt ? opt.name : id;
        }),
        grade: [...new Set(
          designation.map((id) => designationOptions.find((d) => d.id === id)?.gradeName).filter(Boolean)
        )].join(', '),
        role_permission: selectedRoles,
      });

      toast.success(result?.message || 'Employee registered successfully', { id: loadingToast });
      navigate('/dashboard/employees/list');
    } catch (error) {
      if (error.errors && Object.keys(error.errors).length > 0) {
        setFieldErrors(mapApiErrors(error.errors));
      }
      toast.error(error.message || 'Failed to register employee', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-creation-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-2xl font-bold shadow-lg mb-6">
          <div className="flex items-center justify-center gap-3">
            <UserPlus className="w-8 h-8" />
            <span>Employee Manual Registration</span>
          </div>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="card-body">
            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">Personal Information</h6>
              </div>
            </div>

            <div className="mb-8 p-6 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
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
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ style: { height: 28 } }}
                    sx={fieldSx}
                    error={!!fieldErrors?.dob}
                    helperText={fieldErrors?.dob?.join(', ')}
                  />
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

              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    required
                    select
                    label="Designation"
                    value={designation}
                    error={!!fieldErrors?.designation}
                    helperText={fieldErrors?.designation?.join(', ')}
                    SelectProps={{
                      multiple: true,
                      onChange: () => {},
                      renderValue: (selected) => {
                        if (!selected || selected.length === 0) return '';
                        return (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                            {selected.map((id) => {
                              const opt = designationOptions.find((d) => d.id === id);
                              const label = opt ? (opt.wingName ? `${opt.name} — ${opt.wingName}` : opt.name) : id;
                              return <Chip key={id} label={label} size="small" />;
                            })}
                          </Box>
                        );
                      },
                      MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
                    }}
                    sx={{
                      ...fieldSx,
                      '& .MuiOutlinedInput-root': { minHeight: 56, height: 'auto' },
                    }}
                  >
                    {/* Select All */}
                    <MenuItem dense onClick={(e) => {
                      e.preventDefault();
                      const allIds = designationOptions.map((d) => d.id);
                      const allSelected = allIds.length > 0 && allIds.every((id) => designation.includes(id));
                      setDesignation(allSelected ? [] : allIds);
                    }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                      <Checkbox size="small"
                        checked={designationOptions.length > 0 && designationOptions.every((d) => designation.includes(d.id))}
                        indeterminate={designationOptions.some((d) => designation.includes(d.id)) && !designationOptions.every((d) => designation.includes(d.id))}
                        sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }}
                      />
                      <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
                    </MenuItem>

                    {designationOptions.map((d) => (
                      <MenuItem key={d.id} dense onClick={(e) => {
                        e.preventDefault();
                        setDesignation((prev) =>
                          prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                        );
                      }}>
                        <Checkbox
                          size="small"
                          checked={designation.includes(d.id)}
                          sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }}
                        />
                        <ListItemText
                          primary={d.wingName ? `${d.name} — ${d.wingName}` : d.name}
                          primaryTypographyProps={{ fontSize: 13 }}
                        />
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Grade"
                    required
                    value={(() => {
                      const grades = designation
                        .map((id) => designationOptions.find((d) => d.id === id)?.gradeName)
                        .filter(Boolean);
                      return [...new Set(grades)].join(', ');
                    })()}
                    InputProps={{ readOnly: true }}
                    sx={{
                      ...fieldSx,
                      '& .MuiOutlinedInput-root': { backgroundColor: '#f8fafc' },
                    }}
                    helperText={designation.length === 0 ? 'Select a designation to auto-fill grade' : ''}
                  />
                </div>
              </div>

              {/* Role */}
              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    required
                    select
                    label="Role"
                    value={selectedRoles}
                    error={!!fieldErrors?.role}
                    helperText={fieldErrors?.role?.join(', ')}
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
                    sx={{
                      ...fieldSx,
                      '& .MuiOutlinedInput-root': { minHeight: 56, height: 'auto' },
                    }}
                  >
                    {/* Select All */}
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

            </div>

            <div className="navigation-buttons">
              <button
                type="button"
                className="btn btn-prev"
                onClick={() => navigate('/dashboard/employees')}
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
                    <span>Register Employee</span>
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
