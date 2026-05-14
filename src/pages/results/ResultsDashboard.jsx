import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import {
  FileSpreadsheet,
  Database,
  Send,
  History,
  ArrowRight,
  ClipboardCheck,
  LayoutDashboard,
  ShieldAlert,
  Search,
  Plus,
  FileDown,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useAuth } from 'context/AuthContext';
import { getUserRole } from 'utils/roleUtils';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import toast from 'react-hot-toast';
import { getJobRouteId } from 'utils/jobMapper';
import OfficialPublicationModal from 'components/results/OfficialPublicationModal';
import MarkApprovalConsole from 'components/results/MarkApprovalConsole';

/**
 * ResultsDashboard
 * Central landing page for the Results Module with role-based quick actions and metrics
 */

const ResultsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = getUserRole(user);

  const isAdmin = ['admin', 'chairman', 'secretary'].includes(userRole);
  const isDirector = ['director', 'admin', 'chairman', 'secretary'].includes(userRole);

  const [pendingCount, setPendingCount] = useState(0);

  const [stats, setStats] = useState([
    { label: 'Total Results Entered', value: '0', icon: Database, bg: 'bg-blue-50', iconBg: 'bg-blue-500' },
    { label: 'Pending Publication', value: '0', icon: ClipboardCheck, bg: 'bg-amber-50', iconBg: 'bg-amber-500' },
    { label: 'Published Results', value: '0', icon: Send, bg: 'bg-emerald-50', iconBg: 'bg-emerald-500' },
    { label: 'Bulk Imports (CSV)', value: '0', icon: FileSpreadsheet, bg: 'bg-purple-50', iconBg: 'bg-purple-500' },
  ]);

  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchingJobs, setFetchingJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchActiveJobs = async () => {
    setFetchingJobs(true);
    try {
      const res = await AdvertisementApi.getAll(1);
      setJobs(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load active jobs for result management');
    } finally {
      setFetchingJobs(false);
    }
  };

  const fetchImportHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await ResultsApi.getImportHistory({ limit: 5 });
      setImportHistory(res.data || res || []);
    } catch (err) {
      console.error('History fetch failed', err);
      setImportHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const res = await ResultsApi.getPendingMarkEdits();
      setPendingCount(res.data?.length || 0);
    } catch (err) {
      console.error('Failed to fetch pending approvals');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await ResultsApi.getStats();
      if (res.data) {
        setStats(prev => prev.map(s => {
          if (s.label === 'Total Results Entered') return { ...s, value: res.data.total_entered };
          if (s.label === 'Pending Publication') return { ...s, value: res.data.pending_publication };
          return s;
        }));
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  useEffect(() => {
    fetchActiveJobs();
    fetchImportHistory();
    fetchStats();
    if (isAdmin) {
      fetchPendingApprovals();
    }
  }, [isAdmin]);

  const handleVerify = async (job) => {
    const confirm = window.confirm(`Are you sure you want to officially APPROVE and VERIFY results for ${job.designation}? This will allow official publication.`);
    if (!confirm) return;

    try {
      toast.loading('Verifying results...', { id: 'verify-task' });
      await ResultsApi.verifyResults(getJobRouteId(job));
      toast.success('Results verified and approved!', { id: 'verify-task' });
      fetchActiveJobs(); // Refresh list
    } catch (err) {
      toast.error(err.message || 'Verification failed', { id: 'verify-task' });
    }
  };

  const handleOpenPublish = (job) => {
    setSelectedJob(job);
    setPublishModalOpen(true);
  };

  const handlePublishSuccess = () => {
    setPublishModalOpen(false);
    fetchActiveJobs();
    toast.success('Results published successfully!');
  };

  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Downloading template...', { id: 'dash-template' });
      const blob = await ResultsApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'AJKPSC_Results_Template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded', { id: 'dash-template' });
    } catch (err) {
      toast.error('Failed to download template', { id: 'dash-template' });
    }
  };

  const handleDownloadGazette = async (job) => {
    try {
      toast.loading('Generating Official Gazette...', { id: 'gazette-task' });
      const blob = await ResultsApi.downloadGazette(getJobRouteId(job));
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Gazette_${job.designation.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Gazette downloaded successfully!', { id: 'gazette-task' });
    } catch (err) {
      toast.error('Failed to generate Gazette', { id: 'gazette-task' });
    }
  };

  const quickActions = [
    {
      title: 'Manual Mark Entry',
      desc: 'Individual candidate result entry',
      link: '/dashboard/results/entry',
      icon: Plus,
      iconBg: 'bg-emerald-500',
      show: isAdmin
    },
    {
      title: 'Bulk CSV Import',
      desc: 'Batch process results via CSV',
      icon: FileSpreadsheet,
      iconBg: 'bg-blue-500',
      show: isAdmin,
      extraAction: {
        label: 'Download Template',
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDownloadTemplate();
        },
        icon: FileDown
      },
    },
    {
      title: 'Verification Queue',
      desc: 'Review & approve mark corrections',
      link: '/dashboard/results/approvals',
      icon: ShieldAlert,
      iconBg: 'bg-indigo-600',
      show: isAdmin
    },
    {
      title: 'Award & Interview Entry',
      desc: 'Enter viva voce & final awards',
      link: '/dashboard/results/awards',
      icon: ClipboardCheck,
      iconBg: 'bg-amber-500',
      show: isAdmin
    },
    {
      title: 'Merit Management',
      desc: 'Ranking & candidate rotation',
      link: '/dashboard/results/merit',
      icon: LayoutDashboard,
      iconBg: 'bg-indigo-500',
      show: isAdmin || isDirector
    },
    {
      title: 'Publication Control',
      desc: 'Release results & notify candidates',
      link: '/dashboard/results/publish',
      icon: Send,
      iconBg: 'bg-rose-500',
      show: isDirector
    }
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Results Module</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Performance & Ranking Control</p>
          </div>

        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-none shadow-xl rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-900 tabular-nums">{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.iconBg} text-white shadow-lg`}>
                    <stat.icon size={24} strokeWidth={2.5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {isAdmin && (
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-300 bg-indigo-600 text-white group cursor-pointer" onClick={() => navigate('/dashboard/results/approvals')}>
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Pending Approvals</p>
                    <p className="text-3xl font-black tabular-nums">{pendingCount}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/20 text-white shadow-lg group-hover:scale-110 transition-transform">
                    <ShieldAlert size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-xl rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-300 bg-indigo-600 text-white group cursor-pointer" onClick={() => navigate('/dashboard/results/search')}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Search & Print</p>
                  <p className="text-2xl font-black tabular-nums">Verification</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/20 text-white shadow-lg group-hover:scale-110 transition-transform">
                  <Search size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
            <ArrowRight size={16} className="text-emerald-500" />
            Operational Workflows
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.filter(a => a.show).slice(0, 3).map((action, idx) => (
              <Link key={idx} to={action.link} className="group h-full">
                <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white hover:bg-slate-900 transition-all duration-500 group-hover:-translate-y-2 h-full">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className={`w-12 h-12 rounded-2xl ${action.iconBg} text-white flex items-center justify-center mb-6 shadow-lg shadow-inner`}>
                      <action.icon size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-white transition-colors tracking-tight">
                      {action.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 group-hover:text-slate-400 mt-2 transition-colors flex-grow">
                      {action.desc}
                    </p>
                    {action.extraAction && (
                      <button
                        onClick={action.extraAction.onClick}
                        className="mt-6 w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-blue-100"
                      >
                        <action.extraAction.icon size={14} />
                        {action.extraAction.label}
                      </button>
                    )}
                    {!action.extraAction && <div className="mt-6 h-[38px]"></div>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {getUserRole() === 'admin' && (
          <div className="mb-10">
            <MarkApprovalConsole />
          </div>
        )}

        {/* Active Job Results Management - TABLE VIEW */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <LayoutDashboard size={16} className="text-indigo-500" />
              Job Management Console
            </h2>

            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Search jobs or advertisements..."
                className="w-full bg-white border border-slate-200 rounded-2xl py-2 px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Plus size={16} className="rotate-45" />
              </div>
            </div>
          </div>

          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Advertisement</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Job Designation</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Current Stage</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fetchingJobs ? (
                    [1, 2, 3].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan="4" className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                      </tr>
                    ))
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        No active jobs found for result management
                      </td>
                    </tr>
                  ) : (
                    jobs.flatMap(adv => {
                      const filteredJobs = (adv.job_details || adv.jobDetails || []).filter(job =>
                        job.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        adv.adv_number.toLowerCase().includes(searchTerm.toLowerCase())
                      );

                      return filteredJobs.map(job => (
                        <tr key={job.hash_id || job.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">#{adv.adv_number}</p>
                            <p className="text-xs font-bold text-slate-500">{adv.title || 'General Recruitment'}</p>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                              {job.designation}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Scale: BPS-{job.scale}</p>
                          </td>
                          <td className="px-6 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 ${job.result_status === 'Published' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                              job.result_status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                job.result_status === 'Under Verification' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  job.result_status === 'Uploaded' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                    'bg-slate-100 text-slate-500'
                              }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${job.result_status === 'Published' ? 'bg-purple-600' :
                                job.result_status === 'Approved' ? 'bg-emerald-600' :
                                  job.result_status === 'Under Verification' ? 'bg-amber-600' :
                                    job.result_status === 'Uploaded' ? 'bg-blue-600' :
                                      'bg-slate-400'
                                }`}></div>
                              {job.result_status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(!job.result_status || job.result_status === 'Pending' || job.result_status === 'Uploaded') && (
                                <div className="flex items-center gap-2">
                                  <Link to={`/dashboard/results/import/${getJobRouteId(job)}`}>
                                    <Button variant="ghost" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Bulk Import CSV">
                                      <FileSpreadsheet size={18} />
                                    </Button>
                                  </Link>
                                  <Link to={`/dashboard/results/view/${getJobRouteId(job)}`}>
                                    <Button className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 transition-all flex items-center gap-2 group-hover:scale-105">
                                      Manage Results
                                      <ArrowRight size={14} strokeWidth={3} />
                                    </Button>
                                  </Link>
                                </div>
                              )}

                              {(job.result_status === 'Under Verification') && (
                                <Button
                                  onClick={() => handleVerify(job)}
                                  className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-100 transition-all flex items-center gap-2"
                                >
                                  <CheckCircle2 size={14} strokeWidth={3} />
                                  Approve & Verify
                                </Button>
                              )}

                              {(job.result_status === 'Approved') && (
                                <Button
                                  onClick={() => handleOpenPublish(job)}
                                  className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                                >
                                  <Send size={14} strokeWidth={3} />
                                  Official Publication
                                </Button>
                              )}

                              {(job.result_status === 'Published') && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleDownloadGazette(job)}
                                  className="h-10 px-6 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                  <FileText size={14} />
                                  View Gazette
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing {jobs.length} Advertisements
              </p>
              <div className="flex gap-2">
                {/* Pagination Controls could go here */}
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
              <History size={16} className="text-blue-500" />
              Latest Import Activities
            </h2>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
              <div className="p-8 space-y-6">
                {historyLoading ? (
                  /* Loading Skeletons */
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-slate-100 rounded"></div>
                          <div className="w-24 h-2 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                      <div className="w-16 h-6 bg-slate-100 rounded-full"></div>
                    </div>
                  ))
                ) : importHistory.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No recent import activity</p>
                  </div>
                ) : (
                  importHistory.map((item, i) => (
                    <div key={item.id || i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${item.status === 'completed' || item.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          <FileSpreadsheet size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{item.filename || item.file}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            {item.processed_rows || item.rows || 0} rows processed • {item.created_at_human || item.time || 'Just now'}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'completed' || item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {item.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600">
                  View Full Audit Log
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-500" />
              Critical Alerts
            </h2>
            <Card className="border-none shadow-xl bg-rose-600 text-white rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ClipboardCheck size={20} />
                </div>
                <h4 className="font-black uppercase tracking-tight">Pending Approval</h4>
              </div>
              <p className="text-xs font-bold text-rose-100 leading-relaxed">
                Requisition #5021 (Medical Specialist) has merit ranks ready but is pending Director's final gazette signature.
              </p>
              <Button className="w-full bg-white text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest py-3">
                Review Now
              </Button>
            </Card>

            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-3">
              <h5 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">System Health</h5>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-xs font-bold text-emerald-700">All ranking engines online</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OfficialPublicationModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        job={selectedJob}
        onSuccess={handlePublishSuccess}
      />
    </div>
  );
};

export default ResultsDashboard;
