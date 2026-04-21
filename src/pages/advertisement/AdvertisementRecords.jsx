import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DataGrid } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import { 
  Megaphone, 
  Eye, 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Clock,
  Filter,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';
import { Menu, MenuItem, IconButton } from '@mui/material';

const ActionCell = ({ ad, onView, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event) => {
    if (event) event.stopPropagation();
    setAnchorEl(null);
  };

  return (
    <div className="flex justify-center items-center h-full w-full">
      <IconButton 
        onClick={handleClick}
        size="small"
        sx={{ color: '#334155' }}
      >
        <MoreVertical className="w-5 h-5" />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 1.5,
            minWidth: 120,
            '& .MuiMenuItem-root': {
              fontSize: '14px',
              color: '#334155',
              display: 'flex',
              gap: '8px',
              padding: '10px 16px',
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={(e) => { handleClose(e); onView(ad.id); }}>
          <Eye className="w-4 h-4" /> View
        </MenuItem>
        <MenuItem onClick={(e) => { handleClose(e); onEdit(ad.id); }}>
          <Pencil className="w-4 h-4" /> Edit
        </MenuItem>
        <MenuItem 
          onClick={(e) => { handleClose(e); onDelete(ad.id); }}
          sx={{ color: '#ef4444 !important' }}
        >
          <Trash2 className="w-4 h-4" /> Delete
        </MenuItem>
      </Menu>
    </div>
  );
};

const AdvertisementRecords = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [advertisements, setAdvertisements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAd, setSelectedAd] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchAdvertisements(1);
  }, []);

  useEffect(() => {
    if (location.state?.created) {
      toast.success(`Advertisement ${location.state.created} created successfully`);
      try {
        if (location.state?.note) {
          const notesRaw = localStorage.getItem('advertisement_notes_cache');
          const notesCache = notesRaw ? JSON.parse(notesRaw) : {};
          notesCache[location.state.created] = location.state.note;
          localStorage.setItem('advertisement_notes_cache', JSON.stringify(notesCache));
          setAdvertisements(prev => prev.map(ad => 
            ad.adv_number === location.state.created 
              ? { ...ad, note: ad.note || location.state.note }
              : ad
          ));
        }
      } catch {}
    }
  }, [location.state]);

  const fetchAdvertisements = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${Config.apiUrl}/advertisements`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'X-API-KEY': Config.apiKey,
        },
      });

      const result = await response.json();
      
      const isSuccess = result?.success !== false;
      const apiData = result?.data;
      const adsList = Array.isArray(apiData?.data)
        ? apiData.data
        : Array.isArray(apiData)
          ? apiData
          : [];

      if (response.ok && isSuccess) {
        let ads = adsList;
        try {
          const notesRaw = localStorage.getItem('advertisement_notes_cache');
          const notesCache = notesRaw ? JSON.parse(notesRaw) : {};
          ads = ads.map(ad => {
            const key = (ad.adv_number || '').trim();
            const cachedNote = key ? notesCache[key] : undefined;
            return {
              ...ad,
              note: ad.note || cachedNote || ad.notes || ad.ad_note || ad.note
            };
          });
        } catch {}
        setAdvertisements(ads);
        setPagination({
          current_page: apiData?.current_page || 1,
          last_page: apiData?.last_page || 1,
          total: apiData?.total || ads.length,
          per_page: apiData?.per_page || 10,
        });
      } else {
        toast.error(result.message || 'Failed to fetch advertisements');
      }
    } catch (error) {
      toast.error('Error loading advertisements');
    } finally {
      setLoading(false);
    }
  };

  const viewAdvertisement = async (id) => {
    const loadingToast = toast.loading('Loading details...');
    try {
      const response = await fetch(`${Config.apiUrl}/advertisements/${id}`, {
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
        let data = result.data;
        try {
          const notesRaw = localStorage.getItem('advertisement_notes_cache');
          const notesCache = notesRaw ? JSON.parse(notesRaw) : {};
          if (!data.note && notesCache[data.adv_number]) {
            data = { ...data, note: notesCache[data.adv_number] };
          }
        } catch {}
        setSelectedAd(data);
        setShowDetails(true);
        toast.success('Details loaded', { id: loadingToast });
      } else {
        toast.error(result.message || 'Failed to load details', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error loading details', { id: loadingToast });
    }
  };

  const editAdvertisement = (id) => {
    navigate(`/dashboard/advertisements/edit/${id}`);
  };

  const deleteAdvertisement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advertisement? This action cannot be undone.')) {
      return;
    }

    const loadingToast = toast.loading('Deleting advertisement...');
    try {
      const response = await fetch(`${Config.apiUrl}/advertisements/${id}`, {
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
        toast.success(result.message || 'Advertisement deleted successfully', { id: loadingToast });
        fetchAdvertisements(pagination.current_page);
      } else {
        toast.error(result.message || 'Failed to delete advertisement', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error deleting advertisement', { id: loadingToast });
    }
  };

  const filteredAdvertisements = advertisements.filter(ad =>
    ad.adv_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ad.note?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parseTermsConditions = (termsString) => {
    if (Array.isArray(termsString)) return termsString;
    try {
      return JSON.parse(termsString);
    } catch {
      return [];
    }
  };

  const columns = [
    { field: 'adv_number', headerName: 'Adv #', flex: 1, minWidth: 180 },
    {
      field: 'adv_date',
      headerName: 'Adv Date',
      width: 140,
      valueGetter: (params) => new Date(params.value),
      valueFormatter: (params) =>
        params.value instanceof Date
          ? params.value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : params.value
    },
    {
      field: 'closing_date',
      headerName: 'Closing Date',
      width: 140,
      valueGetter: (params) => new Date(params.value),
      valueFormatter: (params) =>
        params.value instanceof Date
          ? params.value.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : params.value
    },
    { field: 'note', headerName: 'Note', flex: 1, minWidth: 200 },
    { 
      field: 'advertisement_fee', 
      headerName: 'Fee (Rs.)', 
      width: 120,
      valueFormatter: (params) => params.value ? `Rs. ${params.value}` : 'N/A'
    },
    { field: 'important_notes', headerName: 'Important Notes', flex: 1.5, minWidth: 260 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      valueGetter: (params) => (new Date(params.row.closing_date) > new Date() ? 'Active' : 'Closed')
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <ActionCell 
          ad={params.row} 
          onView={viewAdvertisement} 
          onEdit={editAdvertisement} 
          onDelete={deleteAdvertisement}
        />
      )
    }
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Advertisement Records</h1>
            <p className="text-sm text-slate-500 mt-1">View and manage all advertisement records</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by advertisement number or note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Advertisements Table */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          {loading ? (
            <div className="text-slate-500">Loading...</div>
          ) : filteredAdvertisements.length === 0 ? (
            <div className="text-center text-slate-600 py-8">No Advertisements Found</div>
          ) : (
            <DataGrid
              rows={filteredAdvertisements.map((ad, i) => ({
                id: ad.hash_id || ad.id || `ad-${i}`,
                adv_number: ad.adv_number,
                adv_date: ad.adv_date,
                closing_date: ad.closing_date,
                advertisement_fee: ad.advertisement_fee,
                note: ad.note || ad.notes || ad.ad_note,
                important_notes: ad.important_notes
              }))}
              columns={columns}
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-row': { minHeight: '52px !important' }
              }}
            />
          )}
        </div>

        {/* Pagination */}
        {!loading && pagination.last_page > 1 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {(pagination.current_page - 1) * pagination.per_page + 1} to{' '}
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAdvertisements(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(pagination.last_page, 5))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchAdvertisements(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          pagination.current_page === pageNum
                            ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => fetchAdvertisements(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Details Modal */}
      {showDetails && selectedAd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetails(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 p-6 border-b z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-8 h-8 text-white" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedAd.adv_number}</h2>
                    <p className="text-emerald-100 text-sm">Advertisement Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Core Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-4 transition-all hover:bg-emerald-50">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900/50 uppercase tracking-wider mb-0.5">Advertisement Date</p>
                    <p className="text-lg font-bold text-slate-900">
                      {new Date(selectedAd.adv_date).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-center gap-4 transition-all hover:bg-red-50">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Clock className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-900/50 uppercase tracking-wider mb-0.5">Closing Date</p>
                    <p className="text-lg font-bold text-slate-900">
                      {new Date(selectedAd.closing_date).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Advertisement Note (Specific) */}
              {selectedAd.note && (
                <div className="p-5 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-800">Advertisement Note</h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-sm">{selectedAd.note}</p>
                </div>
              )}

              {/* Job Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Megaphone className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-900 text-center">Requisition Specific Details</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {selectedAd.job_details?.map((job, idx) => (
                    <div key={idx} className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-emerald-300 transition-all shadow-sm hover:shadow-md">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold shrink-0">
                               {idx + 1}
                            </div>
                            <div>
                               <h4 className="font-bold text-slate-900 text-lg">
                                 {job.designation || job.title || 'Requisition Details'}
                               </h4>
                               <p className="text-xs font-medium text-slate-400 font-bold">
                                 Ref: {job.hash_id || job.id}
                               </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                               <span className="text-emerald-600 font-bold">Rs.</span>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Application Fee</p>
                              <p className="font-bold text-slate-900">
                                {job.pivot?.fee ? `Rs. ${job.pivot.fee}` : 'No fee'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                               <FileText className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Test Type</p>
                              <p className="font-bold text-slate-900 capitalize">
                                {job.pivot?.test_type || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Notes & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Important Notes */}
                {selectedAd.important_notes && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 underline px-1">
                      Important Notes
                    </h3>
                    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm text-slate-600 leading-relaxed italic">
                      {selectedAd.important_notes}
                    </div>
                  </div>
                )}

                {/* Terms & Conditions */}
                {selectedAd.terms_conditions && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 underline px-1">
                      Terms & Conditions
                    </h3>
                    <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <ul className="space-y-3">
                        {parseTermsConditions(selectedAd.terms_conditions).map((term, index) => (
                          <li key={index} className="flex items-start gap-3 text-sm text-slate-600 group">
                            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors group-hover:bg-emerald-600">
                              <span className="text-[10px] text-emerald-700 font-bold group-hover:text-white">{index + 1}</span>
                            </div>
                            <span className="leading-normal">{term}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdvertisementRecords;
