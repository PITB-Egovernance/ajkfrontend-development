import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextField, MenuItem } from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  User,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const CompaniesManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Construction',
    contact_person: '',
    contact_number: '',
    email: '',
    address: '',
    ntn: '',
    status: 'active'
  });

  const companyTypes = [
    'Construction',
    'IT Services',
    'Consulting',
    'Engineering',
    'Supply & Services',
    'Maintenance',
    'Other'
  ];

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/companies`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setCompanies(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      type: 'Construction',
      contact_person: '',
      contact_number: '',
      email: '',
      address: '',
      ntn: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      type: company.type || 'Construction',
      contact_person: company.contact_person || '',
      contact_number: company.contact_number || '',
      email: company.email || '',
      address: company.address || '',
      ntn: company.ntn || '',
      status: company.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Company name is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingCompany 
        ? `${API_BASE}/settings/companies/${editingCompany.id}/update`
        : `${API_BASE}/settings/companies/create`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success(editingCompany ? 'Company updated successfully' : 'Company created successfully');
        setShowModal(false);
        fetchCompanies();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/companies/${companyId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('Company deleted successfully');
        fetchCompanies();
      } else {
        toast.error(result.message || 'Failed to delete company');
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.ntn?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || company.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const activeCompanies = filteredCompanies.filter(c => c.status === 'active').length;
  const inactiveCompanies = filteredCompanies.filter(c => c.status !== 'active').length;

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
              <h1 className="text-2xl font-bold text-slate-900">Companies Management</h1>
              <p className="text-sm text-slate-500 mt-1">Manage vendor companies and organizations</p>
            </div>
            <Button
              onClick={openAddModal}
              className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Companies</p>
                    <p className="text-3xl font-bold text-teal-600">{filteredCompanies.length}</p>
                  </div>
                  <Building2 className="w-12 h-12 text-teal-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Active Companies</p>
                    <p className="text-3xl font-bold text-emerald-600">{activeCompanies}</p>
                  </div>
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Inactive Companies</p>
                    <p className="text-3xl font-bold text-slate-600">{inactiveCompanies}</p>
                  </div>
                  <XCircle className="w-12 h-12 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
            <TextField
              fullWidth
              type="text"
              placeholder="Search by company name, contact person, or NTN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                style: { paddingLeft: '2.5rem' }
              }}
            />
          </div>

          <TextField
            select
            fullWidth
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="Filter by type"
          >
            <MenuItem value="all">All Types</MenuItem>
            {companyTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>
        </motion.div>

        {/* Companies Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loading && filteredCompanies.length === 0 ? (
            <Card className="border-2 border-teal-200">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading companies...</p>
              </CardContent>
            </Card>
          ) : filteredCompanies.length === 0 ? (
            <Card className="border-2 border-teal-200">
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No companies found</p>
                <Button onClick={openAddModal} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Company
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-slate-50 rounded-lg">
              {filteredCompanies.map((company, index) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className={`border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${
                    company.status === 'active' 
                      ? 'border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50' 
                      : 'border-slate-200 bg-slate-50'
                  }`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 line-clamp-1">{company.name}</h3>
                            <span className="text-xs text-teal-600 font-medium">{company.type}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          company.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {company.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4 text-sm">
                        {company.contact_person && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="line-clamp-1">{company.contact_person}</span>
                          </div>
                        )}
                        {company.contact_number && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>{company.contact_number}</span>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="line-clamp-1">{company.email}</span>
                          </div>
                        )}
                        {company.address && (
                          <div className="flex items-start gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <span className="line-clamp-2">{company.address}</span>
                          </div>
                        )}
                        {company.ntn && (
                          <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                            NTN: {company.ntn}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-slate-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(company)}
                          className="flex-1 text-teal-600 hover:text-teal-700"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(company.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <form onSubmit={handleSubmit}>
                <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-white" />
                    {editingCompany ? 'Edit Company' : 'Add New Company'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-white hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <TextField
                        fullWidth
                        label="Company Name"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter company name"
                        required
                      />
                    </div>

                    <div>
                      <TextField
                        select
                        fullWidth
                        label="Company Type"
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                      >
                        {companyTypes.map(type => (
                          <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                      </TextField>
                    </div>

                    <div>
                      <TextField
                        fullWidth
                        label="NTN Number"
                        id="ntn"
                        name="ntn"
                        value={formData.ntn}
                        onChange={handleInputChange}
                        placeholder="Enter NTN"
                      />
                    </div>

                    <div>
                      <TextField
                        fullWidth
                        label="Contact Person"
                        id="contact_person"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleInputChange}
                        placeholder="Enter contact person name"
                      />
                    </div>

                    <div>
                      <TextField
                        fullWidth
                        label="Contact Number"
                        id="contact_number"
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleInputChange}
                        placeholder="Enter contact number"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <TextField
                        fullWidth
                        label="Email Address"
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <TextField
                        fullWidth
                        label="Address"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter complete address"
                        multiline
                        rows={3}
                      />
                    </div>

                    <div>
                      <TextField
                        select
                        fullWidth
                        label="Status"
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                      </TextField>
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
                    className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingCompany ? 'Update' : 'Create'} Company
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompaniesManagement;
