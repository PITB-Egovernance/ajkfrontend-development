import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SearchableSelect from 'components/ui/SearchableSelect';
import { TextField } from '@mui/material';
import { formFieldSx } from 'components/ui/formFieldSx';
import { Building2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import DepartmentUserService from 'services/DepartmentUserService';
import { fetchPaginatedApiList } from 'utils';

const CreateDepartmentUser = () => {
  const navigate = useNavigate();
  const { hashId } = useParams();

  const isEditMode = Boolean(hashId);

  const API_BASE = Config.apiUrl;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});

  const getHeaders = () => ({
    Authorization: `Bearer ${AuthService.getToken()}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-API-KEY': Config.apiKey,
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (isEditMode && departmentOptions.length > 0) {
      fetchDepartmentUser();
    }
  }, [isEditMode, hashId, departmentOptions.length]);

  const normalizeDepartments = (list = []) => {
    return list.map((department) => ({
      id: department.hash_id || department.id,
      name: department.department_name || department.name || department.title || '-',
      raw: department,
    }));
  };

  const fetchDepartments = async () => {
    try {
      const data = await fetchPaginatedApiList(`${API_BASE}/settings/departments`, {
        headers: getHeaders(),
        perPage: 200,
      });
      setDepartmentOptions(normalizeDepartments(data));
    } catch (error) {
      toast.error('Server error while loading departments');
    }
  };

  const fetchDepartmentUser = async () => {
    setFetching(true);

    try {
      const response = await DepartmentUserService.getById(hashId);
      const user = response?.data || response;

      console.log("edit department Data", user);

      const departmentHashId = user?.department?.hash_id || '';
      const departmentNumericId = user?.department_id || user?.department?.id || '';
      const departmentName = user?.department?.department_name || '';

      const matchedDepartment = departmentOptions.find((dept) => {
        return (
          String(dept.id) === String(departmentHashId) ||
          String(dept.raw?.hash_id) === String(departmentHashId) ||
          String(dept.raw?.id) === String(departmentNumericId) ||
          String(dept.name).toLowerCase() === String(departmentName).toLowerCase()
        );
      });

      setSelectedDepartment(matchedDepartment || null);

      setUsername(user?.dept_user_name || user?.department_employee_name || '');
      setEmail(user?.email || '');
      setMobile(user?.mobile || '');
      setDesignation(user?.designation || '');
    } catch (error) {
      toast.error(error.message || 'Failed to load department user');
    } finally {
      setFetching(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!selectedDepartment?.id) {
      errors.department = ['Department is required'];
    }

    if (!username.trim()) {
      errors.username = ['Department employee name is required'];
    }

    if (!email.trim()) {
      errors.email = ['Email is required'];
    }

    if (!mobile.trim()) {
      errors.mobile = ['Mobile number is required'];
    } else if (mobile.length !== 11) {
      errors.mobile = ['Mobile number must be 11 digits'];
    }

    if (!designation.trim()) {
      errors.designation = ['Designation is required'];
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleApiErrors = (error) => {
    const apiErrors =
      error?.response?.data?.errors ||
      error?.errors ||
      null;

    if (apiErrors) {
      setFieldErrors(apiErrors);
      return;
    }

    toast.error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to save department user'
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setFieldErrors({});

    try {
      const payload = {
        department_id: selectedDepartment.id,
        dept_user_name: username,
        email,
        mobile,
        designation,
      };

      if (isEditMode) {
        await DepartmentUserService.update(hashId, payload);
        toast.success('Department user updated successfully');
      } else {
        await DepartmentUserService.create(payload);
        toast.success('Department user created successfully');
      }

      navigate('/dashboard/settings/department-users');
    } catch (error) {
      handleApiErrors(error);
    } finally {
      setLoading(false);
    }
  };

  const buttonText = useMemo(() => {
    if (loading) {
      return isEditMode ? 'Updating...' : 'Saving...';
    }

    return isEditMode ? 'Update' : 'Create Department User';
  }, [loading, isEditMode]);

  if (fetching) {
    return (
      <div className="job-creation-container">
        <div className="container">
          <div className="form-container">
            <div className="card-body">
              <p className="text-sm text-slate-500">Loading department user...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="job-creation-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-2xl font-bold shadow-lg mb-6">
          <div className="flex items-center justify-center gap-3">
            <Building2 className="w-8 h-8" />
            <span>{isEditMode ? 'Edit Department User' : 'Create Department User'}</span>
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
                  <SearchableSelect
                    required
                    label="Department"
                    value={selectedDepartment?.id || ''}
                    onChange={(e) => {
                      setSelectedDepartment(departmentOptions.find((d) => d.id === e.target.value) || null);
                      setFieldErrors((prev) => ({ ...prev, department: null }));
                    }}
                    options={departmentOptions.map((d) => ({ value: d.id, label: d.name }))}
                    placeholder="— Select Department —"
                    error={fieldErrors?.department?.join(', ')}
                  />
                </div>

                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Focal Person"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, username: null }));
                    }}
                    required
                    sx={formFieldSx}
                    error={!!fieldErrors?.username}
                    helperText={fieldErrors?.username?.join(', ')}
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, email: null }));
                    }}
                    required
                    sx={formFieldSx}
                    error={!!fieldErrors?.email}
                    helperText={fieldErrors?.email?.join(', ')}
                  />
                </div>

                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Mobile Number"
                    placeholder="11 digits e.g. 03001234567"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, '').slice(0, 11));
                      setFieldErrors((prev) => ({ ...prev, mobile: null }));
                    }}
                    required
                    inputProps={{
                      maxLength: 11,
                      inputMode: 'numeric',
                    }}
                    sx={formFieldSx}
                    error={!!fieldErrors?.mobile}
                    helperText={fieldErrors?.mobile?.join(', ') || `${mobile.length}/11 digits`}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Designation"
                    value={designation}
                    onChange={(e) => {
                      setDesignation(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, designation: null }));
                    }}
                    required
                    sx={formFieldSx}
                    error={!!fieldErrors?.designation}
                    helperText={fieldErrors?.designation?.join(', ')}
                  />
                </div>
              </div>
            </div>

            <div className="navigation-buttons">
              <button
                type="button"
                className="btn btn-prev"
                onClick={() => navigate('/dashboard/settings/department-users')}
                disabled={loading}
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
                  buttonText
                ) : (
                  <>
                    <Save size={16} />
                    <span>{buttonText}</span>
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

export default CreateDepartmentUser;
