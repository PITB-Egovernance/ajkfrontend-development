import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  BookOpen, 
  Eye, 
  Edit, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  MapPin,
  User,
  X,
  Save,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const AnnexAList = () => {
  const navigate = useNavigate();
  const [annexAList, setAnnexAList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnnex, setSelectedAnnex] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchAnnexAList(1);
  }, []);

  const fetchAnnexAList = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${Config.apiUrl}/annex/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setAnnexAList(result.data.data);
        setPagination({
          current_page: result.data.current_page,
          last_page: result.data.last_page,
          total: result.data.total,
          per_page: result.data.per_page,
        });
      } else {
        toast.error(result.message || 'Failed to fetch Annex A records');
      }
    } catch (error) {
      toast.error('Error loading Annex A records');
    } finally {
      setLoading(false);
    }
  };

  const viewAnnexDetails = (id) => {
    navigate(`/dashboard/annex-a/${id}`);
  };

  const openEditModal = async (id) => {
    const loadingToast = toast.loading('Loading edit form...');
    try {
      const response = await fetch(`${Config.apiUrl}/annex/edit/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setEditFormData(result.data);
        setShowEditModal(true);
        toast.success('Edit Form Loaded', { id: loadingToast });
      } else {
        toast.error(result.message || 'Failed to load form', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error loading form', { id: loadingToast });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Updating Annex A...');
    
    try {
      const response = await fetch(`${Config.apiUrl}/annex/${editFormData.hash_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
        body: JSON.stringify({
          name_with_father: editFormData.name_with_father,
          district_of_domicile: editFormData.district_of_domicile,
          creation_of_post: editFormData.creation_of_post,
          vacant_due_to_retirement: editFormData.vacant_due_to_retirement ? 1 : 0,
          vacant_due_to_promotion: editFormData.vacant_due_to_promotion ? 1 : 0,
          vacant_due_to_other: editFormData.vacant_due_to_other,
          date_initial_appointment: editFormData.date_initial_appointment,
          date_last_extension: editFormData.date_last_extension,
          other_information: editFormData.other_information,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Annex A updated successfully!', { id: loadingToast });
        setShowEditModal(false);
        fetchAnnexAList(pagination.current_page);
      } else {
        toast.error(result.message || 'Failed to update', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error updating Annex A', { id: loadingToast });
    }
  };

  const handleDelete = async () => {
    const loadingToast = toast.loading('Deleting Annex A...');
    
    try {
      const response = await fetch(`${Config.apiUrl}/annex/${selectedAnnex.hash_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Annex A deleted successfully!', { id: loadingToast });
        setShowDeleteModal(false);
        setSelectedAnnex(null);
        fetchAnnexAList(pagination.current_page);
      } else {
        toast.error(result.message || 'Failed to delete', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error deleting Annex A', { id: loadingToast });
    }
  };

  const filteredAnnexA = annexAList.filter(annex =>
    annex.name_with_father?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    annex.district_of_domicile?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            Annex "A" List
          </h1>
          <p className="text-slate-500 mt-2">
            Manage Annex A entries ({pagination.total} total)
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Annex A Table */}
      {loading ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 rounded-lg"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredAnnexA.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Records Found</h3>
            <p className="text-slate-500">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Name with Father</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">District</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Vacant Due To</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Dates</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAnnexA.map((annex, index) => (
                  <motion.tr
                    key={annex.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{annex.name_with_father}</p>
                          <p className="text-sm text-slate-500">ID: {annex.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{annex.district_of_domicile}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {annex.vacant_due_to_retirement === 1 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Retirement</span>
                        )}
                        {annex.vacant_due_to_promotion === 1 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Promotion</span>
                        )}
                        {annex.vacant_due_to_other && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">Other</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3 h-3" />
                          <span>Initial: {new Date(annex.date_initial_appointment).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3 h-3" />
                          <span>Extension: {new Date(annex.date_last_extension).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewAnnexDetails(annex.hash_id)}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(annex.hash_id)}
                          className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedAnnex(annex);
                            setShowDeleteModal(true);
                          }}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {!loading && pagination.last_page > 1 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {(pagination.current_page - 1) * pagination.per_page + 1} to{' '}
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAnnexAList(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(pagination.last_page, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.current_page === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => fetchAnnexAList(pageNum)}
                        className="w-10 h-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAnnexAList(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 p-6 border-b z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit className="w-8 h-8 text-white" />
                    <div>
                      <h2 className="text-2xl font-bold text-white">Edit Annex A</h2>
                      <p className="text-blue-100 text-sm">Update record information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Name with Father *</label>
                    <input
                      type="text"
                      value={editFormData.name_with_father || ''}
                      onChange={(e) => setEditFormData({...editFormData, name_with_father: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">District of Domicile *</label>
                    <input
                      type="text"
                      value={editFormData.district_of_domicile || ''}
                      onChange={(e) => setEditFormData({...editFormData, district_of_domicile: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Creation of Post</label>
                    <input
                      type="text"
                      value={editFormData.creation_of_post || ''}
                      onChange={(e) => setEditFormData({...editFormData, creation_of_post: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Vacant Due to Other</label>
                    <input
                      type="text"
                      value={editFormData.vacant_due_to_other || ''}
                      onChange={(e) => setEditFormData({...editFormData, vacant_due_to_other: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Initial Appointment Date</label>
                    <input
                      type="date"
                      value={editFormData.date_initial_appointment || ''}
                      onChange={(e) => setEditFormData({...editFormData, date_initial_appointment: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Last Extension Date</label>
                    <input
                      type="date"
                      value={editFormData.date_last_extension || ''}
                      onChange={(e) => setEditFormData({...editFormData, date_last_extension: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editFormData.vacant_due_to_retirement === 1 || editFormData.vacant_due_to_retirement === true}
                      onChange={(e) => setEditFormData({...editFormData, vacant_due_to_retirement: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-sm text-slate-700">Vacant due to Retirement</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editFormData.vacant_due_to_promotion === 1 || editFormData.vacant_due_to_promotion === true}
                      onChange={(e) => setEditFormData({...editFormData, vacant_due_to_promotion: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-sm text-slate-700">Vacant due to Promotion</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Other Information</label>
                  <textarea
                    value={editFormData.other_information || ''}
                    onChange={(e) => setEditFormData({...editFormData, other_information: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedAnnex && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
                    <p className="text-sm text-slate-500">This action cannot be undone</p>
                  </div>
                </div>
                
                <p className="text-slate-700 mb-6">
                  Are you sure you want to delete the Annex A record for <strong>{selectedAnnex.name_with_father}</strong>?
                </p>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnnexAList;
