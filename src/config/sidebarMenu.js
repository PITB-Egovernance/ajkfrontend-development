import {
  Home, Users, ClipboardList, FileText, Table, CheckCircle,
  Award, Settings, Package, Briefcase, MapPin, Map, Hash,
  GraduationCap, BookOpen, Building2, Flag, DollarSign,
  Megaphone, PenTool, UserCog, LayoutList, ShieldCheck, GitBranch,ScrollText
} from "lucide-react";

export const MENU_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    path: "/dashboard",
  },
  {
    id: "candidates",
    label: "Candidates",
    icon: Users,
    submenu: [
      { label: "Job Applications",       path: "/dashboard/applications",  icon: ClipboardList },
      { label: "Roll Number Management", path: "/dashboard/roll-numbers",  icon: Hash },
      { label: "Award Lists",            path: "/dashboard/award-lists",   icon: Award },
    ],
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    submenu: [
      { label: "All Employees", path: "/dashboard/employees/list", icon: ClipboardList },
    ],
  },
  {
    id: "requisitions",
    label: "Requisitions",
    icon: ClipboardList,
    submenu: [
      { label: "All Requisitions",       path: "/dashboard/requisitions",          icon: FileText },
      { label: "Submitted Requisitions", path: "/dashboard/psc-table",             icon: Table },
      { label: "Job Pool",               path: "/dashboard/approved-requisitions", icon: CheckCircle },
      { label: "Advertisements",         path: "/dashboard/advertisement-records", icon: Megaphone },
    ],
  },
  {
    id: "my-requisitions",
    label: "Requisition Approvals",
    icon: ClipboardList,
    path: "/dashboard/my-requisitions",
  },
  {
    id: "approval-flow",
    label: "Approval Flow",
    icon: GitBranch,
    path: "/dashboard/approval-flow",
  },
  {
    id: "results",
    label: "Results",
    icon: Award,
    path: "/dashboard/results",
  },
  {
    id: "workflow-tracking",
    label: "Workflow Tracking",
    icon: CheckCircle,
    path: "/dashboard/workflow-tracking",
    roles: ["admin"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/dashboard/settings",
    submenu: [
      { label: "Districts",          path: "/dashboard/settings/districts",           icon: Package },
      { label: "Designations",       path: "/dashboard/settings/designations",        icon: Briefcase },
      { label: "Grades",             path: "/dashboard/settings/grades",              icon: ClipboardList },
      { label: "Departments",        path: "/dashboard/settings/departments",         icon: Building2 },
      { label: "Department Users", path: "/dashboard/settings/department-users", icon: Users },
      { label: "Nationalities",      path: "/dashboard/settings/nationalities",       icon: Flag },
      { label: "Exam Test & Fee",    path: "/dashboard/settings/tests",              icon: DollarSign },
      { label: "Exam Test Types",    path: "/dashboard/settings/test-types",         icon: FileText },
      { label: "Cities",             path: "/dashboard/settings/cities",              icon: Map },
      { label: "Exam Center",        path: "/dashboard/settings/exam-centers",       icon: MapPin },
      { label: "Qualifications",     path: "/dashboard/settings/qualifications",     icon: GraduationCap },
      { label: "Degrees",            path: "/dashboard/settings/degrees",            icon: BookOpen },
      { label: "Companies",          path: "/dashboard/settings/companies",          icon: Package },
      { label: "Subjects",           path: "/dashboard/settings/subjects",           icon: BookOpen },
      { label: "Certificates",       path: "/dashboard/settings/certificates",       icon: Award },
      { label: "Digital Signatures", path: "/dashboard/settings/digital-signatures", icon: PenTool },
      { label: "System Settings",    path: "/dashboard/settings/system-settings",    icon: UserCog },
      { label: "Wings / Sections",        path: "/dashboard/settings/wings",        icon: LayoutList },
      { label: "Terms & Condition",        path: "/dashboard/settings/terms-conditions",     icon: ScrollText },
      { label: "Roles & Permissions", path: "/dashboard/settings/roles",              icon: ShieldCheck },
    ],
  },
];

// Derives a flat permissions list directly from MENU_ITEMS.
// Adding a new item to MENU_ITEMS automatically adds it here.
export const getPermissionModules = () => {
  const modules = [];
  MENU_ITEMS.forEach((item) => {
    if (item.submenu) {
      item.submenu.forEach((sub) => {
        modules.push({ key: sub.path, label: `${item.label} → ${sub.label}` });
      });
    } else {
      modules.push({ key: item.id, label: item.label });
    }
  });
  return modules;
};
