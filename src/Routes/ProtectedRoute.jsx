import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Uses AuthContext for global auth state
 * 
 * Usage:
 * <Route element={<ProtectedRoute><Dashboard /></ProtectedRoute>} path="/dashboard" />
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show nothing while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
