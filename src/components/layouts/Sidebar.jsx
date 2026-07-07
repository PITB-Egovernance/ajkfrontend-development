import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { MENU_ITEMS } from "config/sidebarMenu";
// import { Link, useLocation } from "react-router-dom";
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
  MapPin,
  Map,
  DoorOpen,
  Hash,
  Users,
  Award,
  GraduationCap,
  BookOpen as BookOpenIcon,
  Building2,
  TrendingUp,
  BarChart3,
  Eye,
  Upload,
  LayoutDashboard,
  PlusCircle,
  Flag,
  DollarSign,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "utils";
import { useSidebar } from "context/SidebarContext";
import { useGenerationGuard } from "context/GenerationGuardContext";
import { useAuth } from "context/AuthContext";
import { isAdminUser, hasSubModuleAccess } from "utils/permissions";
import { getRoutePermissionMap } from "config/permissionRegistry";

// Each route path → [permissionModule, subModule], derived from the sidebar so it
// stays in sync automatically (a new page is gated by its own permission key).
const ROUTE_PERMISSION_MAP = getRoutePermissionMap();

// Items that are always visible regardless of permission (neutral landing page).
const ALWAYS_VISIBLE_IDS = new Set(['dashboard']);

const Sidebar = ({ isOpen: propIsOpen, setIsOpen: propSetIsOpen }) => {
  // Use context if available, fallback to props for backward compatibility
  const sidebarContext = useSidebar();
  const isOpen = propIsOpen !== undefined ? propIsOpen : sidebarContext.isOpen;
  const setIsOpen = propSetIsOpen !== undefined ? propSetIsOpen : sidebarContext.setIsOpen;
  const { openMenu, toggleMenu: contextToggleMenu } = sidebarContext;
  const { user } = useAuth();
  const { isBusy, busyMessage } = useGenerationGuard();

  // Blocks all sidebar navigation while a long-running queued process (e.g.
  // roll number slip generation) is in progress.
  const guardNavClick = (e) => {
    if (isBusy) {
      e.preventDefault();
      toast.error(busyMessage);
    }
  };

  const [localOpenMenu, setLocalOpenMenu] = useState("");
  // Which nested SubGroup (by its path) is expanded. Lifted up here — rather than
  // local state inside SubGroup — because SubGroup is defined inline inside this
  // component and gets a new type identity (and therefore remounts, resetting any
  // local state) every time Sidebar re-renders, which happens immediately after
  // the group header's own navigate() call fires.
  const [openSubMenu, setOpenSubMenu] = useState("");
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
    const allSubPaths = MENU_ITEMS.flatMap((m) => (m.submenu || []).flatMap(
      (s) => [s.path, ...(Array.isArray(s.children) ? s.children.map((c) => c.path) : [])]
    ));
    const moreSpecific = allSubPaths.some(
      (p) => p !== path && p.startsWith(path + '/') && (location.pathname === p || location.pathname.startsWith(p + '/'))
    );
    return !moreSpecific;
  };

  const menuItems = MENU_ITEMS;
  const admin = isAdminUser(user);

  // A page is visible only when the role has at least one granted action on the
  // page's own permission key. Unmapped paths stay visible (don't hide unknowns).
  const canSeePath = (path) => {
    if (admin) return true;
    if (!path) return false;
    const key = ROUTE_PERMISSION_MAP[String(path).replace(/\/$/, '')];
    if (!key) return true;
    return hasSubModuleAccess(key[0], key[1]);
  };

  const allowedMenuItems = menuItems.filter((item) => {
    if (admin) return true;
    if (ALWAYS_VISIBLE_IDS.has(item.id)) return true;
    // Parent with sub-tabs → visible if any child (including nested grandchildren) is visible.
    if (Array.isArray(item.submenu)) return item.submenu.some((s) =>
      canSeePath(s.path) || (Array.isArray(s.children) && s.children.some((c) => canSeePath(c.path)))
    );
    // Standalone page → gated by its own permission key.
    return canSeePath(item.path);
  });

  // A second-level nested group inside a submenu (e.g. "Combined Competitive
  // Exams" holding "CCE Screening Results" / "CCE Master Date Sheet" / ...).
  // Collapsed by default; auto-expands when one of its children is the active route.
  const SubGroup = ({ subItem }) => {
    const hasActiveChild = subItem.children.some((c) => isSubActive(c.path));
    // Explicit toggle wins; otherwise auto-expand when a child route is active.
    const expanded = openSubMenu ? openSubMenu === subItem.path : hasActiveChild;

    return (
      <div>
        <button
          onClick={() => {
            if (isBusy) {
              toast.error(busyMessage);
              return;
            }
            setOpenSubMenu((prev) => (prev === subItem.path ? "" : subItem.path));
            navigate(subItem.path);
          }}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            isSubActive(subItem.path)
              ? "bg-white text-emerald-800 shadow-md font-semibold"
              : "text-emerald-200 hover:text-white hover:bg-white/5"
          )}
        >
          <div className="flex items-center gap-3">
            <subItem.icon
              size={16}
              className={cn("flex-shrink-0", isSubActive(subItem.path) ? "text-emerald-700" : "text-emerald-400")}
            />
            <span>{subItem.label}</span>
          </div>
          <ChevronDown
            size={14}
            className={cn("flex-shrink-0 transition-transform duration-200", expanded ? "rotate-180" : "")}
          />
        </button>
        {expanded && (
          <div className="mt-1 ml-4 pl-3 space-y-1 border-l-2 border-emerald-700/30">
            {subItem.children.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={guardNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  isSubActive(child.path)
                    ? "bg-white text-emerald-800 shadow-md font-semibold"
                    : "text-emerald-200 hover:text-white hover:bg-white/5"
                )}
              >
                <child.icon
                  size={14}
                  className={cn("flex-shrink-0", isSubActive(child.path) ? "text-emerald-700" : "text-emerald-400")}
                />
                <span>{child.label}</span>
                {isSubActive(child.path) && <ChevronRight size={14} className="ml-auto text-emerald-700" />}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  const NavItem = ({ item }) => {
    // Show only the sub-tabs the role can access (admin sees all; unmapped items stay visible).
    // A nested group stays visible if its own path is permitted OR at least one of its
    // children is; children the role can't see are filtered out individually.
    const submenu = (item.submenu || [])
      .map((sub) => (Array.isArray(sub.children)
        ? { ...sub, children: sub.children.filter((c) => canSeePath(c.path)) }
        : sub))
      .filter((sub) => canSeePath(sub.path) || (Array.isArray(sub.children) && sub.children.length > 0));
    const hasSubmenu = submenu.length > 0;
    // A submenu is open if explicitly toggled OR one of its children (or a nested
    // grandchild) is the active route (so the parent auto-expands and shows nested).
    const hasActiveChild = hasSubmenu && submenu.some((s) =>
      isActive(s.path) || (Array.isArray(s.children) && s.children.some((c) => isActive(c.path)))
    );
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
              if (isBusy) {
                toast.error(busyMessage);
                return;
              }
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
                Array.isArray(subItem.children) && subItem.children.length > 0 ? (
                  <SubGroup key={subItem.path} subItem={subItem} />
                ) : (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    onClick={guardNavClick}
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
                )
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
                    <div key={subItem.path}>
                      <Link
                        to={subItem.path}
                        onClick={guardNavClick}
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
                      {Array.isArray(subItem.children) && subItem.children.length > 0 && (
                        <div className="ml-4 pl-3 space-y-1 border-l-2 border-emerald-700/30">
                          {subItem.children.map((child) => (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={guardNavClick}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                isSubActive(child.path)
                                  ? "bg-white text-emerald-800 shadow-md font-semibold"
                                  : "text-emerald-200 hover:text-white hover:bg-white/5"
                              )}
                            >
                              <child.icon
                                size={14}
                                className={cn(
                                  "flex-shrink-0",
                                  isSubActive(child.path) ? "text-emerald-700" : "text-emerald-400"
                                )}
                              />
                              <span>{child.label}</span>
                              {isSubActive(child.path) && (
                                <ChevronRight size={14} className="ml-auto text-emerald-700" />
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <Link to={item.path} onClick={guardNavClick} title={!isOpen ? item.label : ""}>
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
