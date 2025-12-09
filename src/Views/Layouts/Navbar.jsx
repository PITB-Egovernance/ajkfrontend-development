import React, { useState } from "react";
import { Link } from "react-router-dom";

const Navbar = ({ user }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    fetch("/logout", { method: "POST", credentials: "include" })
      .then(() => window.location.reload())
      .catch(console.error);
  };

  return (
    <nav className="layout-navbar container-xxl navbar-detached navbar navbar-expand-xl align-items-center bg-navbar-theme">
      <div className="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0 d-xl-none">
        <a className="nav-item nav-link px-0 me-xl-6" href="#!">
          <i className="icon-base ri ri-menu-line icon-22px"></i>
        </a>
      </div>

      <div className="navbar-nav-right d-flex align-items-center justify-content-end">
        <ul className="navbar-nav flex-row align-items-center ms-md-auto">
          <li className="nav-item navbar-dropdown dropdown-user dropdown">
            <a
              className="nav-link dropdown-toggle hide-arrow"
              href="#!"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="avatar avatar-online">
                <img
                  src="/assets/img/favicon/userlogo.png"
                  alt="avatar"
                  className="rounded-circle"
                />
              </div>
            </a>

            {dropdownOpen && (
              <ul className="dropdown-menu dropdown-menu-end mt-3 py-2 show">
                <li>
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {user?.username || "Guest"}
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="btn btn-sm btn-danger d-flex mt-3"
                  >
                    Logout
                    <i className="icon-base ri ri-logout-box-r-line ms-2 icon-16px"></i>
                  </button>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
