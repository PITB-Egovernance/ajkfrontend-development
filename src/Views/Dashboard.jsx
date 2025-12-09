import React from "react";
import Layout from './Layouts/Master';
import Sidebar from "./Layouts/Sidebar";
import Navbar from "./Layouts/Navbar";
// import Footer from "./Footer";

const Dashboard = () => {
  return (
     <Layout Sidebar={<Sidebar />} Navbar={<Navbar />}>
      <div className="container-xxl flex-grow-1 container-p-y">
        <h1>Dashboard</h1>
        <p>Welcome to the admin panel!</p>
      </div>
    </Layout>
  );
};

export default Dashboard;
