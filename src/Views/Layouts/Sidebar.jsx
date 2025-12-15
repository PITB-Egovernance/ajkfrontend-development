import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ClipboardList, ChevronDown, Inbox, Table } from 'lucide-react';

const Sidebar = () => {
  const [openMenu, setOpenMenu] = useState('');
  const [openMobile, setOpenMobile] = useState(false);
  const location = useLocation();

  const toggleMenu = (menu) => setOpenMenu(openMenu === menu ? '' : menu);
  const isActive = (path) => location.pathname === path;

  const Item = ({ to, icon, children, compact }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 ${compact ? 'px-4 py-2 text-xs' : 'px-5 py-3'} rounded-lg transition-colors w-full ${isActive(to) ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'}`}
    >
      {icon}
      <span className={`${compact ? 'truncate' : 'font-medium'}`}>{children}</span>
    </Link>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        aria-label="Open menu"
        onClick={() => setOpenMobile(true)}
        className="md:hidden fixed z-50 left-4 top-4 p-2 bg-emerald-600 text-white rounded-lg shadow"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Drawer for mobile */}
      <div className={`fixed inset-0 z-40 md:hidden ${openMobile ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpenMobile(false)} />
        <aside className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-lg p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/assets/img/favicon/Logo.PNG" alt="logo" className="w-10 h-10 rounded-md bg-emerald-50 p-1" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">AJ&K PSC</div>
                <div className="text-xs text-emerald-500">Admin</div>
              </div>
            </div>
            <button onClick={() => setOpenMobile(false)} className="p-2 rounded bg-emerald-100">
              ✕
            </button>
          </div>

          <nav className="space-y-2">
            <div>
              <button onClick={() => toggleMenu('viewRequisition')} className="flex items-center justify-between w-full px-3 py-2 rounded-md text-emerald-700 hover:bg-emerald-50">
                <div className="flex items-center gap-3"><ClipboardList size={16} /><span className="font-medium">View Requisition</span></div>
                <ChevronDown size={16} className={`${openMenu === 'viewRequisition' ? 'rotate-180' : ''} transition-transform`} />
              </button>
              <div className={`mt-2 pl-3 space-y-1 ${openMenu === 'viewRequisition' ? 'block' : 'hidden'}`}>
                <Item to="/requisitions" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>List of Requisitions</Item>
                <Item to="/approved-requisitions" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>Approved Requisitions</Item>
                <Item to="/add-notes" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>Add Notes</Item>
                <Item to="/advertisement-records" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>Advertisement Records</Item>
                <Item to="/annex-a" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>List of Annex A</Item>
              </div>
            </div>

            <Item to="/job-creation" icon={<FileText size={16} />}>Job Creation Form</Item>

            <div>
              <button onClick={() => toggleMenu('dispatch')} className="flex items-center justify-between w-full px-3 py-2 rounded-md text-emerald-700 hover:bg-emerald-50">
                <div className="flex items-center gap-3"><Inbox size={16} /><span className="font-medium">Dispatch</span></div>
                <ChevronDown size={16} className={`${openMenu === 'dispatch' ? 'rotate-180' : ''} transition-transform`} />
              </button>
              <div className={`mt-2 pl-3 space-y-1 ${openMenu === 'dispatch' ? 'block' : 'hidden'}`}>
                <Item to="/dispatch/received" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>List of Received</Item>
                <Item to="/dispatch/sent" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>List of Dispatch</Item>
              </div>
            </div>

            <Item to="/psc-table" icon={<Table size={16} />}>PSC Table</Item>
          </nav>

          <div className="mt-6 pt-4 border-t">
            <div className="text-xs text-emerald-500">Logged in as</div>
            <div className="font-medium text-emerald-800">Administrator</div>
          </div>
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:w-72 md:flex md:flex-col md:pt-6 md:pb-6 md:px-4">
        <div className="flex flex-col bg-white/5 backdrop-blur-md rounded-xl h-full p-4 shadow">
          <div className="flex items-center gap-3 px-2 py-3">
            <img src="/assets/img/favicon/Logo.PNG" alt="logo" className="w-12 h-12 rounded-md bg-emerald-50 p-1" />
            <div>
              <div className="text-lg font-semibold text-emerald-800">AJ&K PSC</div>
              <div className="text-sm text-emerald-500">Public Service Commission</div>
            </div>
          </div>

          <nav className="mt-4 flex-1 overflow-y-auto px-1 space-y-2">
            <div>
              <button onClick={() => toggleMenu('viewRequisition')} className="flex items-center justify-between w-full px-3 py-2 rounded-md text-emerald-700 hover:bg-emerald-50">
                <div className="flex items-center gap-3"><ClipboardList size={18} /><span className="font-medium">View Requisition</span></div>
                <ChevronDown size={16} className={`${openMenu === 'viewRequisition' ? 'rotate-180' : ''} transition-transform`} />
              </button>
              <div className={`mt-2 pl-3 space-y-1 ${openMenu === 'viewRequisition' ? 'block' : 'hidden'}`}>
                <Item to="/requisitions" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>List of Requisitions</Item>
                <Item to="/approved-requisitions" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>Approved Requisitions</Item>
                <Item to="/add-notes" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>Add Notes</Item>
                <Item to="/advertisement-records" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>Advertisement Records</Item>
                <Item to="/annex-a" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>List of Annex A</Item>
              </div>
            </div>

            <Item to="/job-creation" icon={<FileText size={18} />}>Job Creation Form</Item>

            <div>
              <button onClick={() => toggleMenu('dispatch')} className="flex items-center justify-between w-full px-3 py-2 rounded-md text-emerald-700 hover:bg-emerald-50">
                <div className="flex items-center gap-3"><Inbox size={18} /><span className="font-medium">Dispatch</span></div>
                <ChevronDown size={16} className={`${openMenu === 'dispatch' ? 'rotate-180' : ''} transition-transform`} />
              </button>
              <div className={`mt-2 pl-3 space-y-1 ${openMenu === 'dispatch' ? 'block' : 'hidden'}`}>
                <Item to="/dispatch/received" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>List of Received</Item>
                <Item to="/dispatch/sent" icon={<span className="w-2 h-2 bg-emerald-400 rounded-full" />} compact>List of Dispatch</Item>
              </div>
            </div>

            <Item to="/psc-table" icon={<Table size={18} />}>PSC Table</Item>
          </nav>

          <div className="mt-4 pt-3 border-t">
            <div className="text-xs text-emerald-500">Logged in as</div>
            <div className="font-medium text-emerald-800">Administrator</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;