import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  Menu,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";

const Sidebar = () => {
  const [openMenu, setOpenMenu] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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
          label: "Received",
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
    const isOpen = openMenu === item.id;
    const active = isActive(item.path);

    if (hasSubmenu) {
      return (
        <div className="relative">
          <motion.button
            onClick={() => toggleMenu(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
              "text-sm font-medium group relative overflow-hidden",
              isOpen
                ? "bg-white/10 text-white"
                : "text-emerald-100 hover:bg-white/5 hover:text-white"
            )}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <item.icon size={20} className="flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </div>
            <ChevronDown
              size={18}
              className={cn(
                "transition-transform duration-300 flex-shrink-0",
                isOpen ? "rotate-180" : ""
              )}
            />
            {!isOpen && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-600/5 to-emerald-600/0"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />
            )}
          </motion.button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-1 ml-4 pl-4 border-l-2 border-emerald-700/50 space-y-1">
                  {item.submenu.map((subItem) => (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 group",
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
                            : "text-emerald-400 group-hover:text-emerald-300"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link to={item.path}>
        <motion.div
          className={cn(
            "relative flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
            "text-sm font-medium group overflow-hidden",
            active
              ? "bg-white text-emerald-800 shadow-lg"
              : "text-emerald-100 hover:bg-white/5 hover:text-white"
          )}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3 relative z-10">
            <item.icon
              size={20}
              className={cn(
                "flex-shrink-0",
                active ? "text-emerald-700" : "text-emerald-300"
              )}
            />
            <span className="font-medium">{item.label}</span>
          </div>
          {item.badge && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500 text-white rounded-full">
              {item.badge}
            </span>
          )}
          {!active && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-600/5 to-emerald-600/0"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.6 }}
            />
          )}
        </motion.div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-emerald-800 text-white shadow-lg"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isMobileOpen ? 0 : -320,
        }}
        className={cn(
          "fixed left-0 top-0 h-screen w-80 z-50",
          "bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950",
          "border-r border-emerald-700/30 shadow-2xl",
          "lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="relative px-6 py-6 border-b border-emerald-700/30 bg-emerald-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="/assets/img/favicon/Logo.PNG"
                alt="AJ&K PSC Logo"
                className="w-14 h-14 object-contain rounded-xl bg-white p-2 shadow-lg ring-2 ring-emerald-400/20"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-emerald-950 animate-pulse" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white tracking-tight">
                AJ&K-PSC
              </h1>
              <p className="text-emerald-300 text-xs mt-0.5 font-medium">
                Public Service Commission
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2 custom-scrollbar">
          {menuItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <motion.div
            className="relative p-4 rounded-2xl bg-gradient-to-br from-emerald-800/30 to-emerald-900/30 backdrop-blur-md border border-emerald-600/20 overflow-hidden"
            whileHover={{ scale: 1.02 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-400/10 to-emerald-600/0 animate-pulse" />
            <div className="relative z-10">
              <p className="text-xs text-emerald-300 font-medium">
                Logged in as
              </p>
              <p className="text-white font-bold text-sm mt-1 flex items-center gap-2">
                Administrator
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </p>
            </div>
          </motion.div>
        </div>
      </motion.aside>

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
