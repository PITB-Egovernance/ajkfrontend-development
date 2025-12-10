// Services/AuthService.js  ← FINAL VERSION WITH CAPTCHA SUPPORT

import Config from "../Config/Baseurl";
const API_URL = Config.apiUrl;

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

  // ──────────────────────────────────────────────────────
  // CAPTCHA – ADD THESE TWO METHODS BACK
  // ──────────────────────────────────────────────────────
  static async generateCaptcha() {
    const response = await fetch(`${API_URL}/captcha-image`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to load CAPTCHA");
    return result; // expected: { image: "data:image/png;base64,...", token: "xxx" }
  }

  static async validateCaptcha(data) {
    const response = await fetch(`${API_URL}/captcha-validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
    if (result.token) {
      localStorage.setItem("authToken", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
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