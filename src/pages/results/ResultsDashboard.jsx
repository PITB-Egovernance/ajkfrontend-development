import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { Menu, MenuItem } from '@mui/material';
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
  FileText,
  Award,
  BarChart2
} from 'lucide-react';
import { useAuth } from 'context/AuthContext';
import { getUserRole } from 'utils/roleUtils';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import toast from 'react-hot-toast';
import { getJobRouteId } from 'utils/jobMapper';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'components/ui/DropdownMenu';
import OfficialPublicationModal from 'components/results/OfficialPublicationModal';
import { formatDate } from 'utils/dateUtils';
import { hasPermission } from 'utils/permissions';
import { fetchAndApplyClubbedGroups } from 'utils/resultsClubbing';

const PERM = 'result.result_publishing'; // permission scope for publishing actions

const confirmWithdraw = () => {
  return new Promise((resolve) => {
    let reasonText = '';
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[320px] p-1 text-left">
        <div>
          <p className="font-bold text-slate-800 text-sm">Emergency Withdrawal</p>
          <p className="text-xs text-slate-500 mt-1">
            Provide a mandatory legal reason for taking these results offline:
          </p>
        </div>
        <textarea
          rows={3}
          placeholder="Enter withdrawal reason..."
          onChange={(e) => { reasonText = e.target.value; }}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              resolve(null);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-105 hover:bg-slate-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const trimmed = reasonText.trim();
              if (!trimmed) {
                toast.error("Withdrawal reason is mandatory.", { id: 'withdraw-validation' });
                return;
              }
              toast.dismiss(t.id);
              resolve(trimmed);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
          >
            Withdraw
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
    });
  });
};

