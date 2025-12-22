import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';

const AdvertisementRecords = () => {
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

  const fetchAdvertisements = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${Config.apiUrl}/advertisements?page=${page}`, {
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
        setAdvertisements(result.data.data);
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
      const response = await fetch(`${Config.apiUrl}/advertisement/${id}`, {
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
        setSelectedAd(result.data);
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
    try {
      return JSON.parse(termsString);
    } catch {
      return [];
    }
  };

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
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            Advertisement Records
          </h1>
          <p className="text-slate-500 mt-2">
            Manage and view all advertisement records ({pagination.total} total)
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by advertisement number or note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advertisements Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAdvertisements.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Advertisements Found</h3>
            <p className="text-slate-500">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdvertisements.map((ad, index) => (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-amber-600 transition-colors">
                          {ad.adv_number}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(ad.adv_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>Closes: {new Date(ad.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      new Date(ad.closing_date) > new Date() 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {new Date(ad.closing_date) > new Date() ? 'Active' : 'Closed'}
                    </div>
                  </div>

                  {ad.note && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 font-medium">Note:</p>
                      <p className="text-sm text-slate-800 mt-1">{ad.note}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => viewAdvertisement(ad.id)}
                    variant="outline"
                    className="w-full gap-2 group-hover:bg-amber-50 group-hover:border-amber-300"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
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
                  onClick={() => fetchAdvertisements(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(pagination.last_page)].map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={pagination.current_page === i + 1 ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => fetchAdvertisements(i + 1)}
                      className="w-10 h-10"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAdvertisements(pagination.current_page + 1)}
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

      {/* Details Modal */}
      {showDetails && selectedAd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetails(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-br from-amber-500 to-orange-600 p-6 border-b z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-8 h-8 text-white" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedAd.adv_number}</h2>
                    <p className="text-amber-100 text-sm">Advertisement Details</p>
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

              {selectedAd.note && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-semibold text-amber-900 mb-2">Note</p>
                  <p className="text-slate-700">{selectedAd.note}</p>
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
                        <span className="text-amber-600 font-bold mt-1">•</span>
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
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdvertisementRecords;
