import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Login/Login.css";
import AuthService from "../../../Services/AuthService";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    cnic: "",
    password: "",
    captcha: "",
  });

  const [captcha, setCaptcha] = useState({
    token: null,
    image: null,
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load CAPTCHA on component mount
  useEffect(() => {
    loadCaptcha();

    // Check if user was redirected after registration
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered")) {
      setSuccessMessage("Registration successful! Please login.");
    }
  }, []);

  // Auto-hide success alert
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-hide error alert
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Load CAPTCHA
  const loadCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const response = await AuthService.generateCaptcha();
      setCaptcha({
        token: response.captcha_token,
        image: response.captcha_image,
      });
      setFormData({ ...formData, captcha: "" });
      setErrors({ ...errors, captcha: "" });
    } catch (error) {
      setErrorMessage(
        error.message || "Failed to load CAPTCHA. Please try again."
      );
    } finally {
      setLoadingCaptcha(false);
    }
  };

  // CNIC Only Digits
  const handleCnicInput = (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 13);
    setFormData({ ...formData, cnic: e.target.value });
    if (errors.cnic) {
      setErrors({ ...errors, cnic: "" });
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.cnic) {
      newErrors.cnic = "CNIC is required";
    } else if (formData.cnic.length !== 13) {
      newErrors.cnic = "CNIC must be exactly 13 digits";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (!formData.captcha) {
      newErrors.captcha = "CAPTCHA is required";
    } else if (formData.captcha.length < 3) {
      newErrors.captcha = "Please enter the CAPTCHA code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // First validate CAPTCHA
      const captchaResponse = await AuthService.validateCaptcha({
        captcha_token: captcha.token,
        captcha: formData.captcha,
      });

      if (!captchaResponse.success) {
        throw new Error(
          captchaResponse.message || "CAPTCHA validation failed"
        );
      }

      // Then attempt login
      const loginResponse = await AuthService.login({
        cnic: formData.cnic,
        password: formData.password,
      });

      setSuccessMessage("Login successful! Redirecting...");

      // Store user info and redirect after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      setErrorMessage(error.message || "Login failed. Please try again.");

      // If CAPTCHA failed, reload it
      if (
        error.message &&
        error.message.toLowerCase().includes("captcha")
      ) {
        loadCaptcha();
      } else {
        // Still reload captcha for security (one-time use)
        loadCaptcha();
      }

      // Set field-specific errors if provided
      if (error.errors) {
        setErrors(error.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card card p-md-7 p-2">
      {/* Logo */}
      <div className="app-brand justify-content-center mt-4 mb-3 text-center">
        <a href="/" className="app-brand-link gap-2">
          <span className="app-brand-logo">
            <img
              src="/assets/img/favicon/Logo.PNG"
              alt="Logo"
              className="login-logo"
            />
          </span>
        </a>
      </div>

      <div className="card-body mt-1">
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

        <h5 className="login-title mb-3 text-center">
          Azad Jammu & Kashmir (AJ&K-PSC)
        </h5>

        <form onSubmit={handleSubmit} className="mb-4">
          {/* CNIC */}
          <div className="form-floating form-floating-outline mb-4">
            <input
              type="text"
              className={`form-control cnic-input ${
                errors.cnic ? "is-invalid" : ""
              }`}
              id="cnic"
              name="cnic"
              maxLength="13"
              pattern="\d{13}"
              placeholder="Enter your CNIC"
              onInput={handleCnicInput}
              value={formData.cnic}
              disabled={loading}
            />
            <label htmlFor="cnic" className="text-green">
              CNIC
            </label>
            {errors.cnic && (
              <div className="invalid-feedback d-block">{errors.cnic}</div>
            )}
          </div>

          {/* Password */}
          <div className="mb-4 form-password-toggle">
            <div className="input-group input-group-merge">
              <div className="form-floating form-floating-outline flex-grow-1">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className={`form-control ${
                    errors.password ? "is-invalid" : ""
                  }`}
                  placeholder="············"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <label htmlFor="password" className="text-green">
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
              <div className="invalid-feedback d-block">{errors.password}</div>
            )}
          </div>

          {/* CAPTCHA */}
          <div className="mb-4">
            <label className="form-label">CAPTCHA</label>

            <div className="captcha-wrapper d-flex align-items-center gap-2 flex-wrap">
              {/* CAPTCHA Image */}
              {captcha.image ? (
                <img
                  src={captcha.image}
                  id="captcha-image"
                  alt="CAPTCHA"
                  className="captcha-img"
                />
              ) : (
                <div className="captcha-img bg-light d-flex align-items-center justify-content-center">
                  <span className="spinner-border spinner-border-sm"></span>
                </div>
              )}

              {/* Input */}
              <input
                type="text"
                name="captcha"
                className={`form-control captcha-input ${
                  errors.captcha ? "is-invalid" : ""
                }`}
                placeholder="Enter text"
                value={formData.captcha}
                onChange={handleInputChange}
                disabled={loading || loadingCaptcha}
                maxLength="4"
              />

              {/* Refresh Button */}
              <button
                type="button"
                className="btn btn-outline-primary btn-sm rounded-md captcha-refresh-btn"
                onClick={loadCaptcha}
                disabled={loadingCaptcha || loading}
              >
                {loadingCaptcha ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  <i className="bi bi-arrow-clockwise fs-5"></i>
                )}
              </button>
            </div>
            {errors.captcha && (
              <div className="invalid-feedback d-block">{errors.captcha}</div>
            )}
          </div>

          {/* Remember + Forgot */}
          <div className="mb-4 d-flex justify-content-between">
            <div className="form-check mt-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label className="form-check-label text-gray" htmlFor="remember-me">
                Remember Me
              </label>
            </div>

            <a href="/forgot-password" className="text-green mt-1">
              Forgot Password?
            </a>
          </div>

          {/* Login Button */}
          <button
            className="btn login-btn d-grid w-100 mb-4"
            type="submit"
            disabled={loading || loadingCaptcha}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <p className="text-center mb-4">
          <span className="text-gray">New on our platform?</span>{" "}
          <a href="/register" className="text-green">
            Create an account
          </a>
        </p>

        <div className="divider my-4">
          <div className="divider-text">or</div>
        </div>

        <div className="d-flex justify-content-center gap-2">
          <a
            href="#"
            className="btn btn-icon rounded-circle btn-text-facebook"
            onClick={(e) => e.preventDefault()}
          >
            <i className="bi bi-facebook"></i>
          </a>
          <a
            href="#"
            className="btn btn-icon rounded-circle btn-text-twitter"
            onClick={(e) => e.preventDefault()}
          >
            <i className="bi bi-twitter"></i>
          </a>
          <a
            href="#"
            className="btn btn-icon rounded-circle btn-text-github"
            onClick={(e) => e.preventDefault()}
          >
            <i className="bi bi-github"></i>
          </a>
          <a
            href="#"
            className="btn btn-icon rounded-circle btn-text-google"
            onClick={(e) => e.preventDefault()}
          >
            <i className="bi bi-google"></i>
          </a>
        </div>
      </div>
    </div>
  );
}
