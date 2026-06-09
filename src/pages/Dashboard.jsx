import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from 'components/ui/Card';
import { useAuth } from 'context/AuthContext';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import ApplicationApi from 'api/applicationApi';
import {
  FileText, Megaphone, Briefcase, Users, Clock, CheckCircle2,
  BarChart3, PieChart, Send, Settings, Plus, Award, ArrowRight, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart,
} from 'recharts';

const API_BASE           = Config.apiUrl;
const API_KEY            = Config.apiKey;
const CANDIDATE_API_BASE = Config.candidateApiUrl;
const CANDIDATE_API_KEY  = Config.candidateApiKey;

const getAdminHeaders     = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'X-API-KEY': API_KEY,
});
const getCandidateHeaders = () => ({
  Accept: 'application/json',
  'X-API-KEY': CANDIDATE_API_KEY,
});

const extractTotal = (json) => {
  if (!json) return null;
  const d = json?.data;
  if (typeof d?.total === 'number') return d.total;
  if (typeof json?.meta?.total === 'number') return json.meta.total;
  if (typeof json?.total === 'number') return json.total;
  if (Array.isArray(d)) return d.length;
  if (Array.isArray(d?.data)) return d.total ?? d.data.length;
  return null;
};

const STATUS_COLORS = {
  Pending:   '#f59e0b',
  Active:    '#10b981',
  Approved:  '#3b82f6',
  Rejected:  '#ef4444',
  Completed: '#8b5cf6',
};

const AD_STATUS_COLORS = {
  Active: '#10b981',
  Closed: '#ef4444',
};

const isAdActive = (ad) => {
  const status = (ad?.status?.name ?? ad?.status ?? '').toString().toLowerCase().trim();
  if (status === 'closed' || status === 'expired' || status === 'draft') return false;
  if (ad?.closing_date) {
    const d = new Date(ad.closing_date);
    if (!isNaN(d.getTime())) return d > new Date();
  }
  return status === 'published' || status === 'active' || status === '';
};

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
};

const StatSkeleton = () => (
  <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
);

const EmptyChart = ({ message }) => (
  <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">{message}</div>
);

