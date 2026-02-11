import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // Check for authToken OR isLoggedIn flag
  const authToken = localStorage.getItem("authToken");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isAuthenticated = !!authToken || isLoggedIn;

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}