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
  FileText,
  ImageIcon,
  Landmark
} from 'lucide-react';
import { hasSubModuleAccess, isAdminUser } from 'utils/permissions';

const Settings = () => {
  const navigate = useNavigate();
  const isAdmin = isAdminUser();

  // Grouped into the same 4 categories as the sidebar (General / Main
  // Website / Requisition & Advertisement / Examination & Result) instead of
  // one flat grid.
  const settingsModules = [
    // ── General ──────────────────────────────────────────────────────────
    {
      icon: Briefcase,
      title: 'Designations Management',
      description: 'Manage designation and grade assignments',
      iconBg: 'bg-indigo-500',
      link: '/dashboard/settings/designations',
      permModule: 'settings', permSub: 'designations', category: 'General',
    },
    {
      icon: Award,
      title: 'Grades Management',
      description: 'Configure BPS grade and pay structure',
      iconBg: 'bg-cyan-500',
      link: '/dashboard/settings/grades',
      permModule: 'settings', permSub: 'grades', category: 'General',
    },
    {
      icon: Building2,
      title: 'Departments',
      description: 'Manage department records',
      iconBg: 'bg-cyan-700',
      link: '/dashboard/settings/departments',
      permModule: 'settings', permSub: 'departments', category: 'General',
    },
    {
      icon: Building2,
      title: 'Department Users',
      description: 'Manage department login accounts and permissions',
      iconBg: 'bg-cyan-700',
      link: '/dashboard/settings/department-users',
      permModule: 'settings', permSub: 'department_users', category: 'General',
    },
    {
      icon: Map,
      title: 'Cities',
      description: 'Add and manage city data',
      iconBg: 'bg-amber-600',
      link: '/dashboard/settings/cities',
      permModule: 'settings', permSub: 'cities', category: 'General',
    },
    {
      icon: Building,
      title: 'Companies Management',
      description: 'Manage vendors and service providers',
      iconBg: 'bg-teal-500',
      link: '/dashboard/settings/companies',
      permModule: 'settings', permSub: 'companies', category: 'General',
    },
    {
      icon: PenTool,
      title: 'Digital Signatures',
      description: 'Manage employee digital signature images',
      iconBg: 'bg-emerald-600',
      link: '/dashboard/settings/digital-signatures',
      permModule: 'settings', permSub: 'digital_signatures', category: 'General',
    },
    {
      icon: UserCog,
      title: 'System Settings',
      description: 'View Chairman, Secretary and Super Admin users',
      iconBg: 'bg-slate-700',
      link: '/dashboard/settings/system-settings',
      permModule: 'settings', permSub: 'system_settings', category: 'General',
    },
    {
      icon: LayoutList,
      title: 'Wings / Sections',
      description: 'Manage wings and sections hierarchy',
      iconBg: 'bg-indigo-600',
      link: '/dashboard/settings/wings',
      permModule: 'settings', permSub: 'wings', category: 'General',
    },
    {
      icon: ShieldCheck,
      title: 'Roles & Permissions',
      description: 'Manage roles and module access permissions',
      iconBg: 'bg-violet-700',
      link: '/dashboard/settings/roles',
      permModule: 'roles_permissions', permSub: 'roles', category: 'General',
    },
    {
      icon: Stamp,
      title: 'Stamps',
      description: 'Manage stamp images used across documents',
      iconBg: 'bg-orange-500',
      link: '/dashboard/settings/stamps',
      permModule: 'settings', permSub: 'stamps', category: 'General',
    },

    // ── Main Website ─────────────────────────────────────────────────────
    {
      icon: Users,
      title: 'Commission Members',
      description: 'Manage AJK PSC Commission Members and Chairman',
      iconBg: 'bg-emerald-600',
      link: '/dashboard/settings/commission-members',
      permModule: 'settings', permSub: 'commission_members', category: 'Main Website',
    },
    {
      icon: Landmark,
      title: 'Secretary and Officials',
      description: 'Manage Secretary and Officials listings',
      iconBg: 'bg-emerald-700',
      link: '/dashboard/settings/secretary-officials',
      permModule: 'settings', permSub: 'secretary_officials', category: 'Main Website',
    },
    {
      icon: Newspaper,
      title: 'News & Notices',
      description: 'Manage news, notices and announcements',
      iconBg: 'bg-emerald-700',
      link: '/dashboard/settings/news',
      permModule: 'settings', permSub: 'news', category: 'Main Website',
    },
    {
      icon: BookOpen,
      title: 'Syllabus Management',
      description: 'Manage syllabus documents linked to case numbers',
      iconBg: 'bg-cyan-600',
      link: '/dashboard/settings/syllabus',
      permModule: 'settings', permSub: 'syllabus', category: 'Main Website',
    },
    {
      icon: ImageIcon,
      title: 'Image Management',
      description: 'Manage image assets used across the system',
      iconBg: 'bg-pink-500',
      link: '/dashboard/settings/images',
      permModule: 'settings', permSub: 'images', category: 'Main Website',
    },

    // ── Requisition & Advertisement ──────────────────────────────────────
    {
      icon: MapPin,
      title: 'Districts Management',
      description: 'Add and manage district data',
      iconBg: 'bg-amber-500',
      link: '/dashboard/settings/districts',
      permModule: 'settings', permSub: 'districts', category: 'Requisition & Advertisement',
    },
    {
      icon: Landmark,
      title: 'Nationalities',
      description: 'Manage nationality records',
      iconBg: 'bg-amber-700',
      link: '/dashboard/settings/nationalities',
      permModule: 'settings', permSub: 'nationalities', category: 'Requisition & Advertisement',
    },
    {
      icon: Award,
      title: 'Exam Fee',
      description: 'Manage exam fee amounts',
      iconBg: 'bg-lime-700',
      link: '/dashboard/settings/tests',
      permModule: 'settings', permSub: 'tests', category: 'Requisition & Advertisement',
    },
    {
      icon: FileText,
      title: 'Exam/Test Type',
      description: 'Manage exam/test type records',
      iconBg: 'bg-rose-600',
      link: '/dashboard/settings/test-types',
      permModule: 'settings', permSub: 'test_types', category: 'Requisition & Advertisement',
    },
    {
      icon: BookOpen,
      title: 'Qualifications',
      description: 'Manage qualification records',
      iconBg: 'bg-sky-600',
      link: '/dashboard/settings/qualifications',
      permModule: 'settings', permSub: 'qualifications', category: 'Requisition & Advertisement',
    },
    {
      icon: BookOpen,
      title: 'Degrees',
      description: 'Manage degree records',
      iconBg: 'bg-sky-700',
      link: '/dashboard/settings/degrees',
      permModule: 'settings', permSub: 'degrees', category: 'Requisition & Advertisement',
    },
    {
      icon: ScrollText,
      title: 'Requisition Statements',
      description: 'Manage requisition statement text',
      iconBg: 'bg-violet-600',
      link: '/dashboard/settings/requisition-statements',
      permModule: 'settings', permSub: 'requisition_statements', category: 'Requisition & Advertisement',
    },
    {
      icon: ScrollText,
      title: 'Terms & Conditions',
      description: 'Manage terms and conditions entries',
      iconBg: 'bg-violet-500',
      link: '/dashboard/settings/terms-conditions',
      permModule: 'settings', permSub: 'terms_conditions', category: 'Requisition & Advertisement',
    },

    // ── Examination & Result ─────────────────────────────────────────────
    {
      icon: MapPin,
      title: 'Exam Center',
      description: 'Manage exam center records',
      iconBg: 'bg-teal-700',
      link: '/dashboard/settings/exam-centers',
      permModule: 'settings', permSub: 'exam_centers', category: 'Examination & Result',
    },
    {
      icon: BookOpen,
      title: 'CCE Subjects',
      description: 'Manage subject groups and marks',
      iconBg: 'bg-rose-500',
      link: '/dashboard/settings/subjects',
      permModule: 'settings', permSub: 'subjects', category: 'Examination & Result',
    },
    {
      icon: FileText,
      title: 'Written Exam Subjects',
      description: 'Manage written exam subjects per designation',
      iconBg: 'bg-emerald-500',
      link: '/dashboard/settings/written-exam-subjects',
      permModule: 'settings', permSub: 'written_exam_subjects', category: 'Examination & Result',
    },
    {
      icon: Boxes,
      title: 'CCE Groups',
      description: 'Group grades together for reuse across the system',
      iconBg: 'bg-lime-600',
      link: '/dashboard/settings/groups',
      permModule: 'settings', permSub: 'groups', category: 'Examination & Result',
    },
    {
      icon: ScrollText,
      title: 'Roll No & Interview Slip Instructions',
      description: 'Manage note and instruction text for roll number slips',
      iconBg: 'bg-fuchsia-600',
      link: '/dashboard/settings/roll-number-slip-instructions',
      permModule: 'settings', permSub: 'roll_number_slip_instructions', category: 'Examination & Result',
    },
    {
      icon: Hash,
      title: 'Roll Number Prefixes',
      description: 'Configure the roll number prefix per exam type',
      iconBg: 'bg-emerald-800',
      link: '/dashboard/settings/roll-number-prefixes',
      permModule: 'settings', permSub: 'roll_number_exam_type_configs', category: 'Examination & Result',
    },
    {
      icon: Award,
      title: 'Certificates',
      description: 'Manage certificate entries',
      iconBg: 'bg-sky-500',
      link: '/dashboard/settings/certificates',
      permModule: 'settings', permSub: 'certificates', category: 'Examination & Result',
    },
  ];

  const CATEGORY_ORDER = ['General', 'Main Website', 'Requisition & Advertisement', 'Examination & Result'];

  // Filter cards: admin sees all; others see only modules they have any permission for.
  const visibleModules = settingsModules.filter(
    (m) => isAdmin || hasSubModuleAccess(m.permModule, m.permSub)
  );

  // Group the (already filtered) cards by category, in the fixed order above.
  const groupedModules = CATEGORY_ORDER
    .map((category) => ({ category, items: visibleModules.filter((m) => m.category === category) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-8xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure system settings and preferences</p>
        </div>

        {/* Settings Grid — grouped into sections (General / Main Website /
            Requisition & Advertisement / Examination & Result) */}
        {groupedModules.map((group) => (
          <div key={group.category} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {group.category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((module) => (
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
        ))}

      </div>
    </div>
  );
};

export default Settings;
