import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Search,
  Check,
  X,
  UserCheck,
  UserMinus,
  FileText,
  UserCheck2,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  MoreVertical,
  SlidersHorizontal
} from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import toast from 'react-hot-toast';
import { getJobRouteId } from 'utils/jobMapper';

const VerificationPage = () => {
  const { jobId: urlJobId } = useParams();
  const navigate = useNavigate();

  // State
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(urlJobId || '');
  const [selectedJob, setSelectedJob] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'passed', 'failed', 'absent', 'pending'
  const [pagination, setPagination] = useState({
    total: 0,
    has_more: false,
    next_cursor: null
  });
  const [cursor, setCursor] = useState(null);

  // Selection
  const [selectedApps, setSelectedApps] = useState([]);

  // Modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Fetch active jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setJobsLoading(true);
        const res = await AdvertisementApi.getAll(1);

        let advertisements = [];
        if (res && res.data) {
          if (Array.isArray(res.data.data)) {
            advertisements = res.data.data;
          } else if (Array.isArray(res.data)) {
            advertisements = res.data;
          }
        }

        // Flatten jobs from all advertisements
        const fetchedJobs = advertisements.flatMap(adv =>
          (adv.job_details || adv.jobDetails || []).map(job => ({
            ...job,
            advertisements: [adv]
          }))
        );

        setJobs(fetchedJobs);

        if (fetchedJobs.length > 0) {
          let matched = null;
          if (urlJobId) {
            matched = fetchedJobs.find(
              j => {
                const routeId = getJobRouteId(j);
                const stringId = j.id ? j.id.toString() : '';
                return (routeId && routeId === urlJobId) || (stringId && stringId === urlJobId);
              }
            );
          }

          const defaultJob = matched || fetchedJobs[0];
          setSelectedJob(defaultJob);
          setSelectedJobId(getJobRouteId(defaultJob) || (defaultJob.id ? defaultJob.id.toString() : ''));
        }
      } catch (err) {
        console.error('Failed to load active jobs:', err);
        toast.error('Failed to load active jobs: ' + err.message);
      } finally {
        setJobsLoading(false);
      }
    };
    fetchJobs();
  }, [urlJobId]);

  // Fetch candidates when job or filters change
  useEffect(() => {
    if (selectedJobId) {
      fetchCandidates(true);
    }
  }, [selectedJobId, statusFilter, cursor]);

  const fetchCandidates = async (reset = false) => {
    try {
      setLoading(true);
      const params = {
        limit: 50,
        search: searchTerm || undefined,
        status_filter: statusFilter !== 'all' ? statusFilter : undefined,
        cursor: reset ? undefined : cursor || undefined
      };

      const res = await ResultsApi.getCandidates(selectedJobId, params);

      if (res.data) {
        setCandidates(res.data);
        setPagination({
          total: res.pagination?.total || 0,
          has_more: res.pagination?.has_more || false,
          next_cursor: res.pagination?.next_cursor || null
        });
        if (reset) {
          setSelectedApps([]);
        }
      }
    } catch (err) {
      toast.error('Failed to load candidates for verification');
    } finally {
      setLoading(false);
    }
  };

  const handleJobChange = (e) => {
    const jobId = e.target.value;
    setSelectedJobId(jobId);
    const matched = jobs.find(j => {
      const routeId = getJobRouteId(j);
      const stringId = j.id ? j.id.toString() : '';
      return routeId === jobId || stringId === jobId;
    });
    setSelectedJob(matched || null);
    setSelectedApps([]);
    setCursor(null);
    if (matched) {
      navigate(`/dashboard/results/verification/${getJobRouteId(matched)}`, { replace: true });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCandidates(true);
  };

  // Checkbox management
  const handleSelectRow = (appId) => {
    setSelectedApps(prev =>
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    );
  };

  const handleSelectAll = () => {
    // Determine eligible list based on current view
    const eligibleAppIds = candidates.map(c => c.app_id);
    if (selectedApps.length === eligibleAppIds.length) {
      setSelectedApps([]);
    } else {
      setSelectedApps(eligibleAppIds);
    }
  };

  // Bulk execution
  const executeBulkAction = async (action, reasonStr = '') => {
    if (selectedApps.length === 0) return;

    try {
      setProcessingAction(true);
      toast.loading('Processing action...', { id: 'bulk-task' });

      await ResultsApi.bulkAction({
        job_post_id: selectedJobId,
        action,
        application_ids: selectedApps,
        reason: reasonStr
      });

      toast.success('Bulk action completed successfully!', { id: 'bulk-task' });
      setRejectionModalOpen(false);
      setRejectionReason('');
      setSelectedApps([]);
      fetchCandidates(true);
    } catch (err) {
      toast.error(err.message || 'Bulk action failed', { id: 'bulk-task' });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBulkApprove = () => {
    const confirm = window.confirm(`Are you sure you want to APPROVE ${selectedApps.length} selected candidate results?`);
    if (confirm) {
      executeBulkAction('approve');
    }
  };

  const handleBulkReject = () => {
    setRejectionModalOpen(true);
  };

  const handleBulkMarkAbsent = () => {
    const confirm = window.confirm(`WARNING: This will override the selected ${selectedApps.length} candidates' exam status to ABSENT and clear all marks. Proceed?`);
    if (confirm) {
      executeBulkAction('mark_absent');
    }
  };

  if (jobsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Jobs...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[90rem] mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/results')} className="p-3 bg-white shadow-sm border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all group">
              <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Results Verification Queue</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Bulk Verification & Ingestion Audit</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Job Selection Dropdown */}
            <div className="relative min-w-[280px]">
              <select
                value={selectedJobId}
                onChange={handleJobChange}
                className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-5 pr-10 text-xs font-black uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none cursor-pointer"
              >
                {jobs.map((j, idx) => {
                  const val = getJobRouteId(j) || (j.id ? j.id.toString() : '') || idx;
                  return (
                    <option key={val} value={val}>
                      {j.designation} (Adv: {j.advertisements?.[0]?.adv_number || 'N/A'})
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <SlidersHorizontal size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Info Strip */}
        {selectedJob && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Advertisement</span>
              <h3 className="text-lg font-black text-slate-800">{selectedJob.designation}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase">Department: {selectedJob.department?.name || 'AJK PSC'}</p>
            </div>
            <div className="flex gap-4">
              <div className="px-5 py-3 bg-slate-50 rounded-2xl text-center border border-slate-100">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Passing Criteria</span>
                <span className="text-sm font-black text-indigo-600">{selectedJob.passing_percentage || 50.00}% Score</span>
              </div>

            </div>
          </div>
        )}

        {/* Filter Bar & Candidate List */}
        <div className="space-y-6">

          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">

            {/* Status Filter Toggles (FR-32) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1.5">
                <Filter size={12} /> Status:
              </span>
              {[
                { label: 'All', value: 'all' },
                { label: 'Passed', value: 'passed' },
                { label: 'Failed', value: 'failed' },
                { label: 'Absent', value: 'absent' },
                { label: 'Pending / Unapproved', value: 'pending' }
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => {
                    setStatusFilter(f.value);
                    setCursor(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${statusFilter === f.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-96">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search Roll No or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <Button type="submit" className="py-3 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">
                Apply
              </Button>
            </form>
          </div>

          {/* Candidates Table Card */}
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-100">
            <CardContent className="p-0">
              {loading && candidates.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching candidate slips...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="p-24 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                    <ShieldCheck size={32} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-900">No Candidate Records</h4>
                    <p className="text-xs font-bold text-slate-400 max-w-sm">No candidate results matched your active filter rules or search criteria.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        <th className="py-5 px-6 w-12 text-center">
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {selectedApps.length === candidates.length ? (
                              <CheckSquare size={18} className="text-indigo-600" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </th>
                        <th className="py-5 px-6">Candidate & Roll No</th>
                        <th className="py-5 px-6">Subject Breakdown</th>
                        <th className="py-5 px-6 text-center">Percentage</th>
                        <th className="py-5 px-6 text-center">Exam Status</th>
                        <th className="py-5 px-6 text-center">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {candidates.map((cand) => {
                        const isSelected = selectedApps.includes(cand.app_id);

                        // Parse subject summaries
                        const subjects = cand.marks_summary ? Object.entries(cand.marks_summary) : [];

                        return (
                          <tr
                            key={cand.app_id}
                            className={`hover:bg-slate-50/20 transition-colors ${isSelected ? 'bg-indigo-50/20' : ''
                              }`}
                          >
                            {/* Selection Checkbox */}
                            <td className="py-5 px-6 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectRow(cand.app_id)}
                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare size={18} className="text-indigo-600" />
                                ) : (
                                  <Square size={18} />
                                )}
                              </button>
                            </td>

                            {/* Candidate Info */}
                            <td className="py-5 px-6">
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-mono text-[9px] font-black">
                                  Roll No: {cand.roll_no || 'Pending'}
                                </span>
                                <h5 className="font-extrabold text-slate-800 text-sm tracking-tight">{cand.full_name}</h5>
                                <p className="text-[10px] font-bold text-slate-400 font-mono">{cand.cnic}</p>
                              </div>
                            </td>

                            {/* Subjects breakdown */}
                            <td className="py-5 px-6">
                              {cand.status === 'absent' ? (
                                <span className="text-[10px] font-bold text-slate-400 italic">Candidate Absent</span>
                              ) : subjects.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {subjects.map(([name, scoreInfo]) => (
                                    <span
                                      key={name}
                                      className="px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded-lg font-bold text-[10px] text-slate-700"
                                    >
                                      {name}: <strong className="text-slate-950">{scoreInfo.obtained} / {scoreInfo.total}</strong>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                                  Marks Pending Ingestion
                                </span>
                              )}
                            </td>

                            {/* Score / Percentage formatted to 2 decimals */}
                            <td className="py-5 px-6 text-center font-black text-slate-800 text-sm tabular-nums">
                              {cand.status === 'absent' ? '—' : cand.percentage !== null ? `${Number(cand.percentage).toFixed(2)}%` : '—'}
                            </td>

                            {/* Exam Status (Passed / Failed / Absent) */}
                            <td className="py-5 px-6 text-center">
                              {cand.status === 'pass' && (
                                <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  PASSED
                                </span>
                              )}
                              {cand.status === 'fail' && (
                                <span className="inline-flex items-center px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  FAILED
                                </span>
                              )}
                              {cand.status === 'absent' && (
                                <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  ABSENT
                                </span>
                              )}
                            </td>

                            {/* Verification Status */}
                            <td className="py-5 px-6 text-center">
                              {cand.marks_status === 'Approved' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  <CheckCircle2 size={10} /> Approved
                                </span>
                              )}
                              {cand.marks_status === 'Rejected' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 text-rose-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  <XCircle size={10} /> Rejected
                                </span>
                              )}
                              {cand.marks_status === 'Under Verification' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  <AlertCircle size={10} /> Under Verification
                                </span>
                              )}
                              {cand.marks_status === 'Uploaded' && (
                                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  Uploaded
                                </span>
                              )}
                              {cand.marks_status === 'Pending' && (
                                <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-wider">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Keyset Pagination Controls */}
          {pagination.has_more && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => setCursor(pagination.next_cursor)}
                disabled={loading}
                className="py-3 px-8 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm transition-all"
              >
                {loading ? 'Loading...' : 'Load More Candidates'}
              </Button>
            </div>
          )}
        </div>

        {/* Sticky Action Panel when checkboxes are active */}
        {selectedApps.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center justify-between gap-10 animate-in fade-in slide-in-from-bottom-6 duration-300 z-50">
            <div className="flex items-center gap-4 border-r border-white/10 pr-6">
              <div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-500/30">
                {selectedApps.length}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-300">Candidates Selected</p>
                <p className="text-[10px] text-slate-400 font-bold">Ready for bulk actions</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Approve Button */}
              <Button
                onClick={handleBulkApprove}
                disabled={processingAction}
                className="h-auto py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all flex items-center gap-1.5"
              >
                <UserCheck size={14} /> Approve
              </Button>

              {/* Reject Button */}
              <Button
                onClick={handleBulkReject}
                disabled={processingAction}
                className="h-auto py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all flex items-center gap-1.5"
              >
                <UserMinus size={14} /> Reject
              </Button>

              {/* Mark Absent Button */}
              <Button
                onClick={handleBulkMarkAbsent}
                disabled={processingAction}
                variant="outline"
                className="h-auto py-3 px-6 border-white/20 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center gap-1.5"
              >
                <XCircle size={14} /> Mark Absent
              </Button>
            </div>
          </div>
        )}

        {/* Rejection Modal for entering mandatory reason */}
        {rejectionModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 space-y-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <UserMinus className="text-rose-500" size={20} /> Reject Results
                  </h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Confirming rejection for {selectedApps.length} candidates
                  </p>
                </div>
                <button
                  onClick={() => setRejectionModalOpen(false)}
                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl text-rose-800 text-xs font-bold leading-relaxed">
                  ⚠️ <strong>Reason Mandatory:</strong> You are rejecting the results of the selected candidates. Please provide a brief explanation below. This reason will be logged in their remarks and the audit log trail.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rejection Reason</label>
                  <textarea
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Mismatched roll number details or incomplete copy script..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setRejectionModalOpen(false)}
                  variant="outline"
                  className="flex-1 py-3 px-4 border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => executeBulkAction('reject', rejectionReason)}
                  disabled={!rejectionReason.trim() || processingAction}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-100 transition-all"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VerificationPage;
