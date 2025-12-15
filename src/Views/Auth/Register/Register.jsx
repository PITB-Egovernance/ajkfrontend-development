import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Register/Register.css";
import AuthService from "../../../Services/AuthService";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    cnic: "",
    password: "",
    password_confirmation: "",
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Auto-hide success alert
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
        // Redirect to login after successful registration
        navigate("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, navigate]);

  // Auto-hide error alert
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // CNIC Only Digits
  const handleCnicInput = (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 13);
    setFormData({ ...formData, cnic: e.target.value });
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    // Clear error for this field when user starts typing
    if (errors[id]) {
      setErrors({ ...errors, [id]: "" });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.cnic) {
      newErrors.cnic = "CNIC is required";
    } else if (formData.cnic.length !== 13) {
      newErrors.cnic = "CNIC must be exactly 13 digits";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.password_confirmation) {
      newErrors.password_confirmation = "Confirm password is required";
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await AuthService.register(formData);
      setSuccessMessage("User registered successfully!");
      
      // Reset form
      setFormData({
        username: "",
        cnic: "",
        password: "",
        password_confirmation: "",
      });
      setErrors({});
    } catch (error) {
      setErrorMessage(error.message || "Registration failed. Please try again.");
      
      // Set field-specific errors if provided
      if (error.errors) {
        setErrors(error.errors);
      }
    } finally {
      setLoading(false);
    }
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
          {/* Error Message */}
          {errorMessage && (
            <div className="alert alert-danger alert-dismissible fade show mb-4">
              <strong>Error!</strong> {errorMessage}
              <button
                type="button"
                className="btn-close"
                onClick={() => setErrorMessage("")}
              ></button>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show mb-4">
              <strong>Success!</strong> {successMessage}
              <button
                type="button"
                className="btn-close"
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
                className={`form-control ${errors.username ? "is-invalid" : ""}`}
                id="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={loading}
              />
              <label htmlFor="username" className="register-label">
                Username
              </label>
              {errors.username && (
                <div className="invalid-feedback d-block">{errors.username}</div>
              )}
            </div>

            {/* CNIC */}
            <div className="form-floating mb-4">
              <input
                type="text"
                className={`form-control ${errors.cnic ? "is-invalid" : ""}`}
                id="cnic"
                maxLength="13"
                placeholder="Enter your CNIC"
                onInput={handleCnicInput}
                value={formData.cnic}
                disabled={loading}
              />
              <label htmlFor="cnic" className="register-label">
                CNIC
              </label>
              {errors.cnic && (
                <div className="invalid-feedback d-block">{errors.cnic}</div>
              )}
            </div>

            {/* Password */}
            <div className="input-group input-group-merge mb-4">
              <div className="form-floating flex-grow-1">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${
                    errors.password ? "is-invalid" : ""
                  }`}
                  id="password"
                  placeholder="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label htmlFor="password" className="register-label">
                  Password
                </label>
              </div>
              <span
                className="input-group-text cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`bi ${showPassword ? "bi-eye" : "bi-eye-slash"}`}></i>
              </span>
            </div>
            {errors.password && (
              <div className="invalid-feedback d-block mb-3">{errors.password}</div>
            )}

            {/* Confirm Password */}
            <div className="input-group input-group-merge mb-4">
              <div className="form-floating flex-grow-1">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`form-control ${
                    errors.password_confirmation ? "is-invalid" : ""
                  }`}
                  id="password_confirmation"
                  placeholder="Confirm Password"
                  value={formData.password_confirmation}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label htmlFor="password_confirmation" className="register-label">
                  Confirm Password
                </label>
              </div>
              <span
                className="input-group-text cursor-pointer"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i
                  className={`bi ${
                    showConfirmPassword ? "bi-eye" : "bi-eye-slash"
                  }`}
                ></i>
              </span>
            </div>
            {errors.password_confirmation && (
              <div className="invalid-feedback d-block mb-3">
                {errors.password_confirmation}
              </div>
            )}

            {/* Submit Btn */}
            <button
              type="submit"
              className="btn register-btn w-100 mb-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </button>
          </form>

          {/* Already have account */}
          <p className="text-center mb-4">
            <span className="register-text-muted">Already have an account?</span>{" "}
            <a href="/" className="register-label">
              Login instead
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
