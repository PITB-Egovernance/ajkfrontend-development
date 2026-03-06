import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from 'Components/ui/Card';
import Button from 'Components/ui/Button';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

const AdvertisementRecords = () => {
  const location = useLocation();
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
      
      if (response.ok && result.success) {
        let ads = result.data.data;
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
          current_page: result.data.current_page,
          last_page: result.data.last_page,
          total: result.data.total,
          per_page: result.data.per_page,
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
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <button
          onClick={() => viewAdvertisement(params.row.id)}
          className="px-3 py-1.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-medium text-slate-500 mb-1">Advertisement Date</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(selectedAd.adv_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-medium text-slate-500 mb-1">Closing Date</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(selectedAd.closing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

                  {(selectedAd.note || selectedAd.notes || selectedAd.ad_note) && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm font-semibold text-emerald-900 mb-2">Note</p>
                      <p className="text-slate-700">{selectedAd.note || selectedAd.notes || selectedAd.ad_note}</p>
                </div>
              )}

              {selectedAd.important_notes && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Important Notes</p>
                  <p className="text-slate-700">{selectedAd.important_notes}</p>
                </div>
              )}

              {selectedAd.terms_conditions && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Terms & Conditions</p>
                  <ul className="space-y-2">
                    {parseTermsConditions(selectedAd.terms_conditions).map((term, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-emerald-600 font-bold mt-1">•</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAd.job_details && selectedAd.job_details.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Job Details ({selectedAd.job_details.length})</p>
                  <p className="text-slate-600 text-sm">Associated job postings available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdvertisementRecords;
