import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { 
  FileText, 
  Megaphone, 
  BookOpen, 
  Briefcase, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Activity
} from 'lucide-react';

const Dashboard = () => {
  const quickActions = [
    { 
      icon: FileText, 
      title: 'Requisitions', 
      desc: 'Create and review requisition forms',
      count: '24',
      trend: '+12%',
      color: 'emerald',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      link: '/dashboard/requisitions'
    },
    { 
      icon: Megaphone, 
      title: 'Announcements', 
      desc: 'Advertisement records and notices',
      count: '8',
      trend: '+3',
      color: 'amber',
      bgGradient: 'from-amber-50 to-orange-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      link: '/dashboard/advertisements'
    },
    { 
      icon: BookOpen, 
      title: 'Annexures', 
      desc: 'Annex "A" lists and details',
      count: '15',
      trend: 'New',
      color: 'indigo',
      bgGradient: 'from-indigo-50 to-blue-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      link: '/dashboard/annex-a'
    },
  ];

  const stats = [
    { 
      label: 'Total Jobs', 
      value: '142', 
      change: '+12%',
      icon: Briefcase,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: 'up'
    },
    { 
      label: 'Pending Approvals', 
      value: '23', 
      change: '-5%',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      trend: 'down'
    },
    { 
      label: 'Active Requisitions', 
      value: '87', 
      change: '+8%',
      icon: CheckCircle2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: 'up'
    },
    { 
      label: 'Total Applicants', 
      value: '1,245', 
      change: '+18%',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'up'
    },
  ];

  const recentActivity = [
    { title: 'New job posting created', time: '2 hours ago', type: 'success' },
    { title: 'Requisition #2024-45 approved', time: '4 hours ago', type: 'success' },
    { title: 'Advertisement published', time: '5 hours ago', type: 'info' },
    { title: 'Pending approval required', time: '6 hours ago', type: 'warning' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm"
      >
        {/* Classic Pattern Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, #059669 0, #059669 1px, transparent 0, transparent 50%)`,
            backgroundSize: '10px 10px'
          }} />
        </div>
        
        <div className="relative z-10 p-8 md:p-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Classic Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full mb-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-emerald-700">Active Dashboard</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                Public Service Commission
              </h1>
              <p className="text-slate-600 text-base md:text-lg max-w-2xl leading-relaxed mb-6">
                Azad Jammu & Kashmir - Administrative Dashboard for Recruitment Management
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Administrator Access</span>
                </div>
              </div>
            </div>
            
            {/* Logo Section */}
            <div className="hidden md:flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-100 rounded-2xl blur-xl opacity-40" />
                <img 
                  src="/assets/img/favicon/Logo.PNG" 
                  alt="AJ&K PSC"
                  className="relative w-28 h-28 rounded-2xl bg-white border-4 border-slate-100 shadow-lg object-contain p-3"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Border Accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700" />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-slate-200 bg-white group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-transparent rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
              
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor} border border-slate-100 shadow-sm`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                    stat.trend === 'up' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <ArrowUpRight className={`w-3 h-3 ${stat.trend === 'down' ? 'rotate-90' : ''}`} />
                    {stat.change}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                </div>
                
                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.trend === 'up' ? 'bg-green-500' : 'bg-red-500'} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
            whileHover={{ y: -8 }}
          >
            <Card className={`relative overflow-hidden border-0 bg-gradient-to-br ${action.bgGradient} hover:shadow-2xl transition-all duration-300 group cursor-pointer`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/40 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/60 transition-all" />
              
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-4 rounded-2xl ${action.iconBg} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                    <action.icon className={`w-7 h-7 ${action.iconColor}`} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold text-slate-800">{action.count}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${action.iconBg} ${action.iconColor} mt-1`}>
                      {action.trend}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-2">{action.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{action.desc}</p>
                
                <div className="mt-4 flex items-center text-sm font-semibold text-emerald-700 group-hover:text-emerald-800 transition-colors">
                  View Details
                  <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-start gap-3 group hover:bg-slate-50 p-3 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'success' ? 'bg-green-100' : 
                      activity.type === 'warning' ? 'bg-amber-100' : 
                      'bg-blue-100'
                    }`}>
                      {activity.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : activity.type === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Create Job', icon: Briefcase, color: 'emerald' },
                  { label: 'View Reports', icon: FileText, color: 'blue' },
                  { label: 'Manage Users', icon: Users, color: 'purple' },
                  { label: 'Settings', icon: Activity, color: 'slate' },
                ].map((link, index) => (
                  <motion.button
                    key={link.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className={`p-4 rounded-xl bg-${link.color}-50 hover:bg-${link.color}-100 transition-all group border border-${link.color}-100 hover:border-${link.color}-200`}
                  >
                    <link.icon className={`w-6 h-6 text-${link.color}-600 mx-auto mb-2 group-hover:scale-110 transition-transform`} />
                    <p className={`text-xs font-semibold text-${link.color}-700`}>{link.label}</p>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
