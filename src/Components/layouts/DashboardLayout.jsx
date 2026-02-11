import React from 'react';
import { Outlet } from 'react-router-dom';
import Layout from './Master';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = () => {
  return (
    <Layout Sidebar={<Sidebar />} Navbar={<Navbar />}>
      <Outlet />
    </Layout>
  );
};

export default DashboardLayout;
