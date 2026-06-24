import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, PlusCircle, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { useAuth } from 'context/AuthContext';
import DeptRequisitionApi from 'api/deptRequisitionApi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DeptDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, draft: 0, submitted: 0, approved: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await DeptRequisitionApi.getAll(1, 200);
        const list = result?.data?.data ?? result?.data ?? [];
        
        const userDeptName = user?.department?.department_name || user?.department?.name || user?.department_name || '';
        const userDeptId = user?.department_id || user?.department?.hash_id || user?.department?.id || '';

        const filtered = (Array.isArray(list) ? list : []).filter((r) => {
          if (!userDeptName && !userDeptId) return true;
          
          let reqDeptName = '';
          let reqDeptId = '';
          if (r.department && typeof r.department === 'object') {
            reqDeptName = r.department.department_name || r.department.name || '';
            reqDeptId = r.department.hash_id || r.department.id || '';
          } else if (typeof r.department === 'string') {
            reqDeptName = r.department;
          }

          const reqDeptIdDirect = r.department_id || '';

          const matchId = userDeptId && (reqDeptId === userDeptId || reqDeptIdDirect === userDeptId);
          const matchName = userDeptName && reqDeptName.toLowerCase() === userDeptName.toLowerCase();
          
          return matchId || matchName;
        });

        const normalizedList = filtered.map(r => ({
          ...r,
          department: r.department && typeof r.department === 'object'
            ? (r.department.department_name || r.department.name || '-')
            : (r.department || '-')
        }));

        setStats({
          total: normalizedList.length,
          draft: normalizedList.filter((r) => (r.status || '').toLowerCase() === 'draft').length,
          submitted: normalizedList.filter((r) => ['submitted', 'pending'].includes((r.status || '').toLowerCase())).length,
          approved: normalizedList.filter((r) => (r.status || '').toLowerCase() === 'approved').length,
        });
        setRecent(normalizedList.slice(0, 5));
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-emerald-700" />
        <span className="ml-3 text-slate-600 font-medium">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mx-auto space-y-6" style={{ width: '-webkit-fill-available' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome, {user?.dept_user_name || user?.username || user?.full_name || 'Department User'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {user?.department?.department_name || user?.department?.name || user?.department_name || 'Department Requisition Portal'}
            </p>
          </div>
          <Button onClick={() => navigate('/department/requisitions/create')}>
            <PlusCircle size={16} className="mr-2" />
            New Requisition
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total</p>
                  <h2 className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</h2>
                </div>
                <FileText size={28} className="text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700 font-medium">Draft</p>
                  <h2 className="text-3xl font-bold text-amber-900 mt-1">{stats.draft}</h2>
                </div>
                <Clock size={28} className="text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">Submitted</p>
                  <h2 className="text-3xl font-bold text-orange-900 mt-1">{stats.submitted}</h2>
                </div>
                <AlertCircle size={28} className="text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-700 font-medium">Approved</p>
                  <h2 className="text-3xl font-bold text-emerald-900 mt-1">{stats.approved}</h2>
                </div>
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-slate-200">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Draft', value: stats.draft },
                        { name: 'Submitted', value: stats.submitted },
                        { name: 'Approved', value: stats.approved },
                      ].filter((d) => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      paddingAngle={3} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill="#94a3b8" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Requisition Overview</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { name: 'Draft', count: stats.draft, fill: '#94a3b8' },
                    { name: 'Submitted', count: stats.submitted, fill: '#f59e0b' },
                    { name: 'Approved', count: stats.approved, fill: '#10b981' },
                    { name: 'Total', count: stats.total, fill: '#3b82f6' },
                  ]}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {[
                        { fill: '#94a3b8' },
                        { fill: '#f59e0b' },
                        { fill: '#10b981' },
                        { fill: '#3b82f6' },
                      ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Requisitions */}
        <Card className="border border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Recent Requisitions</h3>
              <button
                onClick={() => navigate('/department/requisitions')}
                className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
              >
                View All
              </button>
            </div>

            {recent.length === 0 ? (
              <div className="text-center py-10">
                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No requisitions yet</p>
                <Button className="mt-4" onClick={() => navigate('/department/requisitions/create')}>
                  <PlusCircle size={14} className="mr-2" /> Create Your First Requisition
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 font-semibold text-slate-600">Title</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Department</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r, i) => (
                      <tr
                        key={r.hash_id || r.id || i}
                        className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/department/requisitions/${r.hash_id || r.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {r.job_title || r.designation || 'Untitled'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.department || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            (r.status || '').toLowerCase() === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            (r.status || '').toLowerCase() === 'draft' ? 'bg-slate-100 text-slate-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {r.status || 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeptDashboard;