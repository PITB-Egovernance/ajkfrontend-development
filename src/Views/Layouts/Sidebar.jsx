import React, { useState } from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  const [openMenu, setOpenMenu] = useState("");

  const toggleMenu = (menuName) =>
    setOpenMenu(openMenu === menuName ? "" : menuName);

  return (
    <aside
      id="layout-menu"
      className="layout-menu menu-vertical menu"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="app-brand demo">
        <Link to="/" className="app-brand-link">
          <span className="app-brand-logo demo">
            <img
              src={"http://localhost:3000/assets/img/favicon/Logo.png"}
              alt="Logo"
              style={{ width: "50px", height: "70px", objectFit: "contain" }}
            />
          </span>
          <span className="app-brand-text demo menu-text fw-semibold ms-2">
            AJ&K-PSC
          </span>
        </Link>
      </div>

      <div className="menu-inner-shadow"></div>

      <ul className="menu-inner py-1">
        <li className="menu-item">
          <a
            href="#!"
            className="menu-link menu-toggle"
            onClick={() => toggleMenu("viewRequisition")}
          >
            <i className="menu-icon icon-base ri ri-home-smile-line"></i>
            <div>View Requisition</div>
          </a>
          {openMenu === "viewRequisition" && (
            <ul className="menu-sub">
              <li className="menu-item">
                <Link to="/requisitions" className="menu-link">
                  List of Requisitions
                </Link>
              </li>
              <li className="menu-item">
                <Link to="/approved-requisitions" className="menu-link">
                  Approved Requisitions
                </Link>
              </li>
            </ul>
          )}
        </li>

        <li className="menu-item">
          <a
            href="#!"
            className="menu-link menu-toggle"
            onClick={() => toggleMenu("jobCreation")}
          >
            <i className="menu-icon icon-base ri ri-home-smile-line"></i>
            <div>Job Creation</div>
          </a>
          {openMenu === "jobCreation" && (
            <ul className="menu-sub">
              <li className="menu-item">
                <Link to="/job-creation" className="menu-link">
                  Job Creation Form
                </Link>
              </li>
            </ul>
          )}
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
