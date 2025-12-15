import React from 'react';
import { Outlet } from 'react-router-dom';
import Layout from './Layouts/Master';
import Sidebar from './Layouts/Sidebar';
import Navbar from './Layouts/Navbar';

const DashboardLayout = () => {
  return (
    <Layout Sidebar={<Sidebar />} Navbar={<Navbar />}>
      <Outlet />
    </Layout>
  );
};

export default DashboardLayout;
