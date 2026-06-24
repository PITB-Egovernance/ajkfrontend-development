import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  PlusCircle,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from 'context/AuthContext';
import { useSidebar } from 'context/SidebarContext';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const DeptSidebar = ({ isOpen: propIsOpen, setIsOpen: propSetIsOpen }) => {
  const sidebarContext = useSidebar();
  const isOpen = propIsOpen !== undefined ? propIsOpen : sidebarContext.isOpen;
  const setIsOpen = propSetIsOpen !== undefined ? propSetIsOpen : sidebarContext.setIsOpen;
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null);

  const isActive = (path) =>
    location.pathname === path ||
    (path !== '/department' && location.pathname.startsWith(path + '/'));

  const menuItems = [
    { label: 'Dashboard', path: '/department', icon: Home },
    {
      label: 'My Requisitions', path: '/department/requisitions', icon: FileText,
      submenu: [
        { label: 'All Requisitions', path: '/department/requisitions', icon: FileText },
        { label: 'New Requisition', path: '/department/requisitions/create', icon: PlusCircle },
      ],
    },
    { label: 'Profile', path: '/department/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      className={cn(
        'fixed top-0 left-0 h-screen z-40 transition-all duration-300 flex flex-col',
        'bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950',
        isOpen ? 'w-[220px]' : 'w-[50px]'
      )}
    >
      {/* Logo / Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-emerald-700/30">
        {isOpen ? (
          <div className="flex items-center gap-2">
            <img src="/assets/img/favicon/Logo.png" alt="AJK PSC" className="w-9 h-9 rounded-lg shadow-md" />
            <div>
              <span className="text-white font-bold text-sm block leading-tight">AJ&K PSC</span>
              <span className="text-emerald-300 text-xs">Department Portal</span>
            </div>
          </div>
        ) : (
          <img src="/assets/img/favicon/Logo.png" alt="AJK PSC" className="w-8 h-8 rounded-lg shadow-md" />
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* User info */}
      {isOpen && user && (
        <div className="px-4 py-3 border-b border-emerald-700/30">
          <p className="text-white text-sm font-medium truncate">{user.username || user.full_name || 'Department'}</p>
          <p className="text-emerald-400 text-xs truncate">{user.email || ''}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const isSubmenuActive = hasSubmenu && item.submenu.some((s) => isActive(s.path));
          const isMenuOpen = openMenu === item.label;

          if (hasSubmenu) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenMenu(isMenuOpen ? null : item.label)}
                  className={cn(
                    'w-full flex items-center justify-between py-3 rounded-xl transition-all duration-200',
                    'text-sm font-medium',
                    isOpen ? 'px-4' : 'px-3 justify-center',
                    isMenuOpen || isSubmenuActive
                      ? 'bg-white/10 text-white'
                      : 'text-emerald-100 hover:bg-white/5 hover:text-white'
                  )}
                  title={!isOpen ? item.label : ''}
                >
                  <div className={cn('flex items-center gap-3', !isOpen && 'justify-center')}>
                    <item.icon size={20} className="flex-shrink-0" />
                    {isOpen && <span>{item.label}</span>}
                  </div>
                  {isOpen && (
                    <ChevronDown size={16} className={cn('transition-transform duration-200 flex-shrink-0', isMenuOpen ? 'rotate-180' : '')} />
                  )}
                </button>
                {isMenuOpen && isOpen && (
                  <div className="mt-1 space-y-1 ml-2">
                    {item.submenu.map((sub) => {
                      const subActive = location.pathname === sub.path;
                      return (
                        <Link key={sub.path} to={sub.path}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200',
                            subActive
                              ? 'bg-white text-emerald-800 shadow-md font-semibold'
                              : 'text-emerald-200 hover:text-white hover:bg-white/5'
                          )}>
                          <sub.icon size={16} className={cn('flex-shrink-0', subActive ? 'text-emerald-700' : 'text-emerald-400')} />
                          <span>{sub.label}</span>
                          {subActive && <ChevronRight size={14} className="ml-auto text-emerald-700" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 py-3 rounded-xl transition-all duration-200',
                'text-sm font-medium',
                isOpen ? 'px-4' : 'px-3 justify-center',
                active
                  ? 'bg-white text-emerald-800 shadow-md font-semibold'
                  : 'text-emerald-100 hover:bg-white/5 hover:text-white'
              )}
              title={!isOpen ? item.label : ''}
            >
              <item.icon size={20} className={cn('flex-shrink-0', active ? 'text-emerald-700' : '')} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-emerald-700/30">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 py-3 rounded-xl transition-all duration-200',
            'text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200',
            isOpen ? 'px-4' : 'px-3 justify-center'
          )}
          title={!isOpen ? 'Logout' : ''}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default DeptSidebar;