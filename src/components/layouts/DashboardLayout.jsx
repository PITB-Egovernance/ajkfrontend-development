import React, { memo } from 'react';
import { Outlet } from 'react-router-dom';
import Layout from './Master';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const MemoizedSidebar = memo(Sidebar);
const MemoizedNavbar = memo(Navbar);

const DashboardLayout = () => {
  return (
    <Layout Sidebar={<MemoizedSidebar />} Navbar={<MemoizedNavbar />}>
      <Outlet />
    </Layout>
  );
};

export default memo(DashboardLayout);
