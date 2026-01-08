import React from "react";
import { Navigate } from "react-router-dom";
import AuthService from "Services/AuthService";

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 * Used for login and register pages
 * 
 * Usage:
 * <Route element={<PublicRoute><Login /></PublicRoute>} path="/login" />
 */
export default function PublicRoute({ children }) {
  return AuthService.isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}
