import React from "react";

const Master = ({ Sidebar, Navbar, children }) => {
  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        {/* Sidebar */}
        {Sidebar}

        <div className="layout-page">
          {/* Navbar */}
          {Navbar}

          <div className="content-wrapper">
            {/* Main Content */}
            {children}

            <div className="content-backdrop fade"></div>
          </div>
        </div>
      </div>

      <div className="layout-overlay layout-menu-toggle"></div>
      <div className="drag-target"></div>
    </div>
  );
};

export default Master;
