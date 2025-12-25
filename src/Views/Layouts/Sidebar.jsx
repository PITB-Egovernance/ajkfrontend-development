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
} from "lucide-react";
import { cn } from "../../lib/utils";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const [openMenu, setOpenMenu] = useState("");
  const location = useLocation();

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? "" : menu);
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
      badge: "New",
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
  ];

  const NavItem = ({ item }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isMenuOpen = openMenu === item.id;
    const active = isActive(item.path);

    if (hasSubmenu) {
      return (
        <div className="relative">
          <button
            onClick={() => toggleMenu(item.id)}
            className={cn(
              "w-full flex items-center justify-between py-3 rounded-xl transition-all duration-200",
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

          {isMenuOpen && isOpen && (
            <div className="mt-1 ml-4 pl-4 border-l-2 border-emerald-700/50 space-y-1">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
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
        </div>
      );
    }

    return (
      <Link to={item.path} title={!isOpen ? item.label : ""}>
        <div
          className={cn(
            "flex items-center justify-between rounded-xl transition-all duration-200",
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
          "h-[calc(100vh-180px)]"
        )}>
          {menuItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            
          </div>
        )}
      </aside>

      <style jsx>{`
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