import React, { useEffect, useState } from "react";
import "../Register/Register.css";

export default function Register() {
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Auto-hide success alert
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // CNIC Only Digits
  const handleCnicInput = (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 13);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccessMessage("Successfully Registered!");
  };

  return (
    <div className="position-relative">
      <div className="card register-card">
        
        {/* Logo */}
        <div className="text-center mt-3">
          <a href="/" className="app-brand-link">
            <img
              src="/assets/img/favicon/Logo.PNG"
              alt="Logo"
              className="register-logo"
            />
          </a>
        </div>

        <div className="card-body">

          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success-custom alert-dismissible fade show mb-4">
              <strong>{successMessage}</strong>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setSuccessMessage("")}
              ></button>
            </div>
          )}

          <h5 className="mb-3 register-title text-center">
            Azad Jammu & Kashmir (AJ&K-PSC)
          </h5>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mb-4">

            {/* Username */}
            <div className="form-floating mb-4">
              <input
                type="text"
                className="form-control"
                id="username"
                placeholder="Enter your username"
              />
              <label htmlFor="username" className="register-label">
                Username
              </label>
            </div>

            {/* CNIC */}
            <div className="form-floating mb-4">
              <input
                type="text"
                className="form-control"
                id="cnic"
                maxLength="13"
                placeholder="Enter your CNIC"
                onInput={handleCnicInput}
              />
              <label htmlFor="cnic" className="register-label">
                CNIC
              </label>
            </div>

            {/* Password */}
            <div className="input-group input-group-merge mb-4">
              <div className="form-floating flex-grow-1">
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  placeholder="password"
                />
                <label htmlFor="password" className="register-label">
                  Password
                </label>
              </div>
              <span className="input-group-text cursor-pointer">
                <i className="bi bi-eye-slash"></i>
              </span>
            </div>

            {/* Confirm Password */}
            <div className="input-group input-group-merge mb-4">
              <div className="form-floating flex-grow-1">
                <input
                  type="password"
                  className="form-control"
                  id="confirm-password"
                  placeholder="Confirm Password"
                />
                <label htmlFor="confirm-password" className="register-label">
                  Confirm Password
                </label>
              </div>
              <span className="input-group-text cursor-pointer">
                <i className="bi bi-eye-slash"></i>
              </span>
            </div>

            {/* Submit Btn */}
            <button type="submit" className="btn register-btn w-100 mb-4">
              Register
            </button>
          </form>

          {/* Already have account */}
          <p className="text-center mb-4">
            <span className="register-text-muted">Already have an account?</span>{" "}
            <a href="/" className="register-label">Login instead</a>
          </p>

          {/* Divider */}
          <div className="divider my-4"><div className="divider-text">or</div></div>

          {/* Social Icons */}
          <div className="d-flex justify-content-center gap-2 social-icons">
            <a href="#" className="btn btn-outline-secondary d-flex align-items-center justify-content-center">
              <i className="bi bi-facebook"></i>
            </a>
            <a href="#" className="btn btn-outline-secondary d-flex align-items-center justify-content-center">
              <i className="bi bi-twitter"></i>
            </a>
            <a href="#" className="btn btn-outline-secondary d-flex align-items-center justify-content-center">
              <i className="bi bi-github"></i>
            </a>
            <a href="#" className="btn btn-outline-secondary d-flex align-items-center justify-content-center">
              <i className="bi bi-google"></i>
            </a>
          </div>

        </div>
      </div>

      {/* Background Mask
      <img
        src="/assets/img/illustrations/auth-basic-register-mask-light.png"
        alt="mask"
        className="authentication-image d-none d-lg-block"
      /> */}
    </div>
  );
}
