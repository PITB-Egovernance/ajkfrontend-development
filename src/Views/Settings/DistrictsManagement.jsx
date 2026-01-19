import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextField, MenuItem } from '@mui/material';
import { Card, CardContent } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import { 
  MapPin, 
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
  MapPinned
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const DistrictsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'active'
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    fetchDistricts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDistricts = async () => {
    setLoading(true);
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
      toast.error('Failed to load districts');
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
    setEditingDistrict(null);
    setFormData({
      name: '',
      code: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (district) => {
    setEditingDistrict(district);
    setFormData({
      name: district.name || '',
      code: district.code || '',
      status: district.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('District name is required');
      return;
    }

    if (!formData.code?.trim()) {
      toast.error('District code is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingDistrict 
        ? `${API_BASE}/settings/districts/${editingDistrict.id}/update`
        : `${API_BASE}/settings/districts/create`;

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
        toast.success(editingDistrict ? 'District updated successfully' : 'District created successfully');
        setShowModal(false);
        fetchDistricts();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving district:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (districtId) => {
    if (!window.confirm('Are you sure you want to delete this district? This will also affect related tehsils.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/districts/${districtId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('District deleted successfully');
        fetchDistricts();
      } else {
        toast.error(result.message || 'Failed to delete district');
      }
    } catch (error) {
      console.error('Error deleting district:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const filteredDistricts = districts.filter(district =>
    district.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    district.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeDistricts = filteredDistricts.filter(d => d.status === 'active').length;
  const inactiveDistricts = filteredDistricts.filter(d => d.status !== 'active').length;

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
              <h1 className="text-2xl font-bold text-slate-900">Districts Management</h1>
              <p className="text-sm text-slate-500 mt-1">Manage geographic district data</p>
            </div>
            <Button
              onClick={openAddModal}
              className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add District
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
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Districts</p>
                    <p className="text-3xl font-bold text-blue-600">{filteredDistricts.length}</p>
                  </div>
                  <MapPinned className="w-12 h-12 text-blue-400" />
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
                    <p className="text-sm text-slate-600 mb-1">Active Districts</p>
                    <p className="text-3xl font-bold text-emerald-600">{activeDistricts}</p>
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
                    <p className="text-sm text-slate-600 mb-1">Inactive Districts</p>
                    <p className="text-3xl font-bold text-slate-600">{inactiveDistricts}</p>
                  </div>
                  <XCircle className="w-12 h-12 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
            <TextField
              fullWidth
              type="text"
              placeholder="Search districts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                style: { paddingLeft: '2.5rem' }
              }}
            />
          </div>
        </motion.div>

        {/* Districts Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loading && filteredDistricts.length === 0 ? (
            <Card className="border-2 border-amber-200">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading districts...</p>
              </CardContent>
            </Card>
          ) : filteredDistricts.length === 0 ? (
            <Card className="border-2 border-amber-200">
              <CardContent className="p-12 text-center">
                <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No districts found</p>
                <Button onClick={openAddModal} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First District
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-slate-50 rounded-lg">
              {filteredDistricts.map((district, index) => (
                <motion.div
                  key={district.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${
                    district.status === 'active' 
                      ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50' 
                      : 'border-slate-200 bg-slate-50'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {district.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <Hash className="w-4 h-4 text-amber-500" />
                            <span>Code: <strong>{district.code}</strong></span>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            district.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {district.status === 'active' ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" />Active</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" />Inactive</>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(district)}
                          className="flex-1 text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(district.id)}
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
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
            >
              <form onSubmit={handleSubmit}>
                <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-6 py-4 flex items-center justify-between rounded-t-xl">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-white" />
                    {editingDistrict ? 'Edit District' : 'Add New District'}
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
                      label="District Name"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Muzaffarabad, Kotli"
                      required
                    />
                  </div>

                  <div>
                    <TextField
                      fullWidth
                      label="District Code"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="e.g., MZD, KTL"
                      required
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
                        {editingDistrict ? 'Update' : 'Create'} District
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

export default DistrictsManagement;
