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
  ShieldCheck,
  Stamp,
  Boxes,
  Newspaper,
  Hash,
  FileText
} from 'lucide-react';
import { hasSubModuleAccess, isAdminUser } from 'utils/permissions';

const Settings = () => {
  const navigate = useNavigate();
  const isAdmin = isAdminUser();

  const settingsModules = [
    {
      icon: MapPin,
      title: 'Districts Management',
      description: 'Add and manage district data',
      iconBg: 'bg-amber-500',
      link: '/dashboard/settings/districts',
      permModule: 'settings', permSub: 'districts',
    },
    {
      icon: Briefcase,
      title: 'Designations Management',
      description: 'Manage designation and grade assignments',
      iconBg: 'bg-indigo-500',
      link: '/dashboard/settings/designations',
      permModule: 'settings', permSub: 'designations',
    },
    {
      icon: Award,
      title: 'Grades Management',
      description: 'Configure BPS grade and pay structure',
      iconBg: 'bg-cyan-500',
      link: '/dashboard/settings/grades',
      permModule: 'settings', permSub: 'grades',
    },
    {
      icon: Building,
      title: 'Companies Management',
      description: 'Manage vendors and service providers',
      iconBg: 'bg-teal-500',
      link: '/dashboard/settings/companies',
      permModule: 'settings', permSub: 'companies',
    },
    {
      icon: BookOpen,
      title: 'Subject Management',
      description: 'Manage subject groups and marks',
      iconBg: 'bg-rose-500',
      link: '/dashboard/settings/subjects',
      permModule: 'settings', permSub: 'subjects',
    },
    {
      icon: FileText,
      title: 'Written Exam Subjects',
      description: 'Manage written exam subjects per designation',
      iconBg: 'bg-emerald-500',
      link: '/dashboard/settings/written-exam-subjects',
      permModule: 'settings', permSub: 'written_exam_subjects',
    },
    {
      icon: Award,
      title: 'Certificates',
      description: 'Manage certificate entries',
      iconBg: 'bg-sky-500',
      link: '/dashboard/settings/certificates',
      permModule: 'settings', permSub: 'certificates',
    },
    {
      icon: ScrollText,
      title: 'Terms & Conditions',
      description: 'Manage terms and conditions entries',
      iconBg: 'bg-violet-500',
      link: '/dashboard/settings/terms-and-conditions',
      permModule: 'settings', permSub: 'terms_conditions',
    },
    {
      icon: PenTool,
      title: 'Digital Signatures',
      description: 'Manage employee digital signature images',
      iconBg: 'bg-emerald-600',
      link: '/dashboard/settings/digital-signatures',
      permModule: 'settings', permSub: 'digital_signatures',
    },
    {
      icon: UserCog,
      title: 'System Settings',
      description: 'View Chairman, Secretary and Super Admin users',
      iconBg: 'bg-slate-700',
      link: '/dashboard/settings/system-settings',
      permModule: 'settings', permSub: 'system_settings',
    },
    {
      icon: LayoutList,
      title: 'Wings / Sections',
      description: 'Manage wings and sections hierarchy',
      iconBg: 'bg-indigo-600',
      link: '/dashboard/settings/wings',
      permModule: 'settings', permSub: 'wings',
    },
    {
      icon: Stamp,
      title: 'Stamps',
      description: 'Manage stamp images used across documents',
      iconBg: 'bg-orange-500',
      link: '/dashboard/settings/stamps',
      permModule: 'settings', permSub: 'stamps',
    },
    {
      icon: Boxes,
      title: 'Groups',
      description: 'Group grades together for reuse across the system',
      iconBg: 'bg-lime-600',
      link: '/dashboard/settings/groups',
      permModule: 'settings', permSub: 'groups',
    },
    {
      icon: Newspaper,
      title: 'News & Notices',
      description: 'Manage news, notices and announcements',
      iconBg: 'bg-emerald-700',
      link: '/dashboard/settings/news',
      permModule: 'settings', permSub: 'news',
    },
    {
      icon: ScrollText,
      title: 'Roll Number / Interview Slip Instructions',
      description: 'Manage note and instruction text for roll number slips',
      iconBg: 'bg-fuchsia-600',
      link: '/dashboard/settings/roll-number-slip-instructions',
      permModule: 'settings', permSub: 'roll_number_slip_instructions',
    },
    {
      icon: Hash,
      title: 'Roll Number Prefixes',
      description: 'Configure the roll number prefix per exam type',
      iconBg: 'bg-emerald-800',
      link: '/dashboard/settings/roll-number-prefixes',
      permModule: 'settings', permSub: 'roll_number_exam_type_configs',
    },
    {
      icon: ShieldCheck,
      title: 'Roles & Permissions',
      description: 'Manage roles and module access permissions',
      iconBg: 'bg-violet-700',
      link: '/dashboard/settings/roles',
      permModule: 'roles_permissions', permSub: 'roles',
    },
    {
      icon: Building2,
      title: 'Department Users',
      description: 'Manage department login accounts and permissions',
      iconBg: 'bg-cyan-700',
      link: '/dashboard/settings/department-users',
      permModule: 'settings', permSub: 'department_users',
    }
  ];

  // Filter cards: admin sees all; others see only modules they have any permission for.
  const visibleModules = settingsModules.filter(
    (m) => isAdmin || hasSubModuleAccess(m.permModule, m.permSub)
  );

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
          {visibleModules.map((module) => (
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
