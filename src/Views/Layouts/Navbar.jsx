import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Navbar = ({ user }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isLoggedIn');
    window.location.href = '/login';
  };

  return (
    <nav className="px-6 py-4 flex items-center justify-between">
      <div className="flex-1">
        <h2 className="text-2xl font-semibold text-slate-800">Dashboard</h2>
      </div>

      {/* Right Side - User Dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-600 flex items-center justify-center ring-2 ring-emerald-200">
              <img
                src="/assets/img/favicon/userlogo.png"
                alt="User"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="text-white font-semibold text-sm hidden">A</span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-slate-900">Admin</div>
              <div className="text-xs text-slate-500">Administrator</div>
            </div>
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