import React, { useState } from 'react';

const Master = ({ Sidebar, Navbar, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Sidebar */}
      {React.cloneElement(Sidebar, { isOpen: sidebarOpen, setIsOpen: setSidebarOpen })}

      {/* Main content */}
      <div 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '320px' : '80px' }}
      >
        {/* Navbar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          {React.cloneElement(Navbar, { toggleSidebar: () => setSidebarOpen(!sidebarOpen) })}
        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Master;