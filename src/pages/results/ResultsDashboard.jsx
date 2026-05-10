import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Download,
  Plus
} from 'lucide-react';
import { useAuth } from 'context/AuthContext';
import { getUserRole } from 'utils/roleUtils';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import toast from 'react-hot-toast';

/**
 * ResultsDashboard
 * Central landing page for the Results Module with role-based quick actions and metrics
 */

const ResultsDashboard = () => {
  const { user } = useAuth();
  const userRole = getUserRole(user);
  
  const isAdmin = ['admin', 'chairman', 'secretary'].includes(userRole);
  const isDirector = ['director', 'admin'].includes(userRole);

  const [stats, setStats] = useState([
    { label: 'Total Results Entered', value: '0', icon: Database, bg: 'bg-blue-50', iconBg: 'bg-blue-500' },
    { label: 'Pending Publication', value: '0', icon: ClipboardCheck, bg: 'bg-amber-50', iconBg: 'bg-amber-500' },
    { label: 'Published Results', value: '0', icon: Send, bg: 'bg-emerald-50', iconBg: 'bg-emerald-500' },
    { label: 'Bulk Imports (MTD)', value: '0', icon: FileSpreadsheet, bg: 'bg-purple-50', iconBg: 'bg-purple-500' },
  ]);

  const [jobs, setJobs] = useState([]);
  const [fetchingJobs, setFetchingJobs] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
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
    fetchJobs();
  }, []);

  const quickActions = [
    {
      title: 'Manual Mark Entry',
      desc: 'Individual candidate result entry',
      link: '/dashboard/results/mark-entry',
      icon: Plus,
      iconBg: 'bg-emerald-500',
      show: isAdmin
    },
    {
      title: 'Bulk CSV Import',
      desc: 'Batch process results via CSV',
      link: '/dashboard/results/import',
      icon: FileSpreadsheet,
      iconBg: 'bg-blue-500',
      show: isAdmin
    },
    {
      title: 'Award & Interview Entry',
      desc: 'Enter viva voce & final awards',
      link: '/dashboard/results/awards/all', 
      icon: ClipboardCheck,
      iconBg: 'bg-amber-500',
      show: isAdmin
    },
    {
      title: 'Merit Management',
      desc: 'Ranking & candidate rotation',
      link: '/dashboard/results/merit/all',
      icon: LayoutDashboard,
      iconBg: 'bg-indigo-500',
      show: isAdmin || isDirector
    },
    {
      title: 'Publication Control',
      desc: 'Release results & notify candidates',
      link: '/dashboard/results/publish/all',
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
          
          <div className="flex items-center gap-3">
            <Link to="/dashboard/results/search">
              <Button variant="outline" className="h-auto py-3 px-6 border-slate-200 bg-white shadow-sm font-black text-xs uppercase tracking-widest">
                Search All Results
              </Button>
            </Link>
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
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
            <ArrowRight size={16} className="text-emerald-500" />
            Operational Workflows
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.filter(a => a.show).slice(0, 3).map((action, idx) => (
              <Link key={idx} to={action.link} className="group">
                <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white hover:bg-slate-900 transition-all duration-500 group-hover:-translate-y-2">
                  <CardContent className="p-8">
                    <div className={`w-12 h-12 rounded-2xl ${action.iconBg} text-white flex items-center justify-center mb-6 shadow-lg shadow-inner`}>
                      <action.icon size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-white transition-colors tracking-tight">
                      {action.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 group-hover:text-slate-400 mt-2 transition-colors">
                      {action.desc}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Active Job Results Management */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <LayoutDashboard size={16} className="text-indigo-500" />
              Active Job Results Management
            </h2>
          </div>

          {fetchingJobs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="h-48 bg-white rounded-3xl animate-pulse shadow-sm border border-slate-100"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {jobs.flatMap(adv => (adv.job_details || adv.jobDetails || []).map(job => (
                <Card key={job.hash_id || job.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="p-8 bg-slate-900 text-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Adv No: {adv.adv_number}
                          </p>
                          <h3 className="text-xl font-black tracking-tight leading-tight">
                            {job.designation}
                          </h3>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                          {job.status}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-8 grid grid-cols-2 gap-4">
                      <Link to={`/dashboard/results/view/${job.hash_id || job.id}`} className="flex-1">
                        <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                          <Database size={16} className="text-blue-500" />
                          View Results
                        </Button>
                      </Link>
                      <Link to={`/dashboard/results/awards/${job.hash_id || job.id}`} className="flex-1">
                        <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                          <ClipboardCheck size={16} className="text-amber-500" />
                          Award Entry
                        </Button>
                      </Link>
                      <Link to={`/dashboard/results/merit/${job.hash_id || job.id}`} className="flex-1">
                        <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                          <LayoutDashboard size={16} className="text-indigo-500" />
                          Merit List
                        </Button>
                      </Link>
                      <Link to={`/dashboard/results/import/${job.hash_id || job.id}`} className="flex-1">
                        <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                          <FileSpreadsheet size={16} className="text-emerald-500" />
                          Import
                        </Button>
                      </Link>
                      <Link to={`/dashboard/results/publish/${job.hash_id || job.id}`} className="flex-1">
                        <Button variant="outline" className="w-full justify-start gap-3 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                          <Send size={16} className="text-rose-500" />
                          Publish
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )))}
            </div>
          )}
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
                {[
                  { file: 'medical_officers_2024.csv', status: 'completed', rows: 450, time: '2 hours ago' },
                  { file: 'subject_specialist_urdu.csv', status: 'completed', rows: 120, time: '5 hours ago' },
                  { file: 'admin_officer_results.csv', status: 'failed', rows: 0, time: 'Yesterday' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.file}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.rows} rows processed • {item.time}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
                    </div>
                  </div>
                ))}
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
    </div>
  );
};

export default ResultsDashboard;
