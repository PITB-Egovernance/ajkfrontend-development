import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextField, MenuItem } from '@mui/material';
import { Card, CardHeader, CardTitle, CardContent } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import { 
  Network, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  ArrowLeft,
  Search,
  Building,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  GitBranch
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const OrganizationalHierarchy = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
    head_id: '',
    contact_info: '',
    status: 'active'
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    fetchBranches();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/branches`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      if (result.status === 200) {
        setBranches(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
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
    setEditingBranch(null);
    setFormData({
      name: '',
      parent_id: '',
      head_id: '',
      contact_info: '',
      status: 'active'
    });
    setShowModal(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      parent_id: branch.parent_id || '',
      head_id: branch.head_id || '',
      contact_info: branch.contact_info || '',
      status: branch.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Branch name is required');
      return;
    }

    setLoading(true);
    try {
      const url = editingBranch 
        ? `${API_BASE}/settings/branches/${editingBranch.id}/update`
        : `${API_BASE}/settings/branches/create`;

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
        toast.success(editingBranch ? 'Branch updated successfully' : 'Branch created successfully');
        setShowModal(false);
        fetchBranches();
      } else {
        toast.error(result.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving branch:', error);
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/settings/branches/${branchId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('Branch deleted successfully');
        fetchBranches();
      } else {
        toast.error(result.message || 'Failed to delete branch');
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const filteredBranches = branches.filter(branch =>
    branch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.contact_info?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getParentName = (parentId) => {
    const parent = branches.find(b => b.id === parentId);
    return parent ? parent.name : 'N/A';
  };

  const getHeadName = (headId) => {
    const head = employees.find(e => e.id === headId);
    return head ? head.name : 'Not Assigned';
  };

  const activeBranches = filteredBranches.filter(b => b.status === 'active').length;
  const inactiveBranches = filteredBranches.filter(b => b.status !== 'active').length;

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
              <h1 className="text-2xl font-bold text-slate-900">Organizational Hierarchy</h1>
              <p className="text-sm text-slate-500 mt-1">Manage departments, wings, and sections</p>
            </div>
            <Button
              onClick={openAddModal}
              className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
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
                    <p className="text-sm text-slate-600 mb-1">Total Branches</p>
                    <p className="text-3xl font-bold text-blue-600">{filteredBranches.length}</p>
                  </div>
                  <GitBranch className="w-12 h-12 text-blue-400" />
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
                    <p className="text-sm text-slate-600 mb-1">Active Branches</p>
                    <p className="text-3xl font-bold text-emerald-600">{activeBranches}</p>
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
                    <p className="text-sm text-slate-600 mb-1">Inactive Branches</p>
                    <p className="text-3xl font-bold text-slate-600">{inactiveBranches}</p>
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
              placeholder="Search branches by name or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                style: { paddingLeft: '2.5rem' }
              }}
            />
          </div>
        </motion.div>

        {/* Branches List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-blue-600" />
                Branches & Departments ({filteredBranches.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading && filteredBranches.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Loading branches...</p>
                </div>
              ) : filteredBranches.length === 0 ? (
                <div className="p-12 text-center">
                  <Network className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No branches found</p>
                  <Button onClick={openAddModal} className="mt-4" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Branch
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 bg-slate-50">
                  {filteredBranches.map((branch, index) => (
                    <motion.div
                      key={branch.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {branch.name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              branch.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {branch.status === 'active' ? (
                                <><CheckCircle2 className="w-3 h-3 inline mr-1" />Active</>
                              ) : (
                                <><XCircle className="w-3 h-3 inline mr-1" />Inactive</>
                              )}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Building className="w-4 h-4 text-blue-500" />
                              <span>Parent: <strong>{getParentName(branch.parent_id)}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <User className="w-4 h-4 text-emerald-500" />
                              <span>Head: <strong>{getHeadName(branch.head_id)}</strong></span>
                            </div>
                            {branch.contact_info && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone className="w-4 h-4 text-amber-500" />
                                <span>{branch.contact_info}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(branch)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(branch.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingBranch ? 'Edit Branch' : 'Add New Branch'}
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
                      label="Branch/Wing/Section Name"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Recruitment Wing, IT Department"
                      required
                    />
                  </div>

                  <div>
                    <TextField
                      select
                      fullWidth
                      label="Parent Branch (Optional)"
                      id="parent_id"
                      name="parent_id"
                      value={formData.parent_id}
                      onChange={handleInputChange}
                    >
                      <MenuItem value="">None (Top Level)</MenuItem>
                      {branches
                        .filter(b => !editingBranch || b.id !== editingBranch.id)
                        .map(branch => (
                          <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                        ))
                      }
                    </TextField>
                  </div>

                  <div>
                    <TextField
                      select
                      fullWidth
                      label="Head of Branch"
                      id="head_id"
                      name="head_id"
                      value={formData.head_id}
                      onChange={handleInputChange}
                    >
                      <MenuItem value="">Not Assigned</MenuItem>
                      {employees.map(emp => (
                        <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                      ))}
                    </TextField>
                  </div>

                  <div>
                    <TextField
                      fullWidth
                      label="Contact Information"
                      id="contact_info"
                      name="contact_info"
                      value={formData.contact_info}
                      onChange={handleInputChange}
                      placeholder="Phone/Email/Extension"
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

                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
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
                        {editingBranch ? 'Update' : 'Create'} Branch
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

export default OrganizationalHierarchy;
