import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from 'components/ui/SearchableSelect';
import { TextField } from '@mui/material';
import { Building2, Save } from 'lucide-react';
import { formFieldSx, formFieldAutoHeightSx } from 'components/ui/formFieldSx';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import DepartmentUserService from 'services/DepartmentUserService';
import { fetchPaginatedApiList } from 'utils';
import 'pages/job-creation/JobCreationForm.css';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const mapApiErrors = (apiErrors = {}) => {
  const mapped = { ...apiErrors };
  if (mapped.date_of_birth) mapped.dob = mapped.date_of_birth;
  if (mapped.domicile) mapped.domicile_district = mapped.domicile;
  return mapped;
};

const DepartmentUserForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [username, setUsername] = useState('');
  const [cnic, setCnic] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);

  const [districtOptions, setDistrictOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    const authHeaders = {
      Authorization: `Bearer ${AuthService.getToken()}`,
      Accept: 'application/json',
      'X-API-KEY': Config.apiKey,
    };

    const fetchOptions = async () => {
      try {
        const [dRes, departments, rRes] = await Promise.all([
          fetch(`${Config.apiUrl}/settings/districts`, { headers: authHeaders }),
          fetchPaginatedApiList(`${Config.apiUrl}/settings/departments`, {
            headers: authHeaders,
            perPage: 200,
          }),
          fetch(`${Config.apiUrl}/settings/roles`, { headers: authHeaders }),
        ]);
        const [dData, depData, rData] = await Promise.all([
          dRes.json(), Promise.resolve(departments), rRes.json(),
        ]);

        if (dData.success) {
          setDistrictOptions(
            (dData.data?.data ?? dData.data ?? []).map((d) => ({ id: d.hash_id, name: d.name }))
          );
        }
        setDepartmentOptions(
          depData.filter((d) => (d.status ?? 'active') === 'active')
            .map((d) => ({ id: d.hash_id || d.id, name: d.department_name || d.name }))
        );
        if (rData.success) {
          setRoleOptions(
            (rData.data?.data ?? rData.data ?? [])
              .filter((r) => !r.deleted_at)
              .map((r) => ({ id: r.hash_id, name: r.role_name }))
          );
        }
      } catch {
        toast.error('Failed to load form options');
      }
    };
    fetchOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const errors = {};
    if (!username.trim()) errors.username = ['Username is required'];
    // if (!cnic.trim()) errors.cnic = ['CNIC is required'];
    // else if (cnic.length !== 13) errors.cnic = ['CNIC must be exactly 13 digits'];
    if (!email.trim()) errors.email = ['Email address is required'];
    // if (!fatherHusbandName.trim()) errors.father_husband_name = ['Father/Husband name is required'];
    // if (!dob) errors.dob = ['Date of birth is required'];
    // if (!gender) errors.gender = ['Gender is required'];
    if (!mobile.trim()) errors.mobile = ['Mobile number is required'];
    if (!designation.trim()) errors.email = ['Designation'];
    else if (mobile.length !== 11) errors.mobile = ['Mobile number must be exactly 11 digits'];
    // if (!district) errors.domicile_district = ['Domicile district is required'];
    if (!selectedDepartment) errors.department = ['Department designation is required'];
    // if (!selectedRoles || selectedRoles.length === 0) errors.role = ['Role is required'];

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating department user...');

    console.log("department id", selectedDepartment.id)
    try {
      const result = await DepartmentUserService.create({
        dept_user_name: username.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        designation:designation.trim(),
        department_id: selectedDepartment.id,
        // cnic: cnic.trim().replace(/[^0-9]/g, ''),
        // father_husband_name: fatherHusbandName.trim(),
        // gender: gender.toLowerCase(),
        // date_of_birth: dob,
        // domicile: district.name,
        // role_permission: selectedRoles,
      });

      toast.success(result?.message || 'Department user created successfully', { id: loadingToast });
      navigate('/dashboard/settings/department-users');
    } catch (error) {
      if (error.errors && Object.keys(error.errors).length > 0) {
        setFieldErrors(mapApiErrors(error.errors));
      }
      toast.error(error.message || 'Failed to create department user', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-creation-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-2xl font-bold shadow-lg mb-6">
          <div className="flex items-center justify-center gap-3">
            <Building2 className="w-8 h-8" />
            <span>Create Department User</span>
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
              {/* Row 1: Username + CNIC */}
              <div className="row">
                <div className="col-md-6 form-group">
                  <SearchableSelect
                    required
                    label="Department"
                    value={selectedDepartment?.id || ''}
                    onChange={(e) => setSelectedDepartment(departmentOptions.find((d) => d.id === e.target.value) || null)}
                    options={departmentOptions.map((d) => ({ value: d.id, label: d.name }))}
                    placeholder="— Select Department —"
                    error={fieldErrors?.department?.join(', ')}
                  />
                </div>
                <div className="col-md-6 form-group">
                  <TextField fullWidth label="Focal Person" value={username}
                    onChange={(e) => setUsername(e.target.value)} required sx={formFieldSx}
                    error={!!fieldErrors?.username} helperText={fieldErrors?.username?.join(', ')} />
                </div>
               
                {/*  */}
              </div>

              {/* Row 2: Email + Father/Husband */}
              {/* <div className="row">
                
                <div className="col-md-6 form-group">
                  <TextField fullWidth label="Father/Husband Name" value={fatherHusbandName}
                    onChange={(e) => setFatherHusbandName(e.target.value)} required sx={formFieldSx}
                    error={!!fieldErrors?.father_husband_name} helperText={fieldErrors?.father_husband_name?.join(', ')} />
                </div>
              </div> */}

              {/* Row 3: DOB + Gender */}
              <div className="row">
                 <div className="col-md-6 form-group">
                  <TextField fullWidth label="Email Address" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required sx={formFieldSx}
                    error={!!fieldErrors?.email} helperText={fieldErrors?.email?.join(', ')} />
                </div>
                <div className="col-md-6 form-group">
                  <TextField fullWidth label="Mobile Number" placeholder="11 digits e.g. 03001234567"
                    value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    required inputProps={{ maxLength: 11, inputMode: 'numeric' }} sx={formFieldSx}
                    error={!!fieldErrors?.mobile} helperText={fieldErrors?.mobile?.join(', ') || `${mobile.length}/11 digits`} />
                </div>
               
              </div>


              {/* Row 5: Department + Role */}
              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField fullWidth label="Designation" value={designation}
                    onChange={(e) => setDesignation(e.target.value)} required sx={formFieldSx}
                    error={!!fieldErrors?.designation} helperText={fieldErrors?.designation?.join(', ')} />
                </div>
                {/* <div className="col-md-6 form-group">
                  <TextField fullWidth required select label="Role" value={selectedRoles}
                    error={!!fieldErrors?.role} helperText={fieldErrors?.role?.join(', ')}
                    SelectProps={{
                      multiple: true, onChange: () => {},
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
                    sx={formFieldAutoHeightSx}>
                    <MenuItem dense onClick={(e) => {
                      e.preventDefault();
                      const allIds = roleOptions.map((r) => r.id);
                      const allSelected = allIds.length > 0 && allIds.every((id) => selectedRoles.includes(id));
                      setSelectedRoles(allSelected ? [] : allIds);
                    }} sx={{ borderBottom: '1px solid #e2e8f0' }}>
                      <Checkbox size="small"
                        checked={roleOptions.length > 0 && roleOptions.every((r) => selectedRoles.includes(r.id))}
                        indeterminate={roleOptions.some((r) => selectedRoles.includes(r.id)) && !roleOptions.every((r) => selectedRoles.includes(r.id))}
                        sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' }, '&.MuiCheckbox-indeterminate': { color: '#059669' } }} />
                      <ListItemText primary="Select All" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
                    </MenuItem>
                    {roleOptions.map((r) => (
                      <MenuItem key={r.id} dense onClick={(e) => {
                        e.preventDefault();
                        setSelectedRoles((prev) => prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]);
                      }}>
                        <Checkbox size="small" checked={selectedRoles.includes(r.id)}
                          sx={{ p: 0.5, color: '#10b981', '&.Mui-checked': { color: '#059669' } }} />
                        <ListItemText primary={r.name} primaryTypographyProps={{ fontSize: 13 }} />
                      </MenuItem>
                    ))}
                  </TextField>
                </div> */}
              </div>
            </div>

            <div className="navigation-buttons">
              <button type="button" className="btn btn-prev"
                onClick={() => navigate('/dashboard/settings/department-users')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                {loading ? 'Saving...' : <><Save size={16} /><span>Create</span></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DepartmentUserForm;
