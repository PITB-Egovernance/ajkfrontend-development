import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextField, MenuItem } from '@mui/material';
import { Card, CardContent } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import { 
  Users, 
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
  CreditCard,
  Briefcase,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const ContractorsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cnic: '',
    expertise: 'General',
    contact_number: '',
    email: '',
    address: '',
    status: 'active'
  });

  const expertiseAreas = [
    'General',
    'Civil Works',
    'Electrical',
    'Plumbing',
    'HVAC',
    'Carpentry',
    'Painting',
    'Masonry',
    'Other'
  ];

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    fetchContractors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchContractors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/contractors`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setContractors(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching contractors:', error);
      toast.error('Failed to load contractors');
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
    setEditingContractor(null);
    setFormData({
      name: '',
      cnic: '',
      expertise: 'General',
      contact_number: '',
      email: '',
      address: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (contractor) => {
    setEditingContractor(contractor);
    setFormData({
      name: contractor.name || '',
      cnic: contractor.cnic || '',
      expertise: contractor.expertise || 'General',
      contact_number: contractor.contact_number || '',
      email: contractor.email || '',
      address: contractor.address || '',
      status: contractor.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Contractor name is required');
      return;
    }

    if (!formData.cnic?.trim()) {
      toast.error('CNIC is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingContractor 
        ? `${API_BASE}/settings/contractors/${editingContractor.id}/update`
        : `${API_BASE}/settings/contractors/create`;

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
        toast.success(editingContractor ? 'Contractor updated successfully' : 'Contractor created successfully');
        setShowModal(false);
        fetchContractors();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving contractor:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contractorId) => {
    if (!window.confirm('Are you sure you want to delete this contractor?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/contractors/${contractorId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('Contractor deleted successfully');
        fetchContractors();
      } else {
        toast.error(result.message || 'Failed to delete contractor');
      }
    } catch (error) {
      console.error('Error deleting contractor:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const filteredContractors = contractors.filter(contractor => {
    const matchesSearch = contractor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contractor.cnic?.includes(searchTerm) ||
                         contractor.contact_number?.includes(searchTerm);
    const matchesExpertise = expertiseFilter === 'all' || contractor.expertise === expertiseFilter;
    return matchesSearch && matchesExpertise;
  });

  const activeContractors = filteredContractors.filter(c => c.status === 'active').length;
  const inactiveContractors = filteredContractors.filter(c => c.status !== 'active').length;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/settings')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Contractors Management</h1>
                <p className="text-slate-600 mt-1">Manage individual contractors and freelancers</p>
              </div>
            </div>
            <Button
              onClick={openAddModal}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contractor
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Contractors</p>
                    <p className="text-3xl font-bold text-violet-600">{filteredContractors.length}</p>
                  </div>
                  <Users className="w-12 h-12 text-violet-400" />
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
                    <p className="text-sm text-slate-600 mb-1">Active Contractors</p>
                    <p className="text-3xl font-bold text-emerald-600">{activeContractors}</p>
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
                    <p className="text-sm text-slate-600 mb-1">Inactive Contractors</p>
                    <p className="text-3xl font-bold text-slate-600">{inactiveContractors}</p>
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
              placeholder="Search by name, CNIC, or contact..."
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
            value={expertiseFilter}
            onChange={(e) => setExpertiseFilter(e.target.value)}
            placeholder="Filter by expertise"
          >
            <MenuItem value="all">All Expertise Areas</MenuItem>
            {expertiseAreas.map(area => (
              <MenuItem key={area} value={area}>{area}</MenuItem>
            ))}
          </TextField>
        </motion.div>

        {/* Contractors Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loading && filteredContractors.length === 0 ? (
            <Card className="border-2 border-violet-200">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading contractors...</p>
              </CardContent>
            </Card>
          ) : filteredContractors.length === 0 ? (
            <Card className="border-2 border-violet-200">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No contractors found</p>
                <Button onClick={openAddModal} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Contractor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContractors.map((contractor, index) => (
                <motion.div
                  key={contractor.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className={`border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${
                    contractor.status === 'active' 
                      ? 'border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50' 
                      : 'border-slate-200 bg-slate-50'
                  }`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 line-clamp-1">{contractor.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-violet-600 font-medium">
                              <Briefcase className="w-3 h-3" />
                              {contractor.expertise}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contractor.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {contractor.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4 text-sm">
                        {contractor.cnic && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                            <span className="font-mono text-xs">{contractor.cnic}</span>
                          </div>
                        )}
                        {contractor.contact_number && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>{contractor.contact_number}</span>
                          </div>
                        )}
                        {contractor.email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="line-clamp-1">{contractor.email}</span>
                          </div>
                        )}
                        {contractor.address && (
                          <div className="flex items-start gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <span className="line-clamp-2">{contractor.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-slate-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(contractor)}
                          className="flex-1 text-violet-600 hover:text-violet-700"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(contractor.id)}
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
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSubmit}>
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-200 px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-violet-600" />
                    {editingContractor ? 'Edit Contractor' : 'Add New Contractor'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <TextField
                        fullWidth
                        label="Full Name"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter contractor name"
                        required
                      />
                    </div>

                    <div>
                      <TextField
                        fullWidth
                        label="CNIC"
                        id="cnic"
                        name="cnic"
                        value={formData.cnic}
                        onChange={handleInputChange}
                        placeholder="XXXXX-XXXXXXX-X"
                        required
                      />
                    </div>

                    <div>
                      <TextField
                        select
                        fullWidth
                        label="Expertise Area"
                        id="expertise"
                        name="expertise"
                        value={formData.expertise}
                        onChange={handleInputChange}
                      >
                        {expertiseAreas.map(area => (
                          <MenuItem key={area} value={area}>{area}</MenuItem>
                        ))}
                      </TextField>
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

                    <div>
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
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingContractor ? 'Update' : 'Create'} Contractor
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

export default ContractorsManagement;
