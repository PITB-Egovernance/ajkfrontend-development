import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from 'components/ui/Card';
import { 
  Building2, 
  Network, 
  MapPin, 
  Map,
  Briefcase,
  Award,
  Building,
  Users
} from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();

  const settingsModules = [
    // {
    //   icon: Building2,
    //   title: 'Organization Information',
    //   description: 'Manage profile and contact information',
    //   iconBg: 'bg-emerald-500',
    //   link: '/dashboard/settings/organization'
    // },
    // {
    //   icon: Network,
    //   title: 'Organizational Hierarchy',
    //   description: 'Configure departments and structure',
    //   iconBg: 'bg-blue-500',
    //   link: '/dashboard/settings/hierarchy'
    // },
    {
      icon: MapPin,
      title: 'Districts Management',
      description: 'Add and manage district data',
      iconBg: 'bg-amber-500',
      link: '/dashboard/settings/districts'
    },
    // {
    //   icon: Map,
    //   title: 'Tehsils Management',
    //   description: 'Manage tehsil data and districts',
    //   iconBg: 'bg-purple-500',
    //   link: '/dashboard/settings/tehsils'
    // },
    {
      icon: Briefcase,
      title: 'Designations Management',
      description: 'Manage designation and grade assignments',
      iconBg: 'bg-indigo-500',
      link: '/dashboard/settings/designations'
    },
    {
      icon: Award,
      title: 'Grades Management',
      description: 'Configure BPS grade and pay structure',
      iconBg: 'bg-cyan-500',
      link: '/dashboard/settings/grades'
    },
    {
      icon: Building,
      title: 'Companies Management',
      description: 'Manage vendors and service providers',
      iconBg: 'bg-teal-500',
      link: '/dashboard/settings/companies'
    },
    // {
    //   icon: Users,
    //   title: 'Individual Contractors',
    //   description: 'Manage freelance contractors',
    //   iconBg: 'bg-violet-500',
    //   link: '/dashboard/settings/contractors'
    // }
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-8xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure system settings and preferences</p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {settingsModules.map((module) => (
            <Card 
              key={module.title}
              className="border border-slate-200 cursor-pointer"
              onClick={() => navigate(module.link)}
            >
              <CardContent className="p-5">
                <div className="flex flex-col">
                  <div className={`w-12 h-12 ${module.iconBg} rounded-lg flex items-center justify-center mb-4`}>
                    <module.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    {module.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {module.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Settings;
