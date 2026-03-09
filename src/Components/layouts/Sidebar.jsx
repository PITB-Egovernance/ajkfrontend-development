import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FileText,
  ClipboardList,
  ChevronDown,
  StickyNote,
  Megaphone,
  BookOpen,
  CheckCircle,
  Briefcase,
  Send,
  Table,
  Package,
  Home,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "utils";
import { useSidebar } from "context/SidebarContext";
import { useAuth } from "context/AuthContext";
import { getUserRole } from "utils/roleUtils";

const Sidebar = ({ isOpen: propIsOpen, setIsOpen: propSetIsOpen }) => {
  // Use context if available, fallback to props for backward compatibility
  const sidebarContext = useSidebar();
  const isOpen = propIsOpen !== undefined ? propIsOpen : sidebarContext.isOpen;
  const setIsOpen = propSetIsOpen !== undefined ? propSetIsOpen : sidebarContext.setIsOpen;
  const { openMenu, toggleMenu: contextToggleMenu } = sidebarContext;
  const { user } = useAuth();
  const userRole = getUserRole(user);
  
  const [localOpenMenu, setLocalOpenMenu] = useState("");
  const location = useLocation();

  // Use context menu state if available
  const currentOpenMenu = openMenu !== undefined ? openMenu : localOpenMenu;
  const toggleMenu = (menu) => {
    if (contextToggleMenu) {
      contextToggleMenu(menu);
    } else {
      setLocalOpenMenu(currentOpenMenu === menu ? "" : menu);
    }
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard",
      badge: null,
    },
    {
      id: "job-creation",
      label: "Job Creation",
      icon: Briefcase,
      path: "/dashboard/job-creation-form",
      badge: null,
    },
    {
      id: "requisitions",
      label: "Requisitions",
      icon: ClipboardList,
      submenu: [
        {
          label: "All Requisitions",
          path: "/dashboard/requisitions",
          icon: FileText,
        },
        {
          label: "Approved",
          path: "/dashboard/approved-requisitions",
          icon: CheckCircle,
        },
        {
          label: "Add Notes",
          path: "/dashboard/add-notes",
          icon: StickyNote,
        },
        {
          label: "Advertisements",
          path: "/dashboard/advertisement-records",
          icon: Megaphone,
        },
        {
          label: 'Annex "A"',
          path: "/dashboard/annex-a",
          icon: BookOpen,
        },
      ],
    },
    {
      id: "dispatch",
      label: "Dispatch",
      icon: Send,
      submenu: [
        {
          label: "List of Received",
          path: "/dashboard/dispatch/received",
          icon: Package,
        },
        {
          label: "Sent",
          path: "/dashboard/dispatch/sent",
          icon: Send,
        },
      ],
    },
    {
      id: "psc-table",
      label: "PSC Table",
      icon: Table,
      path: "/dashboard/psc-table",
      badge: null,
    },
    {
      id: "approvals-director",
      label: "Director Approvals",
      icon: CheckCircle,
      path: "/dashboard/approvals/director",
      roles: ["director"],
    },
    {
      id: "approvals-secretary",
      label: "Secretary Approvals",
      icon: CheckCircle,
      path: "/dashboard/approvals/secretary",
      roles: ["secretary"],
    },
    {
      id: "approvals-chairman",
      label: "Chairman Approvals",
      icon: CheckCircle,
      path: "/dashboard/approvals/chairman",
      roles: ["chairman"],
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
      path: "/dashboard/settings",
      icon: Settings,
      submenu: [
        // {
        //   label: "Organization Info",
        //   path: "/dashboard/settings/organization",
        //   icon: Briefcase,
        // },
        // {
        //   label: "Hierarchy",
        //   path: "/dashboard/settings/hierarchy",
        //   icon: ClipboardList,
        // },
        {
          label: "Districts",
          path: "/dashboard/settings/districts",
          icon: Package,
        },
        {
          label: "Designations",
          path: "/dashboard/settings/designations",
          icon: Briefcase,
        },
        // {
        //   label: "Tehsils",
        //   path: "/dashboard/settings/tehsils",
        //   icon: Table,
        // },
       
        {
          label: "Grades",
          path: "/dashboard/settings/grades",
          icon: ClipboardList,
        },
        {
          label: "Companies",
          path: "/dashboard/settings/companies",
          icon: Package,
        },
        // {
        //   label: "Contractors",
        //   path: "/dashboard/settings/contractors",
        //   icon: Table,
        // },
      ],
    },
  ];

  const allowedMenuItems = menuItems.filter((item) => {
    if (userRole === 'admin') return true;
    if (!userRole) return false;
    return Array.isArray(item.roles) && item.roles.includes(userRole);
  });

  const NavItem = ({ item }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isMenuOpen = currentOpenMenu === item.id;
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
            onClick={() => toggleMenu(item.id)}
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
            <div className="mt-1 space-y-1 overflow-hidden" style={{ height: 'auto' }}>
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 border-b border-emerald-700/20",
                    isActive(subItem.path)
                      ? "bg-white text-emerald-800 shadow-md font-semibold"
                      : "text-emerald-200 hover:text-white hover:bg-white/5"
                  )}
                >
                  <subItem.icon
                    size={16}
                    className={cn(
                      "flex-shrink-0",
                      isActive(subItem.path)
                        ? "text-emerald-700"
                        : "text-emerald-400"
                    )}
                  />
                  <span>{subItem.label}</span>
                  {isActive(subItem.path) && (
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
                  {item.submenu.map((subItem) => (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border-b border-emerald-700/20",
                        isActive(subItem.path)
                          ? "bg-white text-emerald-800 shadow-md font-semibold"
                          : "text-emerald-200 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <subItem.icon
                        size={16}
                        className={cn(
                          "flex-shrink-0",
                          isActive(subItem.path)
                            ? "text-emerald-700"
                            : "text-emerald-400"
                        )}
                      />
                      <span>{subItem.label}</span>
                      {isActive(subItem.path) && (
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
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
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
                src="/assets/img/favicon/Logo.PNG"
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
