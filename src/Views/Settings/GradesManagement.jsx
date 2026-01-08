import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextField, MenuItem } from '@mui/material';
import { Card, CardContent } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import { 
  Award, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const GradesManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'active'
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    fetchGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
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
      toast.error('Failed to load grades');
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
    setEditingGrade(null);
    setFormData({
      name: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (grade) => {
    setEditingGrade(grade);
    setFormData({
      name: grade.name || '',
      status: grade.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Grade name is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingGrade 
        ? `${API_BASE}/settings/grades/${editingGrade.id}/update`
        : `${API_BASE}/settings/grades/create`;

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
        toast.success(editingGrade ? 'Grade updated successfully' : 'Grade created successfully');
        setShowModal(false);
        fetchGrades();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gradeId) => {
    if (!window.confirm('Are you sure you want to delete this grade?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/grades/${gradeId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('Grade deleted successfully');
        fetchGrades();
      } else {
        toast.error(result.message || 'Failed to delete grade');
      }
    } catch (error) {
      console.error('Error deleting grade:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const filteredGrades = grades.filter(grade =>
    grade.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeGrades = filteredGrades.filter(g => g.status === 'active').length;
  const inactiveGrades = filteredGrades.filter(g => g.status !== 'active').length;

  return (
    <div className="min-h-screen  p-6">
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
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Grades Management</h1>
                <p className="text-slate-600 mt-1">Manage BPS grades and pay scales</p>
              </div>
            </div>
            <Button
              onClick={openAddModal}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Grade
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
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Grades</p>
                    <p className="text-3xl font-bold text-cyan-600">{filteredGrades.length}</p>
                  </div>
                  <Award className="w-12 h-12 text-cyan-400" />
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
                    <p className="text-sm text-slate-600 mb-1">Active Grades</p>
                    <p className="text-3xl font-bold text-emerald-600">{activeGrades}</p>
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
                    <p className="text-sm text-slate-600 mb-1">Inactive Grades</p>
                    <p className="text-3xl font-bold text-slate-600">{inactiveGrades}</p>
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
              placeholder="Search grades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                style: { paddingLeft: '2.5rem' }
              }}
            />
          </div>
        </motion.div>

        {/* Grades Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loading && filteredGrades.length === 0 ? (
            <Card className="border-2 border-cyan-200">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading grades...</p>
              </CardContent>
            </Card>
          ) : filteredGrades.length === 0 ? (
            <Card className="border-2 border-cyan-200">
              <CardContent className="p-12 text-center">
                <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No grades found</p>
                <Button onClick={openAddModal} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Grade
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredGrades.map((grade, index) => (
                <motion.div
                  key={grade.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className={`border-2 transition-all hover:shadow-lg hover:-translate-y-1 ${
                    grade.status === 'active' 
                      ? 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50' 
                      : 'border-slate-200 bg-slate-50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="text-center mb-3">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-xl mb-2 shadow-lg">
                          {grade.name}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          BPS-{grade.name}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                          grade.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {grade.status === 'active' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" />Active</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" />Inactive</>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(grade)}
                          className="flex-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(grade.id)}
                          className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
                        >
                          <Trash2 className="w-3 h-3" />
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
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-6 h-6 text-cyan-600" />
                    {editingGrade ? 'Edit Grade' : 'Add New Grade'}
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
                  <div>
                    <TextField
                      fullWidth
                      label="Grade Name / Number"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., 17 or BPS-17"
                      required
                      helperText="Enter numeric (e.g., 17) or full format (e.g., BPS-17)"
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
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingGrade ? 'Update' : 'Create'} Grade
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

export default GradesManagement;
