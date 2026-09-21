import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        // Only trust locally cached users with a currently-valid role.
        // Stale/migrated entries are cleared so the user must log in again.
        const VALID_ROLES = ["SUPERADMIN", "ADMIN", "MENTOR", "INTERN"];
        if (VALID_ROLES.includes(parsed?.role)) {
          setUser(parsed);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    if (!token) {
      setLoading(false);
      return;
    }

    api.get("/auth/me")
      .then((response) => {
        const currentUser = response.data.user;
        localStorage.setItem("user", JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { token, user } = response.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    const currentUserResponse = await api.get("/auth/me");
    const currentUser = currentUserResponse.data.user || user;
    localStorage.setItem("user", JSON.stringify(currentUser));
    setUser(currentUser);
    return currentUser;
  };

  const register = async (name, email, password) => {
    const response = await api.post("/auth/register", { name, email, password });
    const { token, user } = response.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
