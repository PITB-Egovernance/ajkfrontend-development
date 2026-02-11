import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextField, MenuItem } from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { 
  Building2, 
  Save, 
  Upload,
  ArrowLeft,
  Edit2,
  X,
  Mail,
  Phone,
  MapPin,
  User,
  Users,
  CheckCircle2,
  Image as ImageIcon,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const OrganizationInformation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [organizationData, setOrganizationData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    short_name: '',
    chairman_id: '',
    chairman_alternate_id: '',
    secretary_id: '',
    secretary_alternate_id: '',
    office_address: '',
    office_contact: '',
    office_email: '',
    support_hotline: '',
    logo: null,
    favicon: null,
    org_chart_image: null
  });
  const [previews, setPreviews] = useState({
    logo: null,
    favicon: null,
    org_chart_image: null
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/employees/list`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setEmployees(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees list');
    }
  }, [API_BASE, TOKEN, API_KEY]);

  const fetchOrganizationData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/organization`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200 && result.data) {
        setOrganizationData(result.data);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, TOKEN, API_KEY]);

  const openEditModal = () => {
    if (organizationData) {
      setFormData({
        full_name: organizationData.full_name || '',
        short_name: organizationData.short_name || '',
        chairman_id: organizationData.chairman_id || '',
        chairman_alternate_id: organizationData.chairman_alternate_id || '',
        secretary_id: organizationData.secretary_id || '',
        secretary_alternate_id: organizationData.secretary_alternate_id || '',
        office_address: organizationData.office_address || '',
        office_contact: organizationData.office_contact || '',
        office_email: organizationData.office_email || '',
        support_hotline: organizationData.support_hotline || '',
        logo: null,
        favicon: null,
        org_chart_image: null
      });
      setPreviews({
        logo: organizationData.logo_url || null,
        favicon: organizationData.favicon_url || null,
        org_chart_image: organizationData.org_chart_url || null
      });
    }
    setShowModal(true);
  };

  useEffect(() => {
    fetchEmployees();
    fetchOrganizationData();
  }, [fetchEmployees, fetchOrganizationData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPG, PNG, GIF)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should not exceed 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({
          ...prev,
          [fieldName]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.full_name?.trim()) errors.push('Full organization name is required');
    if (!formData.short_name?.trim()) errors.push('Short name is required');
    if (!formData.office_address?.trim()) errors.push('Office address is required');
    if (!formData.office_contact?.trim()) errors.push('Office contact is required');
    if (!formData.office_email?.trim()) errors.push('Office email is required');
    if (formData.office_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.office_email)) {
      errors.push('Invalid email format');
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && !(formData[key] instanceof File)) {
          formDataToSend.append(key, formData[key]);
        }
      });

      if (formData.logo instanceof File) {
        formDataToSend.append('logo', formData.logo);
      }
      if (formData.favicon instanceof File) {
        formDataToSend.append('favicon', formData.favicon);
      }
      if (formData.org_chart_image instanceof File) {
        formDataToSend.append('org_chart_image', formData.org_chart_image);
      }

      const response = await fetch(`${API_BASE}/settings/organization/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
        body: formDataToSend,
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('Organization information updated successfully');
        setShowModal(false);
        fetchOrganizationData();
      } else {
        toast.error(result.message || 'Failed to update organization information');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('An error occurred while updating organization information');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id) => {
    const employee = employees.find(emp => emp.id === id);
    return employee ? employee.name : 'Not assigned';
  };

  const leadershipCount = [
    organizationData?.chairman_id,
    organizationData?.chairman_alternate_id,
    organizationData?.secretary_id,
    organizationData?.secretary_alternate_id
  ].filter(id => id).length;

  const brandingCount = [
    organizationData?.logo_url,
    organizationData?.favicon_url,
    organizationData?.org_chart_url
  ].filter(url => url).length;

  const isComplete = organizationData?.full_name && 
                     organizationData?.office_address && 
                     organizationData?.office_contact && 
                     organizationData?.office_email;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard/settings')}
            className="mb-4 text-sm text-slate-600 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Organization Information</h1>
              <p className="text-sm text-slate-500 mt-1">Manage organizational profile and contact details</p>
            </div>
            <Button
              onClick={openEditModal}
              className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
            >
              {organizationData ? (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Leadership Team</p>
                  <p className="text-2xl font-bold text-slate-900">{leadershipCount}</p>
                </div>
                <Users className="w-10 h-10 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Profile Status</p>
                  <p className="text-2xl font-bold text-slate-900">{isComplete ? 'Complete' : 'Incomplete'}</p>
                </div>
                <CheckCircle2 className={`w-10 h-10 ${isComplete ? 'text-blue-500' : 'text-slate-300'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Branding Assets</p>
                  <p className="text-2xl font-bold text-slate-900">{brandingCount}</p>
                </div>
                <ImageIcon className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organization Information Card */}
        <div>
          {loading && !organizationData ? (
            <Card className="border border-slate-200">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading organization information...</p>
              </CardContent>
            </Card>
          ) : organizationData ? (
            <Card className="border border-slate-200">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Basic Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Building2 className="w-6 h-6 text-emerald-600" />
                      <h3 className="text-xl font-bold text-slate-900">Basic Information</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Full Name</p>
                          <p className="text-lg font-semibold text-slate-900">{organizationData.full_name || 'Not set'}</p>
                        </div>
                      </div>
                      <div className="flex items-start justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Short Name</p>
                          <p className="text-lg font-semibold text-slate-900">{organizationData.short_name || 'Not set'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-6 mb-4">
                      <User className="w-6 h-6 text-emerald-600" />
                      <h3 className="text-xl font-bold text-slate-900">Leadership</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-xs text-slate-600 mb-1">Chairman</p>
                        <p className="text-base font-semibold text-slate-900">{getEmployeeName(organizationData.chairman_id)}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-xs text-slate-600 mb-1">Alternate Chairman</p>
                        <p className="text-base font-semibold text-slate-900">{getEmployeeName(organizationData.chairman_alternate_id)}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-xs text-slate-600 mb-1">Secretary</p>
                        <p className="text-base font-semibold text-slate-900">{getEmployeeName(organizationData.secretary_id)}</p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-xs text-slate-600 mb-1">Alternate Secretary</p>
                        <p className="text-base font-semibold text-slate-900">{getEmployeeName(organizationData.secretary_alternate_id)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Branding Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <MapPin className="w-6 h-6 text-amber-600" />
                      <h3 className="text-xl font-bold text-slate-900">Contact Information</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm text-slate-600 mb-1 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Office Address
                        </p>
                        <p className="text-base text-slate-900">{organizationData.office_address || 'Not set'}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <p className="text-xs text-slate-600 mb-1 flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            Contact Number
                          </p>
                          <p className="text-base font-semibold text-slate-900">{organizationData.office_contact || 'Not set'}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <p className="text-xs text-slate-600 mb-1 flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            Support Hotline
                          </p>
                          <p className="text-base font-semibold text-slate-900">{organizationData.support_hotline || 'Not set'}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <p className="text-xs text-slate-600 mb-1 flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            Email
                          </p>
                          <p className="text-base font-semibold text-slate-900">{organizationData.office_email || 'Not set'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-6 mb-4">
                      <ImageIcon className="w-6 h-6 text-purple-600" />
                      <h3 className="text-xl font-bold text-slate-900">Branding Assets</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-slate-600 mb-2">Logo</p>
                        {organizationData.logo_url ? (
                          <div className="w-full h-20 border-2 border-emerald-200 rounded-lg overflow-hidden bg-white p-1">
                            <img src={organizationData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-full h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-600 mb-2">Favicon</p>
                        {organizationData.favicon_url ? (
                          <div className="w-full h-20 border-2 border-emerald-200 rounded-lg overflow-hidden bg-white p-1">
                            <img src={organizationData.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-full h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-600 mb-2">Org Chart</p>
                        {organizationData.org_chart_url ? (
                          <div className="w-full h-20 border-2 border-purple-200 rounded-lg overflow-hidden bg-white p-1">
                            <img src={organizationData.org_chart_url} alt="Org Chart" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-full h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-emerald-200">
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No organization information found</p>
                <p className="text-sm text-slate-500">Click the "Add Information" button above to get started</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <form onSubmit={handleSubmit}>
                <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-white" />
                    {organizationData ? 'Edit Organization Information' : 'Add Organization Information'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-white hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextField
                        fullWidth
                        label="Full Organization Name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        required
                      />
                      <TextField
                        fullWidth
                        label="Short Name"
                        name="short_name"
                        value={formData.short_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Leadership</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextField
                        select
                        fullWidth
                        label="Chairman"
                        name="chairman_id"
                        value={formData.chairman_id}
                        onChange={handleInputChange}
                      >
                        <MenuItem value="">Select Chairman</MenuItem>
                        {employees.map(emp => (
                          <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        fullWidth
                        label="Alternate Chairman"
                        name="chairman_alternate_id"
                        value={formData.chairman_alternate_id}
                        onChange={handleInputChange}
                      >
                        <MenuItem value="">Select Alternate</MenuItem>
                        {employees.map(emp => (
                          <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        fullWidth
                        label="Secretary"
                        name="secretary_id"
                        value={formData.secretary_id}
                        onChange={handleInputChange}
                      >
                        <MenuItem value="">Select Secretary</MenuItem>
                        {employees.map(emp => (
                          <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        fullWidth
                        label="Alternate Secretary"
                        name="secretary_alternate_id"
                        value={formData.secretary_alternate_id}
                        onChange={handleInputChange}
                      >
                        <MenuItem value="">Select Alternate</MenuItem>
                        {employees.map(emp => (
                          <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                        ))}
                      </TextField>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
                    <div className="space-y-4">
                      <TextField
                        fullWidth
                        label="Office Address"
                        name="office_address"
                        value={formData.office_address}
                        onChange={handleInputChange}
                        multiline
                        rows={3}
                        required
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField
                          fullWidth
                          label="Office Contact"
                          name="office_contact"
                          value={formData.office_contact}
                          onChange={handleInputChange}
                          required
                        />
                        <TextField
                          fullWidth
                          label="Support Hotline"
                          name="support_hotline"
                          value={formData.support_hotline}
                          onChange={handleInputChange}
                        />
                      </div>
                      <TextField
                        fullWidth
                        label="Office Email"
                        name="office_email"
                        type="email"
                        value={formData.office_email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Branding Assets</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Logo</p>
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <input
                              type="file"
                              id="logo"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, 'logo')}
                              className="hidden"
                            />
                            <label
                              htmlFor="logo"
                              className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50"
                            >
                              <Upload className="w-5 h-5 text-slate-400 mr-2" />
                              <span className="text-sm text-slate-600">Upload logo (Max 5MB)</span>
                            </label>
                          </div>
                          {previews.logo && (
                            <div className="w-24 h-24 border-2 border-slate-200 rounded-lg overflow-hidden">
                              <img src={previews.logo} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Favicon</p>
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <input
                              type="file"
                              id="favicon"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, 'favicon')}
                              className="hidden"
                            />
                            <label
                              htmlFor="favicon"
                              className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50"
                            >
                              <Upload className="w-5 h-5 text-slate-400 mr-2" />
                              <span className="text-sm text-slate-600">Upload favicon (Max 5MB)</span>
                            </label>
                          </div>
                          {previews.favicon && (
                            <div className="w-16 h-16 border-2 border-slate-200 rounded-lg overflow-hidden">
                              <img src={previews.favicon} alt="Favicon" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Organizational Chart (Optional)</p>
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <input
                              type="file"
                              id="org_chart_image"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, 'org_chart_image')}
                              className="hidden"
                            />
                            <label
                              htmlFor="org_chart_image"
                              className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50"
                            >
                              <Upload className="w-5 h-5 text-slate-400 mr-2" />
                              <span className="text-sm text-slate-600">Upload org chart (Max 5MB)</span>
                            </label>
                          </div>
                          {previews.org_chart_image && (
                            <div className="w-32 h-24 border-2 border-slate-200 rounded-lg overflow-hidden">
                              <img src={previews.org_chart_image} alt="Org Chart" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 rounded-b-xl sticky bottom-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizationInformation;
