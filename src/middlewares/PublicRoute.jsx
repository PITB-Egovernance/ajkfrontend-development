import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 * Used for login and register pages
 * Uses AuthContext for global auth state
 * 
 * Usage:
 * <Route element={<PublicRoute><Login /></PublicRoute>} path="/login" />
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show nothing while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}
