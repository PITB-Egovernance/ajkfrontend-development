import React from 'react';
import { useSidebar } from 'context/SidebarContext';

const Master = ({ Sidebar, Navbar, children }) => {
  const { isOpen, toggleSidebar, setIsOpen } = useSidebar();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Sidebar */}
      {React.cloneElement(Sidebar, { isOpen, setIsOpen })}

      {/* Main content */}
      <div 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: isOpen ? '220px' : '50px' }}
      >
        {/* Navbar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm" style={{ marginLeft: 0 }}>
          {React.cloneElement(Navbar, { toggleSidebar })}
        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-8xl mx-auto ">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Master;