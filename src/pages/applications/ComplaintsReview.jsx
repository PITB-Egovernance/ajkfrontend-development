import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { RefreshCw, MessageSquare, MessageSquareWarning, Inbox, Clock3, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { toast } from 'react-hot-toast';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import { formatCNIC } from 'utils/stringUtils';

const API_BASE = Config.apiUrl;
const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': Config.apiKey,
});

const CATEGORY_LABELS = {
  technical:    'Technical',
  roll_no_slip: 'Roll No Slip',
  result:       'Result',
  payment:      'Payment',
  general:      'General',
};

const STATUS_LABELS = {
  open:      'Open',
  in_review: 'In Review',
  resolved:  'Resolved',
  closed:    'Closed',
};

// Same rounded-pill badge convention used across the CCE screening/date-sheet
// pages (Published/Draft, Pass/Fail, etc.) rather than a raw MUI Chip.
const STATUS_BADGE = {
  open:      'bg-slate-100 text-slate-600',
  in_review: 'bg-amber-100 text-amber-800',
  resolved:  'bg-emerald-100 text-emerald-800',
  closed:    'bg-slate-100 text-slate-500',
};

const DEFAULT_FILTERS = { status: '', category: '', search: '' };

const ComplaintsReview = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState([]);

  // Review modal state
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('in_review');
  const [reviewResponse, setReviewResponse] = useState('');

  // ── Load Complaints ──────────────────────────────────────────────────────
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = new URL(`${API_BASE}/complaints`);
      if (filters.status) url.searchParams.set('status', filters.status);
      if (filters.category) url.searchParams.set('category', filters.category);

      const res = await fetch(url.toString(), { headers: getHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load complaints');
      setComplaints(json.data || []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.category]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters(DEFAULT_FILTERS);

  const filterConfig = useMemo(() => [
    {
      name: 'status', label: 'Status', type: 'select',
      options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      name: 'category', label: 'Category', type: 'select',
      options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
    },
    { name: 'search', label: 'Search', type: 'text', placeholder: 'Candidate name, CNIC, or subject...' },
  ], []);

  // status/category are server-filtered (see fetchComplaints); search is
  // client-side against the already-loaded page, same as before.
  const visibleComplaints = complaints.filter((c) => {
    if (!filters.search.trim()) return true;
    const needle = filters.search.trim().toLowerCase();
    return [c.subject, c.candidate?.name, c.candidate?.cnic]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(needle));
  });

  const stats = useMemo(() => ({
    open:      complaints.filter((c) => c.status === 'open').length,
    in_review: complaints.filter((c) => c.status === 'in_review').length,
    resolved:  complaints.filter((c) => c.status === 'resolved').length,
    closed:    complaints.filter((c) => c.status === 'closed').length,
  }), [complaints]);

  // Reset selection whenever the visible set changes (refresh, filter, or
  // search) — a stale checked id could otherwise silently export/act on a
  // row no longer on screen.
  useEffect(() => {
    setSelectedIds([]);
  }, [complaints, filters.search]);

  const toggleSelected = (id) => setSelectedIds((prev) => (
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  ));
  const toggleSelectAll = () => setSelectedIds((prev) => (
    prev.length === visibleComplaints.length ? [] : visibleComplaints.map((c) => c.id)
  ));

  // Same XLSX.utils.json_to_sheet approach ApplicationsList.jsx's own Excel
  // export uses — CNIC goes through formatCNIC() first so SheetJS doesn't
  // auto-detect the raw digit string as a number and render it in
  // scientific notation.
  const handleExportExcel = (rows, filenamePrefix) => {
    if (rows.length === 0) {
      toast.error('No complaints to export');
      return;
    }
    const data = rows.map((c) => ({
      'Candidate Name':  c.candidate?.name || '',
      'CNIC':            formatCNIC(c.candidate?.cnic),
      'Category':        CATEGORY_LABELS[c.category] || c.category,
      'Subject':         c.subject,
      'Description':     c.description || '',
      'Status':          STATUS_LABELS[c.status] || c.status,
      'Admin Response':  c.admin_response || '',
      'Filed At':        c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Complaints');
    XLSX.writeFile(workbook, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ── Update Complaint ─────────────────────────────────────────────────────
  const handleUpdate = async (id, status, adminResponse = '') => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/complaints/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status,
          ...(adminResponse ? { admin_response: adminResponse } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update complaint');

      toast.success('Complaint updated!');
      fetchComplaints();
      setModalOpen(false);
      setSelected(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const openReviewModal = (complaint) => {
    setSelected(complaint);
    setReviewStatus(complaint.status === 'open' ? 'in_review' : complaint.status);
    setReviewResponse(complaint.admin_response || '');
    setModalOpen(true);
  };

  return (
    <>
      {/* Header — same title/subtitle + circular icon-only Refresh button
          layout as ApplicationsList.jsx, not a button stuffed into the
          filter grid. */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidate Complaints</h1>
          <p className="text-sm text-slate-500 mt-1">Review and respond to complaints candidates have filed from their portal.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExportExcel(visibleComplaints, 'complaints_all')}
            disabled={loading || visibleComplaints.length === 0}
            className="h-10 flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          <button
            onClick={fetchComplaints}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh"
            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stat cards — same convention as CCE Screening Results' Pending/Pass/Fail/Published row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-slate-500"><Inbox size={14} /><p className="text-xs font-semibold">Open</p></div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">{stats.open}</h2>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-700"><Clock3 size={14} /><p className="text-xs font-semibold">In Review</p></div>
          <h2 className="text-2xl font-bold text-amber-900 mt-1">{stats.in_review}</h2>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={14} /><p className="text-xs font-semibold">Resolved</p></div>
          <h2 className="text-2xl font-bold text-emerald-900 mt-1">{stats.resolved}</h2>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-slate-500"><XCircle size={14} /><p className="text-xs font-semibold">Closed</p></div>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">{stats.closed}</h2>
        </div>
      </div>

      <AdvancedFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        filterConfig={filterConfig}
        title="Filter Complaints"
      />

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load complaints</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!loading && visibleComplaints.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">
            {selectedIds.length === 0
              ? 'No complaints selected on this page'
              : `${selectedIds.length} complaint${selectedIds.length === 1 ? '' : 's'} selected`}
          </p>
          <button
            onClick={() => handleExportExcel(visibleComplaints.filter((c) => selectedIds.includes(c.id)), 'complaints_selected')}
            disabled={selectedIds.length === 0}
            className="h-9 flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
          >
            <FileSpreadsheet size={14} /> Export Selected ({selectedIds.length})
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center">
            <InlineLoader text="Loading complaints..." variant="ring" size="lg" />
          </div>
        ) : visibleComplaints.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
              <MessageSquare size={32} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700">No complaints found</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">Complaints candidates file from their portal will show up here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      className="accent-emerald-800"
                      checked={selectedIds.length === visibleComplaints.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Filed</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="accent-emerald-800"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelected(c.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{c.candidate?.name || '—'}</span>
                      <br />
                      <span className="text-xs text-slate-500">{c.candidate?.cnic}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{CATEGORY_LABELS[c.category] || c.category}</td>
                    <td className="px-4 py-3 text-slate-600">{c.subject}</td>
                    <td className="px-4 py-3 text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-500'}`}>
                        {(STATUS_LABELS[c.status] || c.status).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => openReviewModal(c)} className="gap-1.5">
                        <MessageSquareWarning size={13} /> Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal — same fixed-overlay Tailwind card convention used by
          ShortlistPublishModal / CandidateProfileModal, not an MUI Dialog. */}
      {modalOpen && selected && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Review Complaint</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                <XCircle size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Candidate</p>
                  <p className="text-slate-800 mt-0.5">{selected.candidate?.name} ({selected.candidate?.cnic})</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</p>
                  <p className="text-slate-800 mt-0.5">{CATEGORY_LABELS[selected.category] || selected.category}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Subject</p>
                  <p className="text-slate-800 mt-0.5">{selected.subject}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description</p>
                  <p className="text-slate-700 mt-0.5">{selected.description}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Response to candidate</label>
                  <textarea
                    rows={3}
                    value={reviewResponse}
                    onChange={(e) => setReviewResponse(e.target.value)}
                    placeholder="Shown back to the candidate on their own Complaints page..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" className="bg-white" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                onClick={() => handleUpdate(selected.id, reviewStatus, reviewResponse)}
                disabled={updating}
              >
                {updating ? 'Saving…' : 'Save Decision'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ComplaintsReview;
