import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MENU_ITEMS } from "config/sidebarMenu";
import { cn } from "utils";
import { useSidebar } from "context/SidebarContext";
import { useAuth } from "context/AuthContext";
import { isAdminUser, hasAnyModuleAccess, hasSubModuleAccess } from "utils/permissions";

// Maps a submenu item path → [permissionModule, subModule] so each sub-tab is
// shown only when the role has access to that specific sub-module.
// Same technique as the Settings sub-tabs: each leaf maps to its closest existing
// permission sub-module (no new keys invented — mirrors the backend catalog).
const SUBMENU_PERMISSION_MAP = {
  // Candidates
  "/dashboard/applications":                ["candidates", "job_applications"],
  "/dashboard/roll-numbers":                ["roll_number", "roll_number_generation"],
  "/dashboard/award-lists":                 ["candidates", "award_lists"],
  // Employees
  "/dashboard/employees/list":              ["employee_management", "employees"],
  // Requisitions
  "/dashboard/requisitions":                ["requisitions", "admin_requisition"],
  "/dashboard/psc-table":                   ["requisitions", "department_requisition"],
  "/dashboard/approved-requisitions":       ["requisitions", "job_pool"],
  "/dashboard/advertisement-records":       ["advertisement", "advertisement"],
  // Settings
  "/dashboard/settings/districts":          ["settings", "districts"],
  "/dashboard/settings/designations":       ["settings", "designations"],
  "/dashboard/settings/grades":             ["settings", "grades"],
  "/dashboard/settings/departments":        ["settings", "departments"],
  "/dashboard/settings/department-users":   ["settings", "department_users"],
  "/dashboard/settings/nationalities":      ["settings", "nationalities"],
  "/dashboard/settings/tests":              ["settings", "tests"],
  "/dashboard/settings/cities":             ["settings", "cities"],
  "/dashboard/settings/exam-centers":       ["settings", "exam_centers"],
  "/dashboard/settings/qualifications":     ["settings", "qualifications"],
  "/dashboard/settings/degrees":            ["settings", "degrees"],
  "/dashboard/settings/companies":          ["settings", "companies"],
  "/dashboard/settings/subjects":           ["settings", "subjects"],
  "/dashboard/settings/certificates":       ["settings", "certificates"],
  "/dashboard/settings/digital-signatures": ["settings", "digital_signatures"],
  "/dashboard/settings/system-settings":    ["settings", "system_settings"],
  "/dashboard/settings/wings":              ["settings", "wings"],
  "/dashboard/settings/roles":              ["roles_permissions", "roles"],
};

// Maps each top-level sidebar item to the permission module(s) that grant access.
// `null` = always visible (e.g. Dashboard). Items not listed are hidden for
// non-admin users who lack the mapped module permission.
const MENU_MODULE_MAP = {
  dashboard: null,
  candidates: ['candidates', 'roll_number', 'review_appeal'],
  employees: ['employee_management'],
  requisitions: ['requisitions', 'advertisement'],
  'approval-flow': ['requisitions'],
  results: ['result'],
  'workflow-tracking': ['requisitions', 'result'],
  settings: ['settings', 'roles_permissions'],
};

