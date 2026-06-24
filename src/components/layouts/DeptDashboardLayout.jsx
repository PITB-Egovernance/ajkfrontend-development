import React, { memo } from 'react';
import { Outlet } from 'react-router-dom';
import Layout from './Master';
import DeptSidebar from './DeptSidebar';
import Navbar from './Navbar';

const MemoizedSidebar = memo(DeptSidebar);
const MemoizedNavbar = memo(Navbar);

const DeptDashboardLayout = () => {
  return (
    <Layout Sidebar={<MemoizedSidebar />} Navbar={<MemoizedNavbar />}>
      <Outlet />
    </Layout>
  );
};

export default memo(DeptDashboardLayout);