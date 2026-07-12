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
import SearchableSelect from 'components/ui/SearchableSelect';
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
        <div className="w-10 h-10 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-450 uppercase tracking-widest">Loading Jobs...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard/results')} 
              className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-900 border border-slate-200 bg-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Results Verification Queue</h1>
              <p className="text-xs text-slate-500 mt-1">Bulk Verification & Ingestion Audit</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Job Selection Dropdown */}
            <div className="min-w-[280px]">
              <SearchableSelect
                value={selectedJobId}
                onChange={handleJobChange}
                options={jobs.map((j, idx) => {
                  const val = getJobRouteId(j) || (j.id ? j.id.toString() : '') || idx;
                  return {
                    value: val,
                    label: `${j.designation} (Adv: ${j.advertisements?.[0]?.adv_number || 'N/A'})`,
                  };
                })}
              />
            </div>
          </div>
        </div>

        {/* Info Strip */}
        {selectedJob && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-indigo-650 uppercase tracking-wider">Active Advertisement</span>
              <h3 className="text-base font-bold text-slate-900">{selectedJob.designation}</h3>
              <p className="text-xs text-slate-500">Department: {selectedJob.department?.name || 'AJK PSC'}</p>
            </div>
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-slate-50 rounded-lg text-center border border-slate-200">
                <span className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Passing Criteria</span>
                <span className="text-sm font-bold text-indigo-650">{selectedJob.passing_percentage || 50.00}% Score</span>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar & Candidate List */}
        <div className="space-y-6">

          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">

            {/* Status Filter Toggles (FR-32) */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    statusFilter === f.value
                      ? 'bg-slate-800 text-white border-slate-800 shadow-none'
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
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
                  className="w-full pl-10 pr-4 py-1.5 bg-slate-55 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg text-xs transition-all outline-none h-9"
                />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" />
              </div>
              <Button type="submit" className="h-9 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-none">
                Apply
              </Button>
            </form>
          </div>

          {/* Candidates Table Card */}
          <Card className="border border-slate-200 shadow-sm rounded-lg bg-white overflow-hidden">
            <CardContent className="p-0">
              {loading && candidates.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fetching candidate slips...</p>
                </div>
              ) : candidates.length === 0 ? (
                <div className="p-24 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                    <ShieldCheck size={28} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-900">No Candidate Records</h4>
                    <p className="text-xs text-slate-500 max-w-sm">No candidate results matched your active filter rules or search criteria.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                        <th className="py-3 px-6 w-12 text-center">
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {selectedApps.length === candidates.length ? (
                              <CheckSquare size={16} className="text-indigo-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-6">Candidate & Roll No</th>
                        <th className="py-3 px-6">Subject Breakdown</th>
                        <th className="py-3 px-6 text-center">Percentage</th>
                        <th className="py-3 px-6 text-center">Exam Status</th>
                        <th className="py-3 px-6 text-center">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs bg-white">
                      {candidates.map((cand) => {
                        const isSelected = selectedApps.includes(cand.app_id);

                        // Parse subject summaries
                        const subjects = cand.marks_summary ? Object.entries(cand.marks_summary) : [];

                        return (
                          <tr
                            key={cand.app_id}
                            className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/20' : ''
                              }`}
                          >
                            {/* Selection Checkbox */}
                            <td className="py-4 px-6 text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectRow(cand.app_id)}
                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-indigo-600" />
                                ) : (
                                  <Square size={16} />
                                )}
                              </button>
                            </td>

                            {/* Candidate Info */}
                            <td className="py-4 px-6">
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 border border-indigo-100/50 text-indigo-700 rounded text-[9px] font-semibold font-mono">
                                  Roll No: {cand.roll_no || 'Pending'}
                                </span>
                                <h5 className="font-semibold text-slate-800 text-sm tracking-tight">{cand.full_name}</h5>
                                <p className="text-[10px] text-slate-500 font-mono">{cand.cnic}</p>
                              </div>
                            </td>

                            {/* Subjects breakdown */}
                            <td className="py-4 px-6">
                              {cand.status === 'absent' ? (
                                <span className="text-[10px] font-medium text-slate-400 italic">Candidate Absent</span>
                              ) : subjects.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto pr-1 max-w-[380px]">
                                  {subjects.map(([name, scoreInfo]) => (
                                    <span
                                      key={name}
                                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-[10px] text-slate-700 shadow-sm"
                                    >
                                      {name}: <strong className="text-slate-900">{scoreInfo.obtained} / {scoreInfo.total}</strong>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  Marks Pending Ingestion
                                </span>
                              )}
                            </td>

                            {/* Score / Percentage formatted to 2 decimals */}
                            <td className="py-4 px-6 text-center font-bold text-slate-800 text-sm tabular-nums">
                              {cand.status === 'absent' ? '—' : cand.percentage !== null ? `${Number(cand.percentage).toFixed(2)}%` : '—'}
                            </td>

                            {/* Exam Status (Passed / Failed / Absent) */}
                            <td className="py-4 px-6 text-center">
                              {cand.status === 'pass' && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  PASSED
                                </span>
                              )}
                              {cand.status === 'fail' && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-rose-50 border border-rose-250 text-rose-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  FAILED
                                </span>
                              )}
                              {cand.status === 'absent' && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-slate-150 border border-slate-300 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  ABSENT
                                </span>
                              )}
                            </td>

                            {/* Verification Status */}
                            <td className="py-4 px-6 text-center">
                              {cand.marks_status === 'Approved' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  <CheckCircle2 size={10} className="text-emerald-500" /> Approved
                                </span>
                              )}
                              {cand.marks_status === 'Rejected' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  <XCircle size={10} className="text-rose-500" /> Rejected
                                </span>
                              )}
                              {cand.marks_status === 'Under Verification' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-55 border border-amber-200 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  <AlertCircle size={10} className="text-amber-500" /> Under Verification
                                </span>
                              )}
                              {cand.marks_status === 'Uploaded' && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  Uploaded
                                </span>
                              )}
                              {cand.marks_status === 'Pending' && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
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
                className="h-9 px-4 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-lg shadow-none flex items-center justify-center gap-2"
              >
                {loading ? 'Loading...' : 'Load More Candidates'}
              </Button>
            </div>
          )}
        </div>

        {/* Sticky Action Panel when checkboxes are active */}
        {selectedApps.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-xl shadow-lg flex items-center justify-between gap-8 animate-in fade-in slide-in-from-bottom-6 duration-300 z-50">
            <div className="flex items-center gap-3 border-r border-white/10 pr-6">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                {selectedApps.length}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Selected</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Approve Button */}
              <Button
                onClick={handleBulkApprove}
                disabled={processingAction}
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-none"
              >
                <UserCheck size={14} /> Approve
              </Button>

              {/* Reject Button */}
              <Button
                onClick={handleBulkReject}
                disabled={processingAction}
                className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-none"
              >
                <UserMinus size={14} /> Reject
              </Button>

              {/* Mark Absent Button */}
              <Button
                onClick={handleBulkMarkAbsent}
                disabled={processingAction}
                variant="outline"
                className="h-9 px-4 border border-slate-800 hover:bg-white/10 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-none"
              >
                <XCircle size={14} /> Mark Absent
              </Button>
            </div>
          </div>
        )}

        {/* Rejection Modal for entering mandatory reason */}
        {rejectionModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg w-full max-w-lg p-6 space-y-5 shadow-lg border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                    <UserMinus className="text-rose-500" size={18} /> Reject Results
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Confirming rejection for {selectedApps.length} candidates
                  </p>
                </div>
                <button
                  onClick={() => setRejectionModalOpen(false)}
                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-800 font-semibold leading-relaxed">
                  ⚠️ <strong>Reason Mandatory:</strong> You are rejecting the results of the selected candidates. Please provide a brief explanation below. This reason will be logged in their remarks and the audit log trail.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-450 uppercase tracking-wider">Rejection Reason</label>
                  <textarea
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Mismatched roll number details or incomplete copy script..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setRejectionModalOpen(false)}
                  variant="outline"
                  className="flex-1 h-9 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-lg shadow-none"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => executeBulkAction('reject', rejectionReason)}
                  disabled={!rejectionReason.trim() || processingAction}
                  className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-none"
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
