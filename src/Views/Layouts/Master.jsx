const Master = ({ Sidebar, Navbar, children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Sidebar for desktop, drawer for mobile */}
      {Sidebar}

      {/* Main content */}
      <div className="flex-1 md:ml-72 transition-all duration-300">
        {/* Navbar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          {Navbar}
        </div>

        {/* Page Content */}
        <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Master;