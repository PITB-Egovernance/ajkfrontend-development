import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DataGrid } from '@mui/x-data-grid';
import toast from 'react-hot-toast';
import confirmDelete from 'components/ui/ConfirmDelete';
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
  Trash2,
  X,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import AdvertisementApi from '../../api/advertisementApi';
import { Menu, MenuItem, IconButton, TextField } from '@mui/material';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import { Link } from 'react-router-dom';

const STATUS_BADGES = {
  active:              { label: 'Active',             className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  temporary_closed:    { label: 'Temporary Closed',   className: 'bg-amber-50 border-amber-200 text-amber-700' },
  permanently_closed:  { label: 'Permanently Closed', className: 'bg-red-50 border-red-200 text-red-700' },
  reopen:              { label: 'Reopen',             className: 'bg-blue-50 border-blue-200 text-blue-700' },
  extend_date:         { label: 'Extended',           className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
};

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
  const [groupByDept, setGroupByDept] = useState(false);
  const [expandedDept, setExpandedDept] = useState(null);     // null = first one auto-expanded; string id = manually expanded
  const [filters, setFilters] = useState({
    adv_number: '',
    adv_date: '',
    closing_date: '',
    status: ''
  });

  const filterConfig = [
    {
      name: 'adv_number',
      label: 'Adv #',
      type: 'text',
      placeholder: 'Filter by advertisement number'
    },
    {
      name: 'adv_date',
      label: 'Adv Date',
      type: 'date'
    },
    {
      name: 'closing_date',
      label: 'Closing Date',
      type: 'date'
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'temporary_closed', label: 'Temporary Closed' },
        { value: 'permanently_closed', label: 'Permanently Closed' },
        { value: 'reopen', label: 'Reopen' },
        { value: 'extend_date', label: 'Extended' }
      ]
    }
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      adv_number: '',
      adv_date: '',
      closing_date: '',
      status: ''
    });
  };

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
      const result = await AdvertisementApi.getAll(page);
      
      const apiData = result?.data;
      const adsList = Array.isArray(apiData?.data)
        ? apiData.data
        : Array.isArray(apiData)
          ? apiData
          : [];

      if (result.success) {
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
      toast.error(error.message || 'Error loading advertisements');
    } finally {
      setLoading(false);
    }
  };

  const viewAdvertisement = (id) => {
    navigate(`/dashboard/advertisements/view/${id}`);
  };

  const editAdvertisement = (id) => {
    navigate(`/dashboard/advertisements/edit/${id}`);
  };

  const deleteAdvertisement = async (id) => {
    if (!await confirmDelete({ title: 'Delete Advertisement', message: 'Are you sure you want to delete this advertisement?' })) {
      return;
    }

    const loadingToast = toast.loading('Deleting advertisement...');
    try {
      const result = await AdvertisementApi.delete(id);

      if (result.success) {
        toast.success(result.message || 'Advertisement deleted successfully', { id: loadingToast });
        fetchAdvertisements(pagination.current_page);
      } else {
        toast.error(result.message || 'Failed to delete advertisement', { id: loadingToast });
      }
    } catch (error) {
      toast.error(error.message || 'Error deleting advertisement', { id: loadingToast });
    }
  };

  const filteredAdvertisements = advertisements.filter(ad => {
    // Search Term
    const searchMatch = !searchTerm.trim() || 
      ad.adv_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.note?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    // Advanced Filters
    if (filters.adv_number && !ad.adv_number.toLowerCase().includes(filters.adv_number.toLowerCase())) {
      return false;
    }

    if (filters.adv_date && ad.adv_date !== filters.adv_date) {
      return false;
    }

    if (filters.closing_date && ad.closing_date !== filters.closing_date) {
      return false;
    }

    if (filters.status) {
      const adStatus = ad.status || 'active';
      if (adStatus !== filters.status) return false;
    }

    return true;
  });

  const parseTermsConditions = (termsString) => {
    if (Array.isArray(termsString)) return termsString;
    try {
      return JSON.parse(termsString);
    } catch {
      return [];
    }
  };

  const columns = [
    { 
      field: 'adv_number', 
      headerName: 'Adv #', 
      flex: 1, 
      minWidth: 180,
      renderCell: (params) => (
        <Link 
          to={`/dashboard/advertisements/view/${params.row.hash_id || params.row.id}`}
          className="text-emerald-700 font-bold hover:text-emerald-800 hover:underline"
        >
          {params.value}
        </Link>
      )
    },
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
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => {
        const badge = STATUS_BADGES[params.row.status] || STATUS_BADGES.active;
        return (
          <div className="flex items-center h-full">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        );
      }
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

  // Group filtered advertisements by their backend-supplied department name.
  // If the API doesn't yet eager-load department (pre-v2.2.0 backend), every
  // ad falls into the "Uncategorized" bucket — UI still renders correctly.
  const groupedByDepartment = (() => {
    const groups = new Map();
    filteredAdvertisements.forEach((ad) => {
      const deptId   = ad.department?.hash_id || ad.department?.id || ad.department_id || 'uncategorized';
      const deptName = ad.department?.name || ad.department_name || 'Uncategorized';
      if (!groups.has(deptId)) groups.set(deptId, { id: deptId, name: deptName, ads: [] });
      groups.get(deptId).ads.push(ad);
    });
    return Array.from(groups.values()).sort((a, b) => {
      if (a.name === 'Uncategorized') return 1;
      if (b.name === 'Uncategorized') return -1;
      return a.name.localeCompare(b.name);
    });
  })();

  const toRow = (ad, i) => ({
    id: ad.hash_id || ad.id || `ad-${i}`,
    adv_number: ad.adv_number,
    adv_date: ad.adv_date,
    closing_date: ad.closing_date,
    advertisement_fee: ad.advertisement_fee,
    note: ad.note || ad.notes || ad.ad_note,
    important_notes: ad.important_notes,
    hash_id: ad.hash_id,
    status: ad.status,
    extend_date: ad.extend_date,
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Advertisement Records</h1>
            <p className="text-sm text-slate-500 mt-1">View and manage all advertisement records</p>
          </div>
          <button
            onClick={() => { setGroupByDept((v) => !v); setExpandedDept(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${
              groupByDept
                ? 'bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Building2 size={16} />
            {groupByDept ? 'Showing by Department' : 'Group by Department'}
          </button>
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

        {/* Advanced Filters */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Advertisements"
        />

        {/* Advertisements Table */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          {loading ? (
            <div className="text-slate-500">Loading...</div>
          ) : filteredAdvertisements.length === 0 ? (
            <div className="text-center text-slate-600 py-8">No Advertisements Found</div>
          ) : groupByDept ? (
            <div className="space-y-3">
              {groupedByDepartment.map((group, idx) => {
                const isOpen = expandedDept === group.id || (expandedDept === null && idx === 0);
                return (
                  <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedDept(isOpen ? '__none__' : group.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 size={18} className="text-emerald-700" />
                        <span className="font-semibold text-slate-900">{group.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                          {group.ads.length} ad{group.ads.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      {isOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                    </button>
                    {isOpen && (
                      <div className="p-3">
                        <DataGrid
                          rows={group.ads.map(toRow)}
                          columns={columns}
                          autoHeight
                          pageSizeOptions={[10, 25, 50]}
                          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                          disableRowSelectionOnClick
                          sx={{
                            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                            '& .MuiDataGrid-row': { minHeight: '52px !important' }
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <DataGrid
              rows={filteredAdvertisements.map(toRow)}
              columns={columns}
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
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
      </div>
    </div>
  );
};

export default AdvertisementRecords;
