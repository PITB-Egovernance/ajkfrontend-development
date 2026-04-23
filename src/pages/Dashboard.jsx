import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from 'components/ui/Card';
import { useAuth } from 'context/AuthContext';
import { 
  FileText, 
  Megaphone, 
  BookOpen, 
  Briefcase, 
  Users, 
  Clock,
  CheckCircle2,
  BarChart3,
  PieChart,
  Send,
  Settings,
  Plus,
  Award,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [draftMeta, setDraftMeta] = useState(null);

  useEffect(() => {
    try {
      const rawDraftMeta = localStorage.getItem('requisitionDraftMeta');
      if (!rawDraftMeta) {
        return;
      }

      const parsedDraftMeta = JSON.parse(rawDraftMeta);
      if (parsedDraftMeta?.temp_id) {
        setDraftMeta(parsedDraftMeta);
      }
    } catch (error) {
      console.warn('Unable to load draft metadata:', error);
    }
  }, []);

  const stats = [
    { 
      label: 'Total Jobs', 
      value: '142', 
      icon: Briefcase,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-500'
    },
    { 
      label: 'Pending Approvals', 
      value: '23', 
      icon: Clock,
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-500'
    },
    { 
      label: 'Active Requisitions', 
      value: '87', 
      icon: CheckCircle2,
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-500'
    },
    { 
      label: 'Total Applicants', 
      value: '1,245', 
      icon: Users,
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-500'
    },
  ];

  // Monthly applications data for line chart
  const monthlyApplicationsData = [
    { month: 'Jan', applications: 65, approvals: 45 },
    { month: 'Feb', applications: 78, approvals: 52 },
    { month: 'Mar', applications: 90, approvals: 68 },
    { month: 'Apr', applications: 81, approvals: 60 },
    { month: 'May', applications: 95, approvals: 72 },
    { month: 'Jun', applications: 110, approvals: 85 },
  ];

  // Department wise jobs data for bar chart
  const departmentJobsData = [
    { department: 'Education', jobs: 45, filled: 32 },
    { department: 'Health', jobs: 38, filled: 28 },
    { department: 'Admin', jobs: 28, filled: 22 },
    { department: 'Finance', jobs: 18, filled: 15 },
    { department: 'Technical', jobs: 22, filled: 16 },
  ];

  // Job status distribution for pie chart
  const jobStatusData = [
    { name: 'Active', value: 87, color: '#10b981' },
    { name: 'Pending', value: 23, color: '#f59e0b' },
    { name: 'Completed', value: 32, color: '#3b82f6' },
  ];

  // Application type distribution for pie chart
  const applicationTypeData = [
    { name: 'Teaching', value: 35, color: '#8b5cf6' },
    { name: 'Medical', value: 28, color: '#ec4899' },
    { name: 'Administrative', value: 22, color: '#06b6d4' },
    { name: 'Technical', value: 15, color: '#f97316' },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

  const quickActions = [
    { 
      icon: FileText, 
      title: 'Requisitions', 
      link: '/dashboard/requisitions',
      iconBg: 'bg-emerald-500',
      count: '87 Active'
    },
    { 
      icon: Megaphone, 
      title: 'Advertisements', 
      link: '/dashboard/advertisement-records',
      iconBg: 'bg-amber-500',
      count: '12 Published'
    },
    { 
      icon: BookOpen, 
      title: 'Annexures', 
      link: '/dashboard/annex-a',
      iconBg: 'bg-indigo-500',
      count: '45 Records'
    },
  ];

  const quickLinks = [
    { label: 'Create Job', icon: Plus, link: '/dashboard/job-creation-form', iconBg: 'bg-emerald-500' },
    { label: 'Dispatch', icon: Send, link: '/dashboard/dispatch/received', iconBg: 'bg-blue-500' },
    { label: 'PSC Table', icon: BarChart3, link: '/dashboard/psc-table', iconBg: 'bg-purple-500' },
    { label: 'Reports', icon: PieChart, link: '/dashboard/requisitions', iconBg: 'bg-amber-500' },
    { label: 'Approvals', icon: Award, link: '/dashboard/approved-requisitions', iconBg: 'bg-rose-500' },
    { label: 'Settings', icon: Settings, link: '/dashboard/settings', iconBg: 'bg-slate-500' },
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

          <div className="flex items-center gap-3">
            {draftMeta?.temp_id && (
              <Link to={`/dashboard/requisitions/create?temp_id=${encodeURIComponent(draftMeta.temp_id)}&step=${draftMeta.step || 1}`}>
                <button className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition-all duration-200">
                  <ArrowRight className="w-4 h-4" />
                  Resume Draft
                </button>
              </Link>
            )}

            <Link to="/dashboard/requisitions/create">
              <button className="px-6 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200">
                <Plus className="w-4 h-4" />
                Add New
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
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
          
          {/* Featured Modules */}
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

          {/* Quick Shortcuts */}
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Monthly Applications Trend - Line Chart */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Application Trends</h3>
                  <p className="text-xs text-slate-500 mt-1">Monthly applications & approvals</p>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyApplicationsData}>
                  <defs>
                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorApprovals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorApplications)" 
                    name="Applications"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="approvals" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorApprovals)" 
                    name="Approvals"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Jobs - Bar Chart */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Department-wise Jobs</h3>
                  <p className="text-xs text-slate-500 mt-1">Total vs filled positions</p>
                </div>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={departmentJobsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="department" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="jobs" fill="#3b82f6" name="Total Jobs" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="filled" fill="#10b981" name="Filled" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Job Status Distribution - Pie Chart */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Job Status Distribution</h3>
                  <p className="text-xs text-slate-500 mt-1">Current job status breakdown</p>
                </div>
                <PieChart className="w-5 h-5 text-purple-500" />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RechartPieChart>
                  <Pie
                    data={jobStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {jobStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                </RechartPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Application Type Distribution - Pie Chart */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Application Categories</h3>
                  <p className="text-xs text-slate-500 mt-1">Distribution by job type</p>
                </div>
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RechartPieChart>
                  <Pie
                    data={applicationTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {applicationTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                </RechartPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
