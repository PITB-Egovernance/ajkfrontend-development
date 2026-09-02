import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, RefreshCw, Send, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import AdvertisementApi from 'api/advertisementApi';
import { getJobRouteId } from 'utils/jobMapper';
import BulkPublishModal from 'components/results/BulkPublishModal';
import BulkWithdrawModal from 'components/results/BulkWithdrawModal';

// Same "results verified/approved onward" gate used by the per-job Actions
// menu (ResultsExamFlow.jsx / ResultsDashboard.jsx isShortlistable) — a post
// only enters the post-result pipeline once its result has cleared the
// verification queue.
const ELIGIBLE_STATUSES = [
  'Approved', 'APPROVED', 'WITHDRAWN',
  'Published', 'PROVISIONAL PUBLISHED', 'FINAL PUBLISHED', 'GAZETTE PUBLISHED',
];

// Which of those statuses can still be published vs. can be unpublished —
// drives which bulk action is offered/enabled for a given selection.
const PUBLISHABLE_STATUSES = ['Approved', 'APPROVED', 'WITHDRAWN'];
const UNPUBLISHABLE_STATUSES = ['Published', 'PROVISIONAL PUBLISHED', 'FINAL PUBLISHED', 'GAZETTE PUBLISHED'];

const DEFAULT_FILTERS = { search: '', adv_number: '' };

// Same result_status color convention used on the Results module (ResultsExamFlow.jsx StatusBadge).
const resultStatusClass = (status) => {
  const s = status || 'Pending';
  if (s === 'Published' || s === 'PROVISIONAL PUBLISHED') return 'bg-purple-50 text-purple-600 border-purple-100';
  if (s === 'FINAL PUBLISHED') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  if (s === 'GAZETTE PUBLISHED') return 'bg-pink-50 text-pink-600 border-pink-100';
  if (s === 'Approved' || s === 'APPROVED') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (s === 'WITHDRAWN') return 'bg-rose-50 text-rose-600 border-rose-100';
  return 'bg-slate-100 text-slate-500 border-slate-200';
};