const Sidebar = ({ isOpen: propIsOpen, setIsOpen: propSetIsOpen }) => {
  // Use context if available, fallback to props for backward compatibility
  const sidebarContext = useSidebar();
  const isOpen = propIsOpen !== undefined ? propIsOpen : sidebarContext.isOpen;
  const setIsOpen = propSetIsOpen !== undefined ? propSetIsOpen : sidebarContext.setIsOpen;
  const { openMenu, toggleMenu: contextToggleMenu } = sidebarContext;
  const { user } = useAuth();

  const [localOpenMenu, setLocalOpenMenu] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  // Use context menu state if available
  const currentOpenMenu = openMenu !== undefined ? openMenu : localOpenMenu;
  const toggleMenu = (menu) => {
    if (contextToggleMenu) {
      contextToggleMenu(menu);
    } else {
      setLocalOpenMenu(currentOpenMenu === menu ? "" : menu);
    }
  };

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(path + '/'));

  // Exact-match active check for submenu items — avoids a parent-style path
  // (e.g. "/dashboard/requisitions") highlighting when a deeper child route
  // (e.g. "/dashboard/requisitions/approval-flow") is open.
  const isSubActive = (path) => {
    if (location.pathname === path) return true;
    // Only treat as active via prefix if no other submenu item is a more
    // specific (longer) match for the current path.
    if (!location.pathname.startsWith(path + '/')) return false;
    const allSubPaths = MENU_ITEMS.flatMap((m) => (m.submenu || []).map((s) => s.path));
    const moreSpecific = allSubPaths.some(
      (p) => p !== path && p.startsWith(path + '/') && (location.pathname === p || location.pathname.startsWith(p + '/'))
    );
    return !moreSpecific;
  };

  const menuItems = MENU_ITEMS;
  const admin = isAdminUser(user);

  const allowedMenuItems = menuItems.filter((item) => {
    // Admin / super admin sees everything.
    if (admin) return true;
    // Dashboard is always visible.
    const mods = MENU_MODULE_MAP[item.id];
    if (mods === null) return true;
    // Non-admin: show only modules the role has permission for.
    if (!mods) return false;
    return hasAnyModuleAccess(mods);
  });

  const NavItem = ({ item }) => {
    // Show only the sub-tabs the role can access (admin sees all; unmapped items stay visible).
    const submenu = (item.submenu || []).filter((sub) => {
      if (admin) return true;
      const map = SUBMENU_PERMISSION_MAP[sub.path];
      if (!map) return true;
      return hasSubModuleAccess(map[0], map[1]);
    });
    const hasSubmenu = submenu.length > 0;
    // A submenu is open if explicitly toggled OR one of its children is the
    // active route (so the parent auto-expands and the item shows nested).
    const hasActiveChild = hasSubmenu && submenu.some((s) => isActive(s.path));
    // Accordion: an explicit selection wins (only that menu is open). Fall back
    // to auto-expanding the active route's parent only when nothing is explicitly open.
    const isMenuOpen = currentOpenMenu ? currentOpenMenu === item.id : hasActiveChild;
    const active = isActive(item.path);
    const [showHoverMenu, setShowHoverMenu] = useState(false);

    if (hasSubmenu) {
      return (
        <div
          className="relative group"
          onMouseEnter={() => !isOpen && setShowHoverMenu(true)}
          onMouseLeave={() => !isOpen && setShowHoverMenu(false)}
        >
          <button
            onClick={() => {
              toggleMenu(item.id);
              if (item.path) navigate(item.path);
            }}
            className={cn(
              "w-full flex items-center justify-between py-3 rounded-xl transition-all duration-200 border-b border-emerald-700/20",
              "text-sm font-medium group",
              isOpen ? "px-4" : "px-3 justify-center",
              isMenuOpen
                ? "bg-white/10 text-white"
                : "text-emerald-100 hover:bg-white/5 hover:text-white"
            )}
            title={!isOpen ? item.label : ""}
          >
            <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
              <item.icon size={20} className="flex-shrink-0" />
              {isOpen && <span className="font-medium">{item.label}</span>}
            </div>
            {isOpen && (
              <ChevronDown
                size={18}
                className={cn(
                  "transition-transform duration-300 flex-shrink-0",
                  isMenuOpen ? "rotate-180" : ""
                )}
              />
            )}
          </button>

          {/* Submenu for expanded sidebar */}
          {isMenuOpen && isOpen && (
            <div className="mt-1 mb-1 ml-5 pl-3 space-y-1 overflow-hidden border-l-2 border-emerald-700/40" style={{ height: 'auto' }}>
              {submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    isSubActive(subItem.path)
                      ? "bg-white text-emerald-800 shadow-md font-semibold"
                      : "text-emerald-200 hover:text-white hover:bg-white/5"
                  )}
                >
                  <subItem.icon
                    size={16}
                    className={cn(
                      "flex-shrink-0",
                      isSubActive(subItem.path)
                        ? "text-emerald-700"
                        : "text-emerald-400"
                    )}
                  />
                  <span>{subItem.label}</span>
                  {isSubActive(subItem.path) && (
                    <ChevronRight
                      size={14}
                      className="ml-auto text-emerald-700"
                    />
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Hover submenu for collapsed sidebar */}
          {!isOpen && showHoverMenu && (
            <div
              className="absolute left-full top-0 ml-2 min-w-[250px] z-50 animate-in fade-in slide-in-from-left-2 duration-200"
              style={{ height: 'auto' }}
            >
              <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-xl shadow-2xl border border-emerald-700/30 py-2 px-2">
                <div className="px-3 py-2 border-b border-emerald-700/30 mb-2">
                  <span className="text-white font-semibold text-sm">{item.label}</span>
                </div>
                <div className="space-y-1">
                  {submenu.map((subItem) => (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border-b border-emerald-700/20",
                        isSubActive(subItem.path)
                          ? "bg-white text-emerald-800 shadow-md font-semibold"
                          : "text-emerald-200 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <subItem.icon
                        size={16}
                        className={cn(
                          "flex-shrink-0",
                          isSubActive(subItem.path)
                            ? "text-emerald-700"
                            : "text-emerald-400"
                        )}
                      />
                      <span>{subItem.label}</span>
                      {isSubActive(subItem.path) && (
                        <ChevronRight
                          size={14}
                          className="ml-auto text-emerald-700"
                        />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <Link to={item.path} title={!isOpen ? item.label : ""}>
        <div
          className={cn(
            "flex items-center justify-between rounded-xl transition-all duration-200 border-b border-emerald-700/20",
            "text-sm font-medium py-3",
            isOpen ? "px-4" : "px-3 justify-center",
            active
              ? "bg-white text-emerald-800 shadow-lg"
              : "text-emerald-100 hover:bg-white/5 hover:text-white"
          )}
        >
          <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
            <item.icon
              size={20}
              className={cn(
                "flex-shrink-0",
                active ? "text-emerald-700" : "text-emerald-300"
              )}
            />
            {isOpen && <span className="font-medium">{item.label}</span>}
          </div>
          {item.badge && isOpen && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500 text-white rounded-full">
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 no-print"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen z-50 transition-all duration-300",
          "bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950",
          "border-r border-emerald-700/30 shadow-2xl",
          isOpen ? "w-80" : "w-20",
          "translate-x-0"
        )}
      >
        {/* Header */}
        <div className={cn(
          "relative py-6 border-b border-emerald-700/30 bg-emerald-950/50 backdrop-blur-sm",
          isOpen ? "px-6" : "px-3"
        )}>
          <div className={cn("flex items-center", isOpen ? "gap-4" : "justify-center")}>
            <div className="relative flex-shrink-0">
              <img
                src="/assets/img/favicon/Logo.png"
                alt="AJ&K PSC Logo"
                className={cn(
                  "object-contain rounded-xl bg-white p-2 shadow-lg ring-2 ring-emerald-400/20",
                  isOpen ? "w-14 h-14" : "w-12 h-12"
                )}
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-emerald-950" />
            </div>
            {isOpen && (
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  AJ&K-PSC
                </h1>
                <p className="text-emerald-300 text-xs mt-0.5 font-medium">
                  Public Service Commission
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "overflow-y-auto py-6 space-y-2 custom-scrollbar",
          isOpen ? "px-4" : "px-2",
          "h-[calc(100vh-120px)]"
        )}
          style={{ height: 'auto', maxHeight: 'calc(100vh - 120px)' }}
        >
          {allowedMenuItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>
      </aside>

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(16, 185, 129, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </>
  );
};

export default Sidebar;
