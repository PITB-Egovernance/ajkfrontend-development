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
  Users,
  GitBranch,
  BookOpen,
  ScrollText,
  PenTool,
  UserCog,
  LayoutList,
  ShieldCheck
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
    // },
    {
      icon: GitBranch,
      title: 'Requisition Approval Flow',
      description: 'Configure department approval hierarchy',
      iconBg: 'bg-indigo-500',
      link: '/dashboard/settings/approval-flow'
    },
    {
      icon: BookOpen,
      title: 'Subject Management',
      description: 'Manage subject groups and marks',
      iconBg: 'bg-rose-500',
      link: '/dashboard/settings/subjects'
    },
    {
      icon: Award,
      title: 'Certificates',
      description: 'Manage certificate entries',
      iconBg: 'bg-sky-500',
      link: '/dashboard/settings/certificates'
    },
    {
      icon: ScrollText,
      title: 'Terms & Conditions',
      description: 'Manage terms and conditions entries',
      iconBg: 'bg-violet-500',
      link: '/dashboard/settings/terms-and-conditions'
    },
    {
      icon: PenTool,
      title: 'Digital Signatures',
      description: 'Manage employee digital signature images',
      iconBg: 'bg-emerald-600',
      link: '/dashboard/settings/digital-signatures'
    },
    {
      icon: UserCog,
      title: 'System Settings',
      description: 'View Chairman, Secretary and Super Admin users',
      iconBg: 'bg-slate-700',
      link: '/dashboard/settings/system-settings'
    },
    {
      icon: LayoutList,
      title: 'Wings / Sections',
      description: 'Manage wings and sections hierarchy',
      iconBg: 'bg-indigo-600',
      link: '/dashboard/settings/wings'
    },
    {
      icon: ShieldCheck,
      title: 'Roles & Permissions',
      description: 'Manage roles and module access permissions',
      iconBg: 'bg-violet-700',
      link: '/dashboard/settings/roles'
    },
    {
      icon: Building2,
      title: 'Department Users',
      description: 'Manage department login accounts and permissions',
      iconBg: 'bg-cyan-700',
      link: '/dashboard/settings/department-users'
    }
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