const PostResultLanding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  // job.id is stripped from every API response (JobDetail::$hidden), so
  // hash_id (getJobRouteId) is the only identifier the frontend ever has —
  // it must be used everywhere below, never a numeric id.
  const [selected, setSelected] = useState([]); // array of job hash_id (string)

  // Bulk publish/unpublish modals — jobIds is whatever set (selected or
  // "all eligible in view") the triggering button computed.
  const [publishJobIds, setPublishJobIds] = useState(null); // string[] | null
  const [withdrawJobIds, setWithdrawJobIds] = useState(null); // string[] | null

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await AdvertisementApi.getAll(1, { per_page: 200, results_only: true });
      const advertisements = res.data?.data || res.data || [];
      const flatJobs = advertisements.flatMap((adv) =>
        (adv.job_details || adv.jobDetails || []).map((job) => ({ ...job, adv }))
      );
      setJobs(flatJobs.filter((job) => ELIGIBLE_STATUSES.includes(job.result_status)));
    } catch (err) {
      toast.error(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const advertisementOptions = useMemo(() => {
    const seen = new Map();
    jobs.forEach((j) => {
      const advNo = j.adv?.adv_number;
      if (advNo && !seen.has(advNo)) seen.set(advNo, `${advNo}`);
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [jobs]);

  const filterConfig = useMemo(() => [
    { name: 'search', label: 'Search', type: 'text', placeholder: 'Post, advertisement, department...' },
    { name: 'adv_number', label: 'Advertisement', type: 'select', options: advertisementOptions },
  ], [advertisementOptions]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => setFilters(DEFAULT_FILTERS);

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (filters.adv_number && job.adv?.adv_number !== filters.adv_number) return false;
      if (!term) return true;
      return (
        (job.designation || '').toLowerCase().includes(term) ||
        (job.adv?.adv_number || '').toLowerCase().includes(term) ||
        (job.department_label || '').toLowerCase().includes(term)
      );
    });
  }, [jobs, filters]);

  const publishableInView = useMemo(() => filtered.filter((j) => PUBLISHABLE_STATUSES.includes(j.result_status)), [filtered]);
  const unpublishableInView = useMemo(() => filtered.filter((j) => UNPUBLISHABLE_STATUSES.includes(j.result_status)), [filtered]);

  const selectedPublishable = useMemo(
    () => filtered.filter((j) => selected.includes(getJobRouteId(j)) && PUBLISHABLE_STATUSES.includes(j.result_status)),
    [filtered, selected]
  );
  const selectedUnpublishable = useMemo(
    () => filtered.filter((j) => selected.includes(getJobRouteId(j)) && UNPUBLISHABLE_STATUSES.includes(j.result_status)),
    [filtered, selected]
  );

  const toggleOne = (job) => {
    const id = getJobRouteId(job);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((j) => selected.includes(getJobRouteId(j)));
  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filtered.map(getJobRouteId));
      setSelected((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...filtered.map(getJobRouteId)])));
    }
  };

  const openPublishModal = (jobIds) => {
    if (jobIds.length === 0) {
      toast.error('No publishable posts in this selection');
      return;
    }
    setPublishJobIds(jobIds);
  };

  const openWithdrawModal = (jobIds) => {
    if (jobIds.length === 0) {
      toast.error('No published posts in this selection');
      return;
    }
    setWithdrawJobIds(jobIds);
  };

  const handleBulkSuccess = () => {
    setPublishJobIds(null);
    setWithdrawJobIds(null);
    setSelected([]);
    fetchJobs();
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg"><ClipboardCheck size={22} className="text-emerald-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Post-Result Processing</h1>
              <p className="text-sm text-slate-500 mt-1">
                Passed Candidates → Shortlisted for Documents → Interview → Award List → Onboarding
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => openPublishModal(publishableInView.map(getJobRouteId))}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Send size={14} className="mr-1.5" /> Publish All ({publishableInView.length})
            </Button>
            <Button size="sm" variant="outline" onClick={() => openWithdrawModal(unpublishableInView.map(getJobRouteId))}
              className="border-amber-300 text-amber-700 hover:bg-amber-50">
              <EyeOff size={14} className="mr-1.5" /> Unpublish All ({unpublishableInView.length})
            </Button>
            <button
              onClick={fetchJobs}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
              className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Posts"
        />

        {/* BULK SELECTION BAR */}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-emerald-800 mr-2">{selected.length} selected</span>
            <Button size="sm" onClick={() => openPublishModal(selectedPublishable.map(getJobRouteId))} disabled={selectedPublishable.length === 0}>
              <Send size={14} className="mr-1.5" /> Publish Selected ({selectedPublishable.length})
            </Button>
            <Button size="sm" variant="secondary" onClick={() => openWithdrawModal(selectedUnpublishable.map(getJobRouteId))} disabled={selectedUnpublishable.length === 0}>
              <EyeOff size={14} className="mr-1.5" /> Unpublish Selected ({selectedUnpublishable.length})
            </Button>
            <button onClick={() => setSelected([])} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 ml-1">Clear</button>
          </div>
        )}

        {/* LIST */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <InlineLoader text="Loading posts..." variant="ring" size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                <ClipboardCheck size={26} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">No Eligible Posts</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  A post appears here once its final result has been approved from the Verification Queue.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="flex items-center gap-3 py-2.5 px-5 bg-slate-50">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-900 focus:ring-emerald-600"
                  aria-label="Select all visible posts"
                />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Select All</span>
              </div>
              {filtered.map((job) => {
                const routeId = getJobRouteId(job);
                return (
                  <div key={routeId} className="w-full flex items-center gap-3 py-4 px-5 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.includes(routeId)}
                      onChange={() => toggleOne(job)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-900 focus:ring-emerald-600 flex-shrink-0"
                      aria-label={`Select ${job.designation}`}
                    />
                    <button
                      onClick={() => navigate(`/dashboard/results/post-result/${routeId}`)}
                      className="flex-1 flex items-center justify-between text-left min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{job.designation}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Advertisement {job.adv?.adv_number || '—'} · {job.department_label || 'Unassigned Department'}
                        </p>
                      </div>
                      <span className={`ml-3 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${resultStatusClass(job.result_status)}`}>
                        {job.result_status}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <BulkPublishModal isOpen={Boolean(publishJobIds)} onClose={() => setPublishJobIds(null)} jobIds={publishJobIds || []} onSuccess={handleBulkSuccess} />
      <BulkWithdrawModal isOpen={Boolean(withdrawJobIds)} onClose={() => setWithdrawJobIds(null)} jobIds={withdrawJobIds || []} onSuccess={handleBulkSuccess} />

    </div>
  );
};

export default PostResultLanding;
