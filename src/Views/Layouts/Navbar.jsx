import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User, Menu } from 'lucide-react';
import toast from 'react-hot-toast';

const Navbar = ({ user, toggleSidebar }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    const logoutToast = toast.loading('Logging out...');
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('isLoggedIn');
    
    toast.success('Logged out successfully!', { id: logoutToast });
    
    setTimeout(() => {
      window.location.href = '/login';
    }, 800);
  };

  return (
    <nav className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right Side - User Dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
            aria-label="User Menu"
          >
            <User className="w-5 h-5 text-slate-700" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition"
              >
                <User size={18} />
                <span className="font-medium">My Profile</span>
              </Link>
              <hr className="mx-4 my-2 border-slate-200" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition font-medium"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;