import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextField, MenuItem } from '@mui/material';
import { Card, CardHeader, CardTitle, CardContent } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import { 
  Map, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Hash,
  MapPin,
  Navigation
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const TehsilsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tehsils, setTehsils] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTehsil, setEditingTehsil] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    district_id: '',
    status: 'active'
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    fetchTehsils();
    fetchDistricts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTehsils = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/tehsils`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setTehsils(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching tehsils:', error);
      toast.error('Failed to load tehsils');
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/districts`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setDistricts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
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
    setEditingTehsil(null);
    setFormData({
      name: '',
      code: '',
      district_id: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (tehsil) => {
    setEditingTehsil(tehsil);
    setFormData({
      name: tehsil.name || '',
      code: tehsil.code || '',
      district_id: tehsil.district_id || '',
      status: tehsil.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Tehsil name is required');
      return;
    }

    if (!formData.district_id) {
      toast.error('District is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingTehsil 
        ? `${API_BASE}/settings/tehsils/${editingTehsil.id}/update`
        : `${API_BASE}/settings/tehsils/create`;

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
        toast.success(editingTehsil ? 'Tehsil updated successfully' : 'Tehsil created successfully');
        setShowModal(false);
        fetchTehsils();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving tehsil:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tehsilId) => {
    if (!window.confirm('Are you sure you want to delete this tehsil?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/tehsils/${tehsilId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('Tehsil deleted successfully');
        fetchTehsils();
      } else {
        toast.error(result.message || 'Failed to delete tehsil');
      }
    } catch (error) {
      console.error('Error deleting tehsil:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const getDistrictName = (districtId) => {
    const district = districts.find(d => d.id === districtId);
    return district ? district.name : 'Unknown';
  };

  const filteredTehsils = tehsils.filter(tehsil => {
    const matchesSearch = tehsil.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tehsil.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = !filterDistrict || tehsil.district_id === parseInt(filterDistrict);
    return matchesSearch && matchesDistrict;
  });

  const activeTehsils = filteredTehsils.filter(t => t.status === 'active').length;
  const inactiveTehsils = filteredTehsils.filter(t => t.status !== 'active').length;

  // Group tehsils by district
  const tehsilsByDistrict = filteredTehsils.reduce((acc, tehsil) => {
    const districtId = tehsil.district_id;
    if (!acc[districtId]) {
      acc[districtId] = [];
    }
    acc[districtId].push(tehsil);
    return acc;
  }, {});

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
              <h1 className="text-2xl font-bold text-slate-900">Tehsils Management</h1>
              <p className="text-sm text-slate-500 mt-1">Manage tehsil data and district associations</p>
            </div>
            <Button
              onClick={openAddModal}
              className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Tehsil
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
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Tehsils</p>
                    <p className="text-3xl font-bold text-purple-600">{filteredTehsils.length}</p>
                  </div>
                  <Navigation className="w-12 h-12 text-purple-400" />
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
                    <p className="text-sm text-slate-600 mb-1">Active Tehsils</p>
                    <p className="text-3xl font-bold text-emerald-600">{activeTehsils}</p>
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
                    <p className="text-sm text-slate-600 mb-1">Inactive Tehsils</p>
                    <p className="text-3xl font-bold text-slate-600">{inactiveTehsils}</p>
                  </div>
                  <XCircle className="w-12 h-12 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <Card className="border-2 border-purple-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                  <TextField
                    fullWidth
                    type="text"
                    placeholder="Search tehsils by name or code..."
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
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  placeholder="Filter by district"
                >
                  <MenuItem value="">All Districts</MenuItem>
                  {districts.filter(d => d.status === 'active').map(district => (
                    <MenuItem key={district.id} value={district.id}>{district.name}</MenuItem>
                  ))}
                </TextField>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tehsils List Grouped by District */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {loading && filteredTehsils.length === 0 ? (
            <Card className="border-2 border-purple-200">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading tehsils...</p>
              </CardContent>
            </Card>
          ) : filteredTehsils.length === 0 ? (
            <Card className="border-2 border-purple-200">
              <CardContent className="p-12 text-center">
                <Map className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No tehsils found</p>
                <Button onClick={openAddModal} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Tehsil
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.entries(tehsilsByDistrict).map(([districtId, districtTehsils], groupIndex) => (
              <Card key={districtId} className="border-2 border-purple-200 bg-white">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    {getDistrictName(parseInt(districtId))} - {districtTehsils.length} Tehsil(s)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-slate-50">
                    {districtTehsils.map((tehsil, index) => (
                      <motion.div
                        key={tehsil.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                      >
                        <Card className={`border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${
                          tehsil.status === 'active' 
                            ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50' 
                            : 'border-slate-200 bg-slate-50'
                        }`}>
                          <CardContent className="p-4">
                            <div className="mb-3">
                              <h3 className="text-base font-bold text-slate-900 mb-2">
                                {tehsil.name}
                              </h3>
                              {tehsil.code && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                  <Hash className="w-3 h-3 text-purple-500" />
                                  <span className="text-xs">{tehsil.code}</span>
                                </div>
                              )}
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                tehsil.status === 'active' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {tehsil.status === 'active' ? (
                                  <><CheckCircle2 className="w-3 h-3 mr-1" />Active</>
                                ) : (
                                  <><XCircle className="w-3 h-3 mr-1" />Inactive</>
                                )}
                              </span>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(tehsil)}
                                className="flex-1 text-blue-600 hover:text-blue-700 text-xs"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(tehsil.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
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
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
            >
              <form onSubmit={handleSubmit}>
                <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-6 py-4 flex items-center justify-between rounded-t-xl">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Map className="w-6 h-6 text-white" />
                    {editingTehsil ? 'Edit Tehsil' : 'Add New Tehsil'}
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
                  <div>
                    <TextField
                      fullWidth
                      label="Tehsil Name"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Muzaffarabad City, Kotli"
                      required
                    />
                  </div>

                  <div>
                    <TextField
                      fullWidth
                      label="Tehsil Code (Optional)"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="e.g., MZD-01"
                    />
                  </div>

                  <div>
                    <TextField
                      select
                      fullWidth
                      label="District"
                      id="district_id"
                      name="district_id"
                      value={formData.district_id}
                      onChange={handleInputChange}
                      required
                    >
                      <MenuItem value="">Select District</MenuItem>
                      {districts.filter(d => d.status === 'active').map(district => (
                        <MenuItem key={district.id} value={district.id}>{district.name}</MenuItem>
                      ))}
                    </TextField>
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

                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
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
                        {editingTehsil ? 'Update' : 'Create'} Tehsil
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

export default TehsilsManagement;
