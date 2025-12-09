import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from './Views/Dashboard';
import Login from "./Views/Auth/Login/Login";
import ProtectedRoute from "./Routes/ProtectedAuthRoutes";
import Register from "./Views/Auth/Register/Register";

function App() {
  return (
     <Router>
      <Routes>
        {/* Public page */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected page */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard/>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
