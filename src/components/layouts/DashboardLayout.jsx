import React, { memo } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Layout from './Master';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { canAccessPath } from 'utils/permissions';

const MemoizedSidebar = memo(Sidebar);
const MemoizedNavbar = memo(Navbar);

const NoAccess = () => (
  <div className="flex flex-col items-center justify-center text-center py-24 px-6">
    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
      <ShieldAlert className="w-8 h-8 text-red-500" />
    </div>
    <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
    <p className="text-slate-500 mt-2 max-w-md">
      You don't have permission to access this module. Please contact your administrator
      if you believe this is a mistake.
    </p>
    <Link
      to="/dashboard"
      className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white text-sm font-medium shadow-md"
    >
      Back to Dashboard
    </Link>
  </div>
);

const DashboardLayout = () => {
  const location = useLocation();
  const allowed = canAccessPath(location.pathname);

  return (
    <Layout Sidebar={<MemoizedSidebar />} Navbar={<MemoizedNavbar />}>
      {allowed ? <Outlet /> : <NoAccess />}
    </Layout>
  );
};

export default memo(DashboardLayout);
