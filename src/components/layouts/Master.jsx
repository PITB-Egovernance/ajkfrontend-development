import React, { useMemo, useState } from 'react';
import { useSidebar } from 'context/SidebarContext';
import { FullPageFormContext } from 'context/FullPageFormContext';

const Master = ({ Sidebar, Navbar, children }) => {
  const { isOpen, toggleSidebar, setIsOpen } = useSidebar();

  // Full-page forms (see components/ui/FormDialog.jsx) render into `slot` and ask us to
  // hide the page they cover. The page stays mounted so its state is preserved.
  const [slot, setSlot] = useState(null);
  const [fullPageActive, setFullPageActive] = useState(false);
  const fullPageValue = useMemo(() => ({ slot, setActive: setFullPageActive }), [slot]);

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
        <main className="form-fill-width p-4 sm:p-6 lg:p-8">
          <FullPageFormContext.Provider value={fullPageValue}>
            <div className={fullPageActive ? 'hidden' : undefined}>{children}</div>
            <div ref={setSlot} />
          </FullPageFormContext.Provider>
        </main>
      </div>
    </div>
  );
};

export default Master;
