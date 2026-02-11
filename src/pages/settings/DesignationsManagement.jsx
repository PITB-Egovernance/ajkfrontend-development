import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextField, MenuItem } from '@mui/material';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { 
  Briefcase, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Tag,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const DesignationsManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [designations, setDesignations] = useState([]);
  const [grades, setGrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    grade_id: '',
    status: 'active'
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const designationTypes = [
    'Officer',
    'Staff',
    'Internal',
    'External',
    'Administrative',
    'Technical'
  ];

  useEffect(() => {
    fetchDesignations();
    fetchGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDesignations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/designations`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setDesignations(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      toast.error('Failed to load designations');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/grades`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setGrades(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
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
    setEditingDesignation(null);
    setFormData({
      name: '',
      type: '',
      grade_id: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (designation) => {
    setEditingDesignation(designation);
    setFormData({
      name: designation.name || '',
      type: designation.type || '',
      grade_id: designation.grade_id || '',
      status: designation.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Designation name is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingDesignation 
        ? `${API_BASE}/settings/designations/${editingDesignation.id}/update`
        : `${API_BASE}/settings/designations/create`;

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
        toast.success(editingDesignation ? 'Designation updated successfully' : 'Designation created successfully');
        setShowModal(false);
        fetchDesignations();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving designation:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (designationId) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/designations/${designationId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('Designation deleted successfully');
        fetchDesignations();
      } else {
        toast.error(result.message || 'Failed to delete designation');
      }
    } catch (error) {
      console.error('Error deleting designation:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const getGradeName = (gradeId) => {
    const grade = grades.find(g => g.id === gradeId);
    return grade ? grade.name : 'Not Assigned';
  };

  const filteredDesignations = designations.filter(designation => {
    const matchesSearch = designation.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         designation.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || designation.type === filterType;
    return matchesSearch && matchesType;
  });

  const activeDesignations = filteredDesignations.filter(d => d.status === 'active').length;
  const inactiveDesignations = filteredDesignations.filter(d => d.status !== 'active').length;

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
              <h1 className="text-2xl font-bold text-slate-900">Designations Management</h1>
              <p className="text-sm text-slate-500 mt-1">Manage designation titles and classifications</p>
            </div>
            <Button
              onClick={openAddModal}
              className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Designation
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
            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Designations</p>
                    <p className="text-3xl font-bold text-indigo-600">{filteredDesignations.length}</p>
                  </div>
                  <Briefcase className="w-12 h-12 text-indigo-400" />
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
                    <p className="text-sm text-slate-600 mb-1">Active Designations</p>
                    <p className="text-3xl font-bold text-emerald-600">{activeDesignations}</p>
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
                    <p className="text-sm text-slate-600 mb-1">Inactive Designations</p>
                    <p className="text-3xl font-bold text-slate-600">{inactiveDesignations}</p>
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
          <Card className="border-2 border-indigo-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                  <TextField
                    fullWidth
                    type="text"
                    placeholder="Search designations by name or type..."
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
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  placeholder="Filter by type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  {designationTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </TextField>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Designations Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loading && filteredDesignations.length === 0 ? (
            <Card className="border-2 border-indigo-200">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading designations...</p>
              </CardContent>
            </Card>
          ) : filteredDesignations.length === 0 ? (
            <Card className="border-2 border-indigo-200">
              <CardContent className="p-12 text-center">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No designations found</p>
                <Button onClick={openAddModal} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Designation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-slate-50 rounded-lg">
              {filteredDesignations.map((designation, index) => (
                <motion.div
                  key={designation.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${
                    designation.status === 'active' 
                      ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50' 
                      : 'border-slate-200 bg-slate-50'
                  }`}>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                          {designation.name}
                        </h3>
                        
                        <div className="space-y-2">
                          {designation.type && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Tag className="w-4 h-4 text-indigo-500" />
                              <span>Type: <strong>{designation.type}</strong></span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Award className="w-4 h-4 text-blue-500" />
                            <span>Grade: <strong>{getGradeName(designation.grade_id)}</strong></span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-3 ${
                          designation.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {designation.status === 'active' ? (
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
                          onClick={() => openEditModal(designation)}
                          className="flex-1 text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(designation.id)}
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
                    <Briefcase className="w-6 h-6 text-white" />
                    {editingDesignation ? 'Edit Designation' : 'Add New Designation'}
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
                      label="Designation Name"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Assistant Director, Stenographer"
                      required
                    />
                  </div>

                  <div>
                    <TextField
                      select
                      fullWidth
                      label="Type"
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <MenuItem value="">Select Type</MenuItem>
                      {designationTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </TextField>
                  </div>

                  <div>
                    <TextField
                      select
                      fullWidth
                      label="Grade (BPS)"
                      id="grade_id"
                      name="grade_id"
                      value={formData.grade_id}
                      onChange={handleInputChange}
                    >
                      <MenuItem value="">Not Assigned</MenuItem>
                      {grades.filter(g => g.status === 'active').map(grade => (
                        <MenuItem key={grade.id} value={grade.id}>{grade.name}</MenuItem>
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
                        {editingDesignation ? 'Update' : 'Create'} Designation
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

export default DesignationsManagement;
