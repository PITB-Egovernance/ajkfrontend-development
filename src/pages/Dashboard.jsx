import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from 'components/ui/Card';
import { useAuth } from 'context/AuthContext';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import ApplicationApi from 'api/applicationApi';
import { isAdminUser, hasModuleAccess, hasAnyModuleAccess } from 'utils/permissions';
import {
  Megaphone, Briefcase, Users, Clock, CheckCircle2,
  BarChart3, PieChart, Settings, Plus, Award,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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
  const effectiveClosingDate = ad?.extend_date || ad?.closing_date;
  if (effectiveClosingDate) {
    const d = new Date(effectiveClosingDate);
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
    approvedRequisitions: null, rejectedRequisitions: null,
    totalPostsApproved: null,
  });
  const [reqStatusChart, setReqStatusChart] = useState([]);
  const [overviewChart,  setOverviewChart]  = useState([]);
  const [adStatusChart,  setAdStatusChart]  = useState([]);
  const [summaryChart,   setSummaryChart]   = useState([]);

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

      const [appR, pscReqR, advR] = await Promise.allSettled([
        ApplicationApi.getAll({ per_page: 1000 }),
        fetchAllPages('/psc/requisitions'),
        fetchAllPages('/advertisements'),
      ]);

      // ── PSC Requisitions: total + status counts + status chart from full list ──
      let totalRequisitions = null;
      let pendingCount      = null;
      let approvedCount     = null;
      let rejectedCount     = null;
      let totalPostsApproved = null;
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
          pendingCount  = counts['Pending']  ?? 0;
          approvedCount = counts['Approved'] ?? 0;
          rejectedCount = counts['Rejected'] ?? 0;
          setReqStatusChart(
            Object.entries(counts).map(([name, value]) => ({
              name, value, color: STATUS_COLORS[name] || '#94a3b8',
            }))
          );

          // Total posts (vacancies) requested across approved requisitions
          totalPostsApproved = items.reduce((sum, r) => {
            const raw = (r.status?.name ?? r.status ?? '').toString().trim().toLowerCase();
            if (raw !== 'approved') return sum;
            return sum + (Number(r.num_posts) || 0);
          }, 0);
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

      // ── Overview bar chart ──
      const appTotal = appR.status === 'fulfilled' ? (extractTotal(appR.value) ?? 0) : 0;
      setOverviewChart([
        { module: 'Applications',    count: appTotal              },
        { module: 'Requisitions',    count: totalRequisitions ?? 0 },
        { module: 'Advertisements',  count: totalAds ?? 0          },
      ]);

      const totalCandidates = appR.status === 'fulfilled' ? extractTotal(appR.value) : null;
      setLiveStats({
        totalApplicants:      totalCandidates,
        totalRequisitions,
        totalAdvertisements:  totalAds,
        pendingApprovals:     pendingCount,
        approvedRequisitions: approvedCount,
        rejectedRequisitions: rejectedCount,
        totalPostsApproved,
      });

      // ── Recruitment summary chart: the 5 headline counts side by side ──
      setSummaryChart([
        { label: 'Candidates',    count: totalCandidates ?? 0,    color: '#8b5cf6' },
        { label: 'Posts Approved',count: totalPostsApproved ?? 0, color: '#0ea5e9' },
        { label: 'Requisitions',  count: totalRequisitions ?? 0,  color: '#10b981' },
        { label: 'Approved',      count: approvedCount ?? 0,      color: '#3b82f6' },
        { label: 'Rejected',      count: rejectedCount ?? 0,      color: '#ef4444' },
      ]);

      setStatsLoading(false);
    };

    fetchAll();
  }, []);

  const fmt = (v) => (v == null ? '–' : Number(v).toLocaleString());

  // Permission gating — admin sees all; others only what their role allows.
  const dashAdmin = isAdminUser();
  const canShow = (m) => dashAdmin || (m && hasModuleAccess(m));
  const canShowAny = (mods) => dashAdmin || hasAnyModuleAccess(mods);

  // Each chart is tied to the main module(s) that own its data, so the graphs
  // shown adapt to the role's allowed modules (admin sees them all).
  const charts = {
    summary:    canShowAny(['requisitions', 'candidates']),
    overview:   canShowAny(['requisitions', 'advertisement', 'candidates', 'result']),
    reqStatus:  canShow('requisitions'),
    adStatus:   canShow('advertisement'),
  };
  const anyChartVisible = Object.values(charts).some(Boolean);

  // System Overview aggregates several modules — only count the ones the role can see.
  const OVERVIEW_MODULE_MAP = {
    'Applications':   'candidates',
    'Requisitions':   'requisitions',
    'Advertisements': 'advertisement',
  };
  const visibleOverviewChart = overviewChart.filter((o) => canShow(OVERVIEW_MODULE_MAP[o.module]));

  const statCards = [
    { label: 'Total Candidates',      value: liveStats.totalApplicants,      icon: Users,        iconBg: 'bg-purple-500',  module: 'candidates',    link: '/dashboard/roll-numbers'          },
    { label: 'Total Requisitions',    value: liveStats.totalRequisitions,    icon: Briefcase,    iconBg: 'bg-emerald-500', module: 'requisitions',  link: '/dashboard/requisitions'          },
    { label: 'Pending Requisitions',  value: liveStats.pendingApprovals,     icon: Clock,        iconBg: 'bg-amber-500',   module: 'requisitions',  link: '/dashboard/psc-table'             },
    { label: 'Approved Requisitions', value: liveStats.approvedRequisitions, icon: CheckCircle2, iconBg: 'bg-blue-500',    module: 'requisitions',  link: '/dashboard/approved-requisitions' },
    { label: 'Rejected Requisitions', value: liveStats.rejectedRequisitions, icon: Clock,        iconBg: 'bg-rose-500',    module: 'requisitions',  link: '/dashboard/psc-table'             },
    { label: 'Total Posts Approved',  value: liveStats.totalPostsApproved,   icon: Award,        iconBg: 'bg-sky-500',     module: 'requisitions',  link: '/dashboard/approved-requisitions' },
    { label: 'Advertisements',        value: liveStats.totalAdvertisements,  icon: Megaphone,    iconBg: 'bg-indigo-500',  module: 'advertisement', link: '/dashboard/advertisement-records' },
  ].filter((s) => canShow(s.module));

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
            <Link key={stat.label} to={stat.link}>
              <Card className="border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-shadow">
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
            </Link>
          ))}
        </div>

        {/* Charts — each tied to its module; the grid reflows to whatever the role can see */}
        {anyChartVisible && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recruitment Summary — candidates, posts approved & requisition outcomes */}
          {charts.summary && (
          <Card className="border border-slate-200 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Recruitment Summary</h3>
                  <p className="text-xs text-slate-500 mt-1">Candidates, posts & requisition outcomes</p>
                </div>
                <BarChart3 className="w-5 h-5 text-indigo-500" />
              </div>
              {statsLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : summaryChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={summaryChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Count" radius={[8, 8, 0, 0]}>
                      {summaryChart.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart message="No data available" />}
            </CardContent>
          </Card>
          )}

          {/* System Overview — real data */}
          {charts.overview && (
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
              ) : visibleOverviewChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={visibleOverviewChart}>
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
          )}

          {/* Requisition Status — real data */}
          {charts.reqStatus && (
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
          )}

          {/* Advertisement Status — real data */}
          {charts.adStatus && (
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
          )}

        </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
