import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "ADMIN": return "/admin/dashboard";
      case "HR": return "/hr/dashboard";
      case "MENTOR": return "/mentor/dashboard";
      case "INTERN": return "/intern/dashboard";
      default: return "/login";
    }
  };

  return (
    <nav style={{ background: "#333", color: "white", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Link to={getDashboardLink()} style={{ color: "white", textDecoration: "none", fontSize: "24px", fontWeight: "bold" }}>InternTracker</Link>
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        {user && (
          <>
            <span style={{ fontSize: "16px" }}>Welcome, {user.name}</span>
            <span style={{ background: "#007bff", padding: "5px 10px", borderRadius: "15px", fontSize: "12px" }}>({user.role})</span>
            <button onClick={handleLogout} style={{ padding: "10px 20px", border: "none", borderRadius: "4px", cursor: "pointer", background: "#6c757d", color: "white" }}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