const ActionCell = ({ job, isAdmin, isDirector, userRole, handleOpenPublish, handleDownloadGazette, fetchActiveJobs, getExamTypeParam }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event) => {
    if (event) event.stopPropagation();
    setAnchorEl(null);
  };

  const rId = getJobRouteId(job);
  const isImportable = !['Published', 'PROVISIONAL PUBLISHED', 'FINAL PUBLISHED', 'GAZETTE PUBLISHED'].includes(job.result_status);
  const isShortlistable = ['Approved', 'APPROVED', 'WITHDRAWN'].includes(job.result_status);
  const isGazetteReady = ['Published', 'PROVISIONAL PUBLISHED', 'FINAL PUBLISHED', 'GAZETTE PUBLISHED'].includes(job.result_status);
  const isPublishedState = ['Published', 'PROVISIONAL PUBLISHED', 'FINAL PUBLISHED', 'GAZETTE PUBLISHED'].includes(job.result_status);
  const hasInterviewPermission = isAdmin || isDirector || ['data_entry', 'dataentry', 'senior_admin'].includes(userRole);
  const isInterviewAllowed = isPublishedState && hasInterviewPermission;
  const isWithdrawable = isPublishedState && (isAdmin || isDirector);

  return (
    <div className="flex items-center h-full">
      <Button 
        variant="outline" 
        onClick={handleClick}
        className="h-9 px-3 rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-none"
      >
        Actions <ChevronDown size={14} className="text-slate-450" />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.08))',
            mt: 1,
            minWidth: 180,
            '& .MuiMenuItem-root': {
              fontSize: '12px',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              fontWeight: '500'
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {isImportable ? (
          <MenuItem onClick={() => {
            handleClose();
            const clubbedParam = job.isClubbedGroup ? `&clubbedJobIds=${job.clubbedJobIds.join(',')}` : '';
            navigate(`/dashboard/results/import/${rId}?examType=${getExamTypeParam(job)}${clubbedParam}`);
          }}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 mr-2" />
            Import Marks (CSV)
          </MenuItem>
        ) : (
          <MenuItem disabled className="opacity-50">
            <FileSpreadsheet className="h-4 w-4 text-slate-400 mr-2" />
            Import Marks (CSV)
          </MenuItem>
        )}

        <MenuItem onClick={() => { handleClose(); navigate(`/dashboard/results/view/${rId}`); }}>
          <ArrowRight className="h-4 w-4 text-slate-400 mr-2" />
          Manage Results
        </MenuItem>

        <MenuItem onClick={() => { handleClose(); navigate(`/dashboard/results/verification`); }}>
          <ArrowRight className="h-4 w-4 text-slate-400 mr-2" />
          Verification Results
        </MenuItem>

        {/* {isShortlistable ? (
          <MenuItem onClick={() => { handleClose(); navigate(`/dashboard/results/shortlist/${rId}`); }}>
            <Send className="h-4 w-4 text-slate-400 mr-2" />
            Prepare Shortlist
          </MenuItem>
        ) : (
          <MenuItem disabled className="opacity-50">
            <Send className="h-4 w-4 text-slate-400 mr-2" />
            Prepare Shortlist
          </MenuItem>
        )} */}

        <div className="my-1 border-t border-slate-105" />

        {/* {isGazetteReady ? (
          <MenuItem onClick={() => { handleClose(); handleDownloadGazette(job); }}>
            <FileText className="h-4 w-4 text-slate-400 mr-2" />
            Official Gazette
          </MenuItem>
        ) : (
          <MenuItem disabled className="opacity-50">
            <FileText className="h-4 w-4 text-slate-400 mr-2" />
            Official Gazette
          </MenuItem>
        )}

        {isInterviewAllowed ? (
          <MenuItem onClick={() => { handleClose(); navigate("/dashboard/award-lists"); }}>
            <LayoutDashboard className="h-4 w-4 text-slate-400 mr-2" />
            Interview Marks
          </MenuItem>
        ) : (
          <MenuItem disabled className="opacity-50">
            <LayoutDashboard className="h-4 w-4 text-slate-400 mr-2" />
            Interview Marks
          </MenuItem>
        )}

        {isWithdrawable ? (
          <MenuItem 
            onClick={async () => {
              handleClose();
              const reason = await confirmWithdraw();
              if (!reason) return;
              try {
                toast.loading('Withdrawing publication...', { id: 'withdraw' });
                await ResultsApi.withdraw(rId, reason);
                toast.success('Publication withdrawn', { id: 'withdraw' });
                fetchActiveJobs();
              } catch (err) {
                toast.error('Withdrawal failed', { id: 'withdraw' });
              }
            }}
            className="text-rose-600 hover:text-rose-700"
          >
            <ShieldAlert className="h-4 w-4 text-rose-500 mr-2" />
            Withdraw Gazette
          </MenuItem>
        ) : (
          <MenuItem disabled className="opacity-50">
            <ShieldAlert className="h-4 w-4 text-slate-400 mr-2" />
            Withdraw Gazette
          </MenuItem>
        )} */}
      </Menu>
    </div>
  );
};

const ResultsDashboard = () => {
  const { user } = useAuth();
  const userRole = getUserRole(user);

  const isAdmin = ['admin', 'chairman', 'secretary'].includes(userRole);
  const isDirector = ['director', 'admin', 'chairman', 'secretary'].includes(userRole);

  // Action-level permission for the current role (publish = verify_result on publishing).
  const canPublish = hasPermission(`${PERM}.verify_result`);

  const [pendingCount, setPendingCount] = useState(0);

  const getExamTypeParam = (job) => {
    const category = job.resolved_test_type_exam_category || job.pivot?.test_type_exam_category || '';
    if (category === 'one_paper_mcq') return 'one-paper-mcqs';
    if (category === 'two_paper_mcq') return 'two-paper-mcqs';
    if (category === 'written_exam') return 'written-exams';
    if (category === 'combined_competitive_exam') return 'cce-exams';
    return '';
  };

  const [stats, setStats] = useState([
    { label: 'Total Results Entered', value: '0', icon: Database, bg: 'bg-blue-50', iconBg: 'bg-blue-600' },
    { label: 'Pending Publication', value: '0', icon: ClipboardCheck, bg: 'bg-amber-50', iconBg: 'bg-amber-600' },
    { label: 'Published Results', value: '0', icon: Send, bg: 'bg-emerald-50', iconBg: 'bg-emerald-600' },
  ]);

  const [allJobRows, setAllJobRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchingJobs, setFetchingJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeDropdownJobId, setActiveDropdownJobId] = useState(null);

  const fetchActiveJobs = async () => {
    setFetchingJobs(true);
    try {
      const res = await AdvertisementApi.getAll(1, { results_only: true });
      const advertisements = res.data?.data || res.data || [];

      // This list spans all four exam types at once (unlike the per-category
      // One Paper/Two Paper/Written/CCE result pages), so clubbing is
      // resolved per exam-type bucket and merged — see fetchAndApplyClubbedGroups.
      const flatJobs = advertisements.flatMap((adv) =>
        (adv.job_details || adv.jobDetails || []).map((job) => ({ ...job, adv }))
      );
      try {
        setAllJobRows(await fetchAndApplyClubbedGroups(ResultsApi, flatJobs));
      } catch {
        setAllJobRows(flatJobs); // clubbing info is a display enhancement — fall back to ungrouped rows
      }
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
    }
  };

  const fetchStats = async () => {
    try {
      const res = await ResultsApi.getStats();
      if (res.data) {
        setStats(prev => prev.map(s => {
          if (s.label === 'Total Results Entered') return { ...s, value: res.data.total_entered };
          if (s.label === 'Pending Publication') return { ...s, value: res.data.pending_publication };
          if (s.label === 'Published Results') return { ...s, value: res.data.published_results || 0 };
          return s;
        }));
        // Update awaiting-verification card from the same stats call
        setPendingCount(res.data.under_verification ?? 0);
      }
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchActiveJobs();
    fetchImportHistory();
    fetchStats();
  }, [isAdmin]);

  const handleOpenPublish = (job) => {
    setSelectedJob(job);
    setPublishModalOpen(true);
  };

  const handlePublishSuccess = () => {
    setPublishModalOpen(false);
    fetchActiveJobs();
    toast.success('Results published successfully!');
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
      title: 'Verification Queue',
      desc: 'Review & approve candidate results',
      link: '/dashboard/results/verification',
      icon: ShieldAlert,
      iconBg: 'bg-indigo-600',
      show: isAdmin
    },
    // {
    //   title: 'Statistical Summary',
    //   desc: 'Pass %, score distribution, toppers & category breakdown',
    //   link: '/dashboard/results/statistical-summary',
    //   icon: BarChart2,
    //   iconBg: 'bg-emerald-600',
    //   show: isAdmin
    // },
    // {
    //   title: 'Audit Trail Report',
    //   desc: 'Chronological vigilance log of mark uploads, changes & approvals',
    //   link: '/dashboard/results/audit-trail',
    //   icon: History,
    //   iconBg: 'bg-slate-700',
    //   show: isAdmin
    // },
    // {
    //   title: 'Scrutiny & Rechecking',
    //   desc: 'Verify, review & resolve candidate paper recounting appeals',
    //   link: '/dashboard/results/scrutiny',
    //   icon: ClipboardCheck,
    //   iconBg: 'bg-amber-600',
    //   show: isAdmin
    // },
    // {
    //   title: 'Award Lists',
    //   desc: 'View, track & manage final candidate recommendation and merit award lists',
    //   link: '/dashboard/award-lists',
    //   icon: Award,
    //   iconBg: 'bg-blue-600',
    //   show: isAdmin
    // }
  ];

  const columns = useMemo(() => [
    {
      field: 'advertisement',
      headerName: 'Advertisement',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <div className="py-2">
          <p className="text-xs font-semibold text-slate-500 mb-0.5">#{params.row.adv?.adv_number}</p>
          <p className="text-xs text-slate-450">{params.row.adv?.title || 'General Recruitment'}</p>
        </div>
      )
    },
    {
      field: 'designation',
      headerName: 'Job Designation',
      flex: 2,
      minWidth: 250,
      renderCell: (params) => (
        <div className="py-2">
          <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-650 transition-colors">
            {params.row.designation}
          </p>
          <p className="text-xs text-slate-400">Scale: BPS-{params.row.scale}</p>
        </div>
      )
    },
    {
      field: 'result_status',
      headerName: 'Current Stage',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => {
        const status = params.value || 'Pending';
        let badgeClass = 'bg-slate-100 text-slate-500 border border-slate-200';
        let dotClass = 'bg-slate-400';

        if (status === 'Published' || status === 'PROVISIONAL PUBLISHED') {
          badgeClass = 'bg-purple-50 text-purple-600 border border-purple-100';
          dotClass = 'bg-purple-600';
        } else if (status === 'FINAL PUBLISHED') {
          badgeClass = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
          dotClass = 'bg-indigo-600';
        } else if (status === 'GAZETTE PUBLISHED') {
          badgeClass = 'bg-pink-50 text-pink-600 border border-pink-100';
          dotClass = 'bg-pink-600';
        } else if (status === 'Approved' || status === 'APPROVED') {
          badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
          dotClass = 'bg-emerald-600';
        } else if (status === 'Under Verification' || status === 'PENDING IMPORT') {
          badgeClass = 'bg-amber-50 text-amber-600 border border-amber-100';
          dotClass = 'bg-amber-600';
        } else if (status === 'Uploaded') {
          badgeClass = 'bg-blue-50 text-blue-600 border border-blue-100';
          dotClass = 'bg-blue-600';
        } else if (status === 'WITHDRAWN') {
          badgeClass = 'bg-rose-50 text-rose-600 border border-rose-100';
          dotClass = 'bg-rose-600';
        }

        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 ${badgeClass}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></div>
            {status}
          </span>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const job = params.row;
        return (
          <ActionCell 
            job={job}
            isAdmin={isAdmin}
            isDirector={isDirector}
            userRole={userRole}
            handleOpenPublish={handleOpenPublish}
            handleDownloadGazette={handleDownloadGazette}
            fetchActiveJobs={fetchActiveJobs}
            getExamTypeParam={getExamTypeParam}
          />
        );
      }
    }
  ], [isAdmin, isDirector, userRole]);

  return (
    <div className="min-h-screen p-2">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Results Module</h1>
            <p className="text-sm text-slate-500 mt-1">AJK Public Service Commission</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.iconBg} text-white`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {isAdmin && (
            <Card className="border border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Awaiting Verification</p>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">{pendingCount}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500 text-white">
                    <ShieldAlert className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Featured Workflows</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quickActions.filter(a => a.show).map((action, idx) => (
              <Link key={idx} to={action.link}>
                <Card className="border border-slate-200 hover:border-slate-300 transition-all h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${action.iconBg} text-white`}>
                        <action.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-sm">{action.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div> */}



        {/* Active Job Results Management - TABLE VIEW */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">Job Listings</h2>

            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Search jobs or advertisements..."
                className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-4 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            {(() => {
              const q = searchTerm.toLowerCase();
              const filteredRows = allJobRows
                .filter((job) =>
                  (job.designation || '').toLowerCase().includes(q) ||
                  (job.adv?.adv_number || '').toLowerCase().includes(q)
                )
                .map((job, idx) => ({ ...job, id: job.hash_id || job.id || `${job.adv?.adv_number}-${idx}` }));

              return (
                <TooltipDataGrid
                  rows={filteredRows}
                  columns={columns}
                  autoHeight
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                  loading={fetchingJobs}
                  disableRowSelectionOnClick
                  sx={{
                    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                    '& .MuiDataGrid-row': { minHeight: '52px !important' }
                  }}
                />
              );
            })()}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <History size={16} className="text-blue-500" />
              Latest Import Activities
            </h2>

            <Card className="border border-slate-200 bg-white overflow-hidden">
              <CardContent className="p-4 divide-y divide-slate-100">
                {historyLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between py-3 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-3.5 bg-slate-100 rounded"></div>
                          <div className="w-24 h-2 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                      <div className="w-16 h-5 bg-slate-100 rounded-full"></div>
                    </div>
                  ))
                ) : importHistory.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No recent import activity</p>
                  </div>
                ) : (
                  importHistory.map((item, i) => (
                    <div key={item.id || i} className="flex items-center justify-between py-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.status === 'completed' || item.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.job_detail?.designation || 'System Import'}</p>
                          <p className="text-xs text-slate-500">
                            {item.total_rows || 0} Candidates processed • {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${item.status === 'completed' || item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.status?.replace('_', ' ') || 'Pending'}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
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