const Dashboard = () => {
  useAuth();
  const [draftMeta,     setDraftMeta]     = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [liveStats,     setLiveStats]     = useState({
    totalApplicants: null, totalRequisitions: null,
    totalAdvertisements: null, pendingApprovals: null,
  });
  const [reqStatusChart, setReqStatusChart] = useState([]);
  const [dispatchChart,  setDispatchChart]  = useState([]);
  const [overviewChart,  setOverviewChart]  = useState([]);
  const [appTrendsChart, setAppTrendsChart] = useState([]);
  const [adStatusChart,  setAdStatusChart]  = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('requisitionDraftMeta');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.temp_id) setDraftMeta(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Generic pagination fetcher — handles APIs that ignore per_page
    const fetchAllPages = async (path) => {
      const first = await fetch(`${API_BASE}${path}?page=1`, { headers: getAdminHeaders() }).then(r => r.json());
      if (!first?.success) return { total: null, items: [] };
      const total       = first?.data?.total ?? 0;
      let items         = first?.data?.data ?? [];
      const perPage     = first?.data?.per_page ?? (items.length || 10);
      const apiLast     = first?.data?.last_page;
      const lastPage    = (apiLast && apiLast > 0)
        ? apiLast
        : (total > 0 && perPage > 0 ? Math.ceil(total / perPage) : 1);

      if (lastPage > 1) {
        const restPromises = [];
        for (let p = 2; p <= lastPage; p++) {
          restPromises.push(
            fetch(`${API_BASE}${path}?page=${p}`, { headers: getAdminHeaders() })
              .then(r => r.json())
              .then(j => j?.data?.data ?? [])
              .catch(() => [])
          );
        }
        const rest = await Promise.all(restPromises);
        items = items.concat(...rest);
      }
      return { total, items };
    };

    const fetchAll = async () => {
      setStatsLoading(true);

      const [appR, pscReqR, advR, recR, sentR] = await Promise.allSettled([
        ApplicationApi.getAll({ per_page: 1000 }),
        fetchAllPages('/psc/requisitions'),
        fetchAllPages('/advertisements'),
        fetch(`${API_BASE}/dispatch/received-forms?per_page=1`,   { headers: getAdminHeaders() }).then(r => r.json()),
        fetch(`${API_BASE}/dispatch/dispatched-forms?per_page=1`, { headers: getAdminHeaders() }).then(r => r.json()),
      ]);

      // ── Application Trends: applications vs shortlisted, all 12 months ──
      if (appR.status === 'fulfilled') {
        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthly = MONTH_NAMES.map((m) => ({ month: m, applications: 0, shortlisted: 0 }));
        const appList = appR.value?.data?.data ?? appR.value?.data ?? [];
        if (Array.isArray(appList)) {
          appList.forEach((app) => {
            const dateStr = app.submitted_at || app.created_at;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return;
            const idx = d.getMonth();
            monthly[idx].applications += 1;
            const adminStatus = (app._admin_status || '').toString().toLowerCase();
            if (adminStatus === 'shortlisted') monthly[idx].shortlisted += 1;
          });
        }
        setAppTrendsChart(monthly);
      }

      // ── PSC Requisitions: total + pending count + status chart from full list ──
      let totalRequisitions = null;
      let pendingCount      = null;
      if (pscReqR.status === 'fulfilled') {
        totalRequisitions = pscReqR.value.total;
        const items = pscReqR.value.items;
        if (items.length > 0) {
          const counts = items.reduce((acc, r) => {
            // Match PSC table: empty/null status defaults to 'Pending'
            const raw = (r.status?.name ?? r.status ?? '').toString().trim() || 'Pending';
            const s   = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {});
          pendingCount = counts['Pending'] ?? 0;
          setReqStatusChart(
            Object.entries(counts).map(([name, value]) => ({
              name, value, color: STATUS_COLORS[name] || '#94a3b8',
            }))
          );
        }
      }

      // ── Advertisements: total + status pie chart from full list ──
      let totalAds = null;
      if (advR.status === 'fulfilled') {
        totalAds = advR.value.total;
        const items = advR.value.items;
        if (items.length > 0) {
          let active = 0;
          let closed = 0;
          items.forEach((ad) => {
            if (isAdActive(ad)) active += 1;
            else closed += 1;
          });
          setAdStatusChart([
            { name: 'Active', value: active, color: AD_STATUS_COLORS.Active },
            { name: 'Closed', value: closed, color: AD_STATUS_COLORS.Closed },
          ].filter((s) => s.value > 0));
        }
      }

      // ── Dispatch overview chart ──
      const recTotal  = recR.status  === 'fulfilled' ? (extractTotal(recR.value)  ?? 0) : 0;
      const sentTotal = sentR.status === 'fulfilled' ? (extractTotal(sentR.value) ?? 0) : 0;
      setDispatchChart([
        { label: 'Received', count: recTotal  },
        { label: 'Sent',     count: sentTotal },
      ]);

      // ── Overview bar chart ──
      const appTotal = appR.status === 'fulfilled' ? (extractTotal(appR.value) ?? 0) : 0;
      setOverviewChart([
        { module: 'Applications',    count: appTotal              },
        { module: 'Requisitions',    count: totalRequisitions ?? 0 },
        { module: 'Advertisements',  count: totalAds ?? 0          },
        { module: 'Disp. Received',  count: recTotal              },
        { module: 'Disp. Sent',      count: sentTotal             },
      ]);

      setLiveStats({
        totalApplicants:     appR.status === 'fulfilled' ? extractTotal(appR.value) : null,
        totalRequisitions,
        totalAdvertisements: totalAds,
        pendingApprovals:    pendingCount,
      });
      setStatsLoading(false);
    };

    fetchAll();
  }, []);

  const fmt = (v) => (v == null ? '–' : Number(v).toLocaleString());

  const statCards = [
    { label: 'Total Requisitions',  value: liveStats.totalRequisitions,   icon: Briefcase,    iconBg: 'bg-emerald-500' },
    { label: 'Pending Requisitions',value: liveStats.pendingApprovals,    icon: Clock,        iconBg: 'bg-amber-500'   },
    { label: 'Advertisements',      value: liveStats.totalAdvertisements, icon: CheckCircle2, iconBg: 'bg-blue-500'    },
    { label: 'Total Applicants',    value: liveStats.totalApplicants,     icon: Users,        iconBg: 'bg-purple-500'  },
  ];

  const quickActions = [
    { icon: FileText, title: 'Requisitions',   link: '/dashboard/requisitions',          iconBg: 'bg-emerald-500', count: statsLoading ? '…' : `${fmt(liveStats.totalRequisitions)} total`       },
    { icon: Megaphone,title: 'Advertisements', link: '/dashboard/advertisement-records', iconBg: 'bg-amber-500',   count: statsLoading ? '…' : `${fmt(liveStats.totalAdvertisements)} published` },
    { icon: Award,    title: 'Award Lists',    link: '/dashboard/award-lists',           iconBg: 'bg-indigo-500',  count: 'Merit Lists'                                                            },
  ];

  const quickLinks = [
    { label: 'Candidates', icon: Users,     link: '/dashboard/applications',          iconBg: 'bg-emerald-500' },
    { label: 'Dispatch',   icon: Send,      link: '/dashboard/dispatch/received',     iconBg: 'bg-blue-500'    },
    { label: 'Submitted Requisitions',  icon: BarChart3, link: '/dashboard/psc-table',             iconBg: 'bg-purple-500'  },
    { label: 'Requisitions',    icon: PieChart,  link: '/dashboard/requisitions',          iconBg: 'bg-amber-500'   },
    { label: 'Approved Requisitions',  icon: Award,     link: '/dashboard/approved-requisitions', iconBg: 'bg-rose-500'    },
    { label: 'Settings',   icon: Settings,  link: '/dashboard/settings',             iconBg: 'bg-slate-500'   },
  ];

  return (
    <div className="min-h-screen p-2">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">AJK Public Service Commission</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                    {statsLoading
                      ? <StatSkeleton />
                      : <p className="text-2xl font-bold text-slate-900">{fmt(stat.value)}</p>
                    }
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Featured Modules</h2>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link key={action.title} to={action.link}>
                  <Card className="border border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${action.iconBg}`}>
                          <action.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 text-sm">{action.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{action.count}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Quick Shortcuts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickLinks.map((link) => (
                <Link key={link.label} to={link.link}>
                  <Card className="border border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center">
                        <div className={`p-3 rounded-lg ${link.iconBg} mb-3`}>
                          <link.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">{link.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Application Trends — full-width row */}
          <Card className="border border-slate-200 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Application Trends</h3>
                  <p className="text-xs text-slate-500 mt-1">Monthly applications & shortlisted</p>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              {statsLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : appTrendsChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={appTrendsChart}>
                    <defs>
                      <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gShortlisted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="applications" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gApp)"  name="Applications" />
                    <Area type="monotone" dataKey="shortlisted"  stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gShortlisted)" name="Shortlisted" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No application data yet" />}
            </CardContent>
          </Card>

          {/* System Overview — real data */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">System Overview</h3>
                  <p className="text-xs text-slate-500 mt-1">Live counts across all modules</p>
                </div>
                <BarChart3 className="w-5 h-5 text-emerald-500" />
              </div>
              {statsLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : overviewChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={overviewChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="module" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#10b981" name="Count" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No data available" />}
            </CardContent>
          </Card>

          {/* Dispatch Overview — real data */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Dispatch Overview</h3>
                  <p className="text-xs text-slate-500 mt-1">Received vs sent</p>
                </div>
                <Send className="w-5 h-5 text-blue-500" />
              </div>
              {statsLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dispatchChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Documents" radius={[8, 8, 0, 0]}>
                      <Cell fill="#3b82f6" />
                      <Cell fill="#06b6d4" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Requisition Status — real data */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Requisition Status</h3>
                  <p className="text-xs text-slate-500 mt-1">Live status breakdown</p>
                </div>
                <PieChart className="w-5 h-5 text-amber-500" />
              </div>
              {statsLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reqStatusChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RechartPieChart>
                    <Pie
                      data={reqStatusChart}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {reqStatusChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </RechartPieChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No requisition data" />}
            </CardContent>
          </Card>

          {/* Advertisement Status — real data */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Advertisement Status</h3>
                  <p className="text-xs text-slate-500 mt-1">Active vs Closed</p>
                </div>
                <Megaphone className="w-5 h-5 text-purple-500" />
              </div>
              {statsLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : adStatusChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RechartPieChart>
                    <Pie
                      data={adStatusChart}
                      cx="50%" cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      dataKey="value"
                    >
                      {adStatusChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </RechartPieChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No advertisement data" />}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
