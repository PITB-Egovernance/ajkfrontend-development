import React from "react";
import { Navigate } from "react-router-dom";
import AuthService from "Services/AuthService";

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * 
 * Usage:
 * <Route element={<ProtectedRoute><Dashboard /></ProtectedRoute>} path="/dashboard" />
 */
export default function ProtectedRoute({ children }) {
  return AuthService.isAuthenticated() ? children : <Navigate to="/login" replace />;
}
