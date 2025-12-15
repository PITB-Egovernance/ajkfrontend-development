import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FileText,
  ClipboardList,
  ChevronDown,
  StickyNote,
  Megaphone,
  BookOpen,
  Briefcase,
  Send,
  Table,
  Package,
} from "lucide-react";

const Sidebar = () => {
  const [openMenu, setOpenMenu] = useState("");
  const location = useLocation();

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? "" : menu);
  };

  const isActive = (path) => location.pathname === path;

  const baseItem =
    "flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 text-sm font-medium";
  const activeItem = "bg-white text-emerald-800 shadow-md";
  const inactiveItem = "text-white/75 hover:bg-white/10 hover:text-white";

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 border-r border-emerald-800/50 shadow-2xl z-50">
      {/* Logo */}
      <div className="flex items-center gap-4 px-6 py-8 border-b border-emerald-800/50">
        <img
          src="/assets/img/favicon/Logo.PNG"
          alt="Logo"
          className="w-11 h-11 object-contain rounded-xl bg-white p-1.5 shadow-md"
        />
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            AJ&K-PSC
          </h1>
          <p className="text-emerald-300 text-xs">Public Service Commission</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-8 px-4 space-y-1.5" aria-label="Main navigation">
        {/* Job Creation Form */}


        {/* View Requisition Dropdown */}
        <button
          onClick={() => toggleMenu("viewRequisition")}
          className={`${baseItem} ${inactiveItem} w-full justify-between`}
          aria-expanded={openMenu === "viewRequisition"}
          aria-controls="menu-view-requisition"
        >
          <div className="flex items-center gap-4">
            <ClipboardList size={20} />
            <span>View Requisition</span>
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ${
              openMenu === "viewRequisition" ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* View Requisition Submenu */}
        <div
          id="menu-view-requisition"
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            openMenu === "viewRequisition" ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
          aria-hidden={openMenu !== "viewRequisition"}
        >
          <div className="space-y-1 mt-1">
            <Link
              to="/dashboard/requisitions"
              className={`${baseItem} text-xs pl-10 ${isActive("/dashboard/requisitions") ? activeItem : inactiveItem}`}
            >
              <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full mr-3" aria-hidden />
              List of Requisitions
            </Link>
            <Link
              to="/dashboard/approved-requisitions"
              className={`${baseItem} text-xs pl-10 ${isActive("/dashboard/approved-requisitions") ? activeItem : inactiveItem}`}
            >
              <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full mr-3" aria-hidden />
              Approved Requisitions
            </Link>
            <Link
              to="/dashboard/add-notes"
              className={`${baseItem} text-xs pl-10 ${isActive("/dashboard/add-notes") ? activeItem : inactiveItem}`}
            >
              <StickyNote size={16} className="ml-1" />
              Add Notes
            </Link>
            <Link
              to="/dashboard/advertisement-records"
              className={`${baseItem} text-xs pl-10 ${isActive("/dashboard/advertisement-records") ? activeItem : inactiveItem}`}
            >
              <Megaphone size={16} className="ml-1" />
              Advertisement Records
            </Link>
            <Link
              to="/dashboard/annex-a"
              className={`${baseItem} text-xs pl-10 ${isActive("/dashboard/annex-a") ? activeItem : inactiveItem}`}
            >
              <BookOpen size={16} className="ml-1" />
              List of Annex "A"
            </Link>
          </div>
        </div>
        <Link
          to="/dashboard/requisition-form"
          className={`${baseItem} ${isActive("/dashboard/requisition-form") ? activeItem : inactiveItem}`}
          title="Job Creation Form"
        >
          <Briefcase size={20} />
          <span>Job Creation Form</span>
        </Link>
        {/* Dispatch Dropdown */}
        <button
          onClick={() => toggleMenu("dispatch")}
          className={`${baseItem} ${inactiveItem} w-full justify-between`}
          aria-expanded={openMenu === "dispatch"}
          aria-controls="menu-dispatch"
        >
          <div className="flex items-center gap-4">
            <Send size={20} />
            <span>Dispatch</span>
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 ${
              openMenu === "dispatch" ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dispatch Submenu */}
        <div
          id="menu-dispatch"
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            openMenu === "dispatch" ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
          }`}
          aria-hidden={openMenu !== "dispatch"}
        >
          <div className="space-y-1 mt-1">
            <Link
              to="/dashboard/dispatch/received"
              className={`${baseItem} text-xs pl-10 ${isActive("/dashboard/dispatch/received") ? activeItem : inactiveItem}`}
            >
              <Package size={16} className="ml-1" />
              List of Received
            </Link>
            <Link
              to="/dashboard/dispatch/sent"
              className={`${baseItem} text-xs pl-10 ${isActive("/dashboard/dispatch/sent") ? activeItem : inactiveItem}`}
            >
              <Send size={16} className="ml-1" />
              List of Dispatch
            </Link>
          </div>
        </div>

        {/* PSC Table */}
        <Link
          to="/dashboard/psc-table"
          className={`${baseItem} ${isActive("/dashboard/psc-table") ? activeItem : inactiveItem}`}
        >
          <Table size={20} />
          <span>PSC Table</span>
        </Link>
      </nav>

      {/* Footer Info */}
      <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
        <p className="text-xs text-emerald-300">Logged in as</p>
        <p className="text-white font-semibold text-sm mt-1">Administrator</p>
      </div>
    </aside>
  );
};

export default Sidebar;