import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Login from "./pages/Auth/Login/Login";
import Register from "./pages/Auth/Register/Register";

// Protected Route
import ProtectedRoute from "./middlewares/ProtectedRoute";

// Protected Pages (Create these if they don't exist)
// import Dashboard from "./pages/Dashboard/Dashboard";
// import Profile from "./pages/Profile/Profile";
// import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes - Uncomment after creating pages */}
        {/* <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route path="/forgot-password" element={<ForgotPassword />} /> */}

        {/* 404 Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Protected Routes Setup Guide
 * 
 * 1. Create pages that should be protected:
 *    src/pages/Dashboard/Dashboard.jsx
 *    src/pages/Profile/Profile.jsx
 * 
 * 2. Import them:
 *    import Dashboard from "./pages/Dashboard/Dashboard";
 *    import Profile from "./pages/Profile/Profile";
 * 
 * 3. Wrap them in ProtectedRoute:
 *    <Route 
 *      path="/dashboard" 
 *      element={
 *        <ProtectedRoute>
 *          <Dashboard />
 *        </ProtectedRoute>
 *      } 
 *    />
 * 
 * 4. Users will be redirected to login if not authenticated
 * 
 * Example Protected Page:
 * 
 * import React from "react";
 * import AuthService from "../../../services/authService";
 * 
 * export default function Dashboard() {
 *   const user = AuthService.getUser();
 * 
 *   const handleLogout = () => {
 *     AuthService.logout();
 *     window.location.href = "/";
 *   };
 * 
 *   return (
 *     <div className="dashboard">
 *       <h1>Welcome, {user?.username}!</h1>
 *       <p>CNIC: {user?.cnic}</p>
 *       <button onClick={handleLogout}>Logout</button>
 *     </div>
 *   );
 * }
 */
