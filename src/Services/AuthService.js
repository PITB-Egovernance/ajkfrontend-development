// services/authService.js  ← FINAL VERSION WITH CAPTCHA SUPPORT

import Config from 'Config/Baseurl';
const API_URL = Config.apiUrl;
const API_KEY = Config.apiKey;

class AuthService {
  // ──────────────────────────────────────────────────────
  // Register
  // ──────────────────────────────────────────────────────
  static async register(data) {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.message || "Registration failed");
      error.status = response.status;
      error.errors = result.errors || {};
      throw error;
    }

    this._saveAuth(result);
    return result;
  }

  // ──────────────────────────────────────────────────────
  // Login
  // ──────────────────────────────────────────────────────
  static async login(data) {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.message || "Login failed");
      error.status = response.status;
      error.errors = result.errors || {};
      throw error;
    }

    this._saveAuth(result);
    return result;
  }

  static async verifyOtp(data) {
    const response = await fetch(`${API_URL}/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(result.message || "OTP verification failed");
      error.status = response.status;
      error.errors = result.errors || {};
      throw error;
    }

    if (result.success) {
      this._saveAuth(result);
    }

    return result;
  }

  // ──────────────────────────────────────────────────────
  // CAPTCHA – ADD THESE TWO METHODS BACK
  // ──────────────────────────────────────────────────────
  static async generateCaptcha() {
    const response = await fetch(`${API_URL}/captcha/image`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-KEY": API_KEY
      },
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to load CAPTCHA");
    return result; // expected: { captcha_token: "xxx", captcha_image: "data:image/png;base64,..." }
  }

  static async validateCaptcha(data) {
    const response = await fetch(`${API_URL}/captcha/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.message || "CAPTCHA invalid");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  // ──────────────────────────────────────────────────────
  // Logout
  // ──────────────────────────────────────────────────────
  static async logout() {
    try {
      await this.request(`${API_URL}/logout`, { method: "POST" });
    } catch (e) {
      console.warn("Server logout failed (OK for demo)", e.message);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    }
  }

  // ──────────────────────────────────────────────────────
  // Generic authenticated request
  // ──────────────────────────────────────────────────────
  static async request(url, options = {}) {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-KEY": API_KEY,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || "Request failed");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  // ──────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────
  static _saveAuth(result) {
    const data = result?.data || {};
    const token =
      data?.token ||
      data?.access_token ||
      data?.authToken ||
      result?.token ||
      result?.access_token ||
      null;

    const user = data?.user || result?.user || null;

    if (token) {
      localStorage.setItem("authToken", token);
    }

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }

  static getToken() {
    return localStorage.getItem("authToken");
  }

  static getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  static isAuthenticated() {
    return !!this.getToken();
  }
}

export default AuthService;