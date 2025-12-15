import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { FileText, Megaphone, BookOpen } from 'lucide-react';

const Dashboard = () => {
  const cards = [
    { icon: FileText, title: 'Requisitions', desc: 'Create and review requisition forms', color: 'emerald' },
    { icon: Megaphone, title: 'Announcements', desc: 'Advertisement records and notices', color: 'amber' },
    { icon: BookOpen, title: 'Annexures', desc: 'Annex "A" lists and details', color: 'indigo' },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardHeader>
          <CardTitle>Welcome to AJ&K PSC Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Manage recruitment processes, job requisitions, announcements, and administrative records. Use the sidebar to navigate to different sections.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map(({ icon: Icon, title, desc, color }) => (
          <Card key={title} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className={`p-3 rounded-lg w-fit mb-3 bg-${color}-50`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Jobs', value: '12' },
              { label: 'Pending Approvals', value: '3' },
              { label: 'Active Requisitions', value: '8' },
              { label: 'Users', value: '45' },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 rounded-lg bg-slate-50">
                <div className="text-2xl font-bold text-emerald-600">{value}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
