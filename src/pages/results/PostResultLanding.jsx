import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import AdvertisementApi from 'api/advertisementApi';
import { getJobRouteId } from 'utils/jobMapper';

// Same "results verified/approved onward" gate used by the per-job Actions
// menu (ResultsExamFlow.jsx / ResultsDashboard.jsx isShortlistable) — a post
// only enters the post-result pipeline once its result has cleared the
// verification queue.
const ELIGIBLE_STATUSES = [
  'Approved', 'APPROVED', 'WITHDRAWN',
  'Published', 'PROVISIONAL PUBLISHED', 'FINAL PUBLISHED', 'GAZETTE PUBLISHED',
];

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
          <Button variant="outline" size="md" onClick={fetchJobs} disabled={loading}
            className="h-10 w-10 min-w-[2.5rem] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            title="Refresh" aria-label="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Posts"
        />

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
              {filtered.map((job) => (
                <button
                  key={getJobRouteId(job)}
                  onClick={() => navigate(`/dashboard/results/post-result/${getJobRouteId(job)}`)}
                  className="w-full flex items-center justify-between py-4 px-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{job.designation}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Advertisement {job.adv?.adv_number || '—'} · {job.department_label || 'Unassigned Department'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${resultStatusClass(job.result_status)}`}>
                    {job.result_status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PostResultLanding;
