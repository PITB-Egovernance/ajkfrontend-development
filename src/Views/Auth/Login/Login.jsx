import React, { useState } from "react";
import "../Login/Login.css" // custom CSS file
import Config from "../../../Config/Baseurl";
export default function Login() {

   console.log("Config Productio url", )
  const [captchaUrl, setCaptchaUrl] = useState(
    `${Config.productionUrl}/captcha/generate?t=` + Date.now()
  );

  const refreshCaptcha = () => {
    setCaptchaUrl(`${Config.productionUrl}/captcha/generate?t=` + Date.now());
  };

  const handleCnicInput = (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 13);
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
        <h5 className="login-title mb-3 text-center">
          Azad Jammu & Kashmir (AJ&K-PSC)
        </h5>

        <form className="mb-4">
          {/* CNIC */}
          <div className="form-floating form-floating-outline mb-4">
            <input
              type="text"
              className="form-control cnic-input"
              id="cnic"
              maxLength="13"
              pattern="\d{13}"
              placeholder="Enter your CNIC"
              onInput={handleCnicInput}
            />
            <label htmlFor="cnic" className="text-green">
              CNIC
            </label>
          </div>

          {/* Password */}
          <div className="mb-4 form-password-toggle">
            <div className="input-group input-group-merge">
              <div className="form-floating form-floating-outline">
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  placeholder="············"
                />
                <label htmlFor="password" className="text-green">
                  Password
                </label>
              </div>
              <span className="input-group-text cursor-pointer">
                <i className="bi bi-eye-slash"></i>
              </span>
            </div>
          </div>

          {/* CAPTCHA */}
          <div className="mb-4">
            <label className="form-label">CAPTCHA</label>

            <div className="captcha-wrapper d-flex align-items-center gap-2 flex-wrap">
              {/* CAPTCHA Image */}
              <img
                src={captchaUrl}
                id="captcha-image"
                alt="CAPTCHA"
                className="captcha-img"
              />

              {/* Input */}
              <input
                type="text"
                name="captcha"
                className="form-control captcha-input"
                placeholder="Enter text"
                required
              />

              {/* Refresh Button */}
              <button
                type="button"
                className="btn btn-outline-primary btn-sm rounded-md captcha-refresh-btn"
                onClick={refreshCaptcha}
              >
                <i className="bi bi-arrow-clockwise fs-5"></i>
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="mb-4 d-flex justify-content-between">
            <div className="form-check mt-1">
              <input className="form-check-input" type="checkbox" id="remember-me" />
              <label className="form-check-label text-gray" htmlFor="remember-me">
                Remember Me
              </label>
            </div>

            <a href="/forgot-password" className="text-green mt-1">
              Forgot Password?
            </a>
          </div>

          {/* Login Button */}
          <button className="btn login-btn d-grid w-100 mb-4" type="submit">
            Login
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
          <a href="#" className="btn btn-icon rounded-circle btn-text-facebook">
            <i className="bi bi-facebook"></i>
          </a>
          <a href="#" className="btn btn-icon rounded-circle btn-text-twitter">
            <i className="bi bi-twitter"></i>
          </a>
          <a href="#" className="btn btn-icon rounded-circle btn-text-github">
            <i className="bi bi-github"></i>
          </a>
          <a href="#" className="btn btn-icon rounded-circle btn-text-google">
            <i className="bi bi-google"></i>
          </a>
        </div>
      </div>

      {/* Background Mask Image */}
      {/* <img
        alt="mask"
        src="/assets/img/illustrations/auth-basic-login-mask-light.png"
        className="authentication-image d-none d-lg-block"
      /> */}
    </div>
  );
}
