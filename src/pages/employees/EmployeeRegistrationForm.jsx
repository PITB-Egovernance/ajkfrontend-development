import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, MenuItem, Autocomplete } from '@mui/material';
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
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [grade, setGrade] = useState(null);

  const [districtOptions, setDistrictOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);

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
        const response = await fetch(`${Config.apiUrl}/settings/designations?per_page=100`, { headers: authHeaders });
        const result = await response.json();
        if (result.success) {
          setDesignationOptions(
            (result.data?.data ?? result.data ?? []).map((d) => ({
              id: d.hash_id,
              name: d.name,
            }))
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

    fetchDistricts();
    fetchDesignations();
    fetchGrades();
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
    if (!password) errors.password = ['Password is required'];
    else if (password.length < 8) errors.password = ['Password must be at least 8 characters'];
    if (!passwordConfirmation) errors.password_confirmation = ['Please confirm the password'];
    else if (password && passwordConfirmation !== password) errors.password_confirmation = ['Passwords do not match'];
    if (!fatherHusbandName.trim()) errors.father_husband_name = ['Father/Husband name is required'];
    if (!dob) errors.dob = ['Date of birth is required'];
    if (!gender) errors.gender = ['Gender is required'];
    if (!mobile.trim()) errors.mobile = ['Mobile number is required'];
    else if (mobile.length !== 11) errors.mobile = ['Mobile number must be exactly 11 digits'];
    if (!district) errors.domicile_district = ['Domicile district is required'];
    if (!designation) errors.designation = ['Designation is required'];
    if (!grade) errors.grade = ['Grade is required'];

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
        password,
        password_confirmation: passwordConfirmation,
        father_husband_name: fatherHusbandName.trim(),
        email: email.trim(),
        gender: gender.toLowerCase(),
        date_of_birth: dob,
        domicile: district.name,
        mobile: mobile.trim(),
        designation: designation.name,
        grade: grade.name,
        role: 'employee',
        status: 'inactive',
        status_job: 'active',
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

              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    sx={fieldSx}
                    error={!!fieldErrors?.password}
                    helperText={fieldErrors?.password?.join(', ')}
                  />
                </div>
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                    sx={fieldSx}
                    error={!!fieldErrors?.password_confirmation}
                    helperText={fieldErrors?.password_confirmation?.join(', ')}
                  />
                </div>
              </div>

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
                  <Autocomplete
                    options={designationOptions}
                    getOptionLabel={(option) => option.name || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={designation}
                    onChange={(_, newValue) => setDesignation(newValue)}
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
                  <Autocomplete
                    options={gradeOptions}
                    getOptionLabel={(option) => option.name || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={grade}
                    onChange={(_, newValue) => setGrade(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Grade"
                        required
                        sx={fieldSx}
                        error={!!fieldErrors?.grade}
                        helperText={fieldErrors?.grade?.join(', ')}
                      />
                    )}
                  />
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
