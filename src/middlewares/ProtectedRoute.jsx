import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { getDefaultDashboardPath, getUserRole, hasAnyRole } from "utils/roleUtils";

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Uses AuthContext for global auth state
 * 
 * Usage:
 * <Route element={<ProtectedRoute><Dashboard /></ProtectedRoute>} path="/dashboard" />
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show nothing while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = getUserRole(user);
  const isRoleAllowed = hasAnyRole(userRole, allowedRoles);

  if (!isRoleAllowed) {
    return <Navigate to={getDefaultDashboardPath(userRole)} replace />;
  }

  return children;
}
