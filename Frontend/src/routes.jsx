import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/admin/AdminDashboard';
import HRDashboard from './pages/hr/HRDashboard';
import MentorDashboard from './pages/mentor/MentorDashboard';
import InternDashboard from './pages/intern/InternDashboard';
import CompanyList from './pages/admin/CompanyList';
import CompanyForm from './pages/admin/CompanyForm';
import InternshipList from './pages/admin/InternshipList';
import UserList from './pages/admin/UserList';
import DailyUpdateForm from './pages/intern/DailyUpdateForm';
import DailyUpdateList from './pages/intern/DailyUpdateList';
import TaskList from './pages/intern/TaskList';
import OfferLetterUpload from './pages/intern/OfferLetterUpload';
import EvaluationView from './pages/intern/EvaluationView';
import PerformanceView from './pages/intern/PerformanceView';
import ReportView from './pages/intern/ReportView';
import SentimentView from './pages/intern/SentimentView';
import Login from './pages/Login';
import Register from './pages/Register';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" />;
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const roleRoutes = { SUPERADMIN: "/admin/dashboard", ADMIN: "/hr/dashboard", MENTOR: "/mentor/dashboard", INTERN: "/intern/dashboard" };
  return <Navigate to={roleRoutes[user.role] || "/login"} />;
};

const EmptyPage = ({ title, message }) => (
  <div className="page">
    <header className="page-header"><h1>{title}</h1></header>
    <div className="empty-state"><p>{message}</p></div>
  </div>
);

const RoutesConfig = ({ user }) => {
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      
      {/* Superadmin Routes (old ADMIN pages) */}
      <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["SUPERADMIN"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/companies" element={<ProtectedRoute allowedRoles={["SUPERADMIN"]}><CompanyList /></ProtectedRoute>} />
      <Route path="/admin/company" element={<ProtectedRoute allowedRoles={["SUPERADMIN"]}><CompanyForm /></ProtectedRoute>} />
      <Route path="/admin/company/:id" element={<ProtectedRoute allowedRoles={["SUPERADMIN"]}><CompanyForm /></ProtectedRoute>} />
      <Route path="/admin/internships" element={<ProtectedRoute allowedRoles={["SUPERADMIN"]}><InternshipList /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["SUPERADMIN"]}><UserList /></ProtectedRoute>} />
      
      {/* Admin Routes (old HR pages) */}
      <Route path="/hr/*" element={<ProtectedRoute allowedRoles={["ADMIN"]}><HRDashboard /></ProtectedRoute>} />
      <Route path="/hr/internships" element={<ProtectedRoute allowedRoles={["ADMIN"]}><InternshipList /></ProtectedRoute>} />
      <Route path="/hr/internship" element={<ProtectedRoute allowedRoles={["ADMIN"]}><InternshipList /></ProtectedRoute>} />
      
      {/* Mentor Routes */}
      <Route path="/mentor/*" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "MENTOR"]}><MentorDashboard /></ProtectedRoute>} />
      <Route path="/mentor/tasks" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "MENTOR"]}><TaskList /></ProtectedRoute>} />
      <Route path="/mentor/evaluations" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "MENTOR"]}><EmptyPage title="Evaluations" message="Evaluations list coming soon..." /></ProtectedRoute>} />
      
      {/* Intern Routes */}
      <Route path="/intern/*" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><InternDashboard /></ProtectedRoute>} />
      <Route path="/intern/tasks" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><TaskList /></ProtectedRoute>} />
      <Route path="/intern/daily-update" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><DailyUpdateForm /></ProtectedRoute>} />
      <Route path="/intern/updates" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><DailyUpdateList /></ProtectedRoute>} />
      <Route path="/intern/evaluation" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><EvaluationView /></ProtectedRoute>} />
      <Route path="/intern/performance" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><PerformanceView /></ProtectedRoute>} />
      <Route path="/intern/report" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><ReportView /></ProtectedRoute>} />
      <Route path="/intern/sentiment" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><SentimentView /></ProtectedRoute>} />
      <Route path="/intern/offer-letter/:id" element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "INTERN"]}><OfferLetterUpload /></ProtectedRoute>} />
      
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default RoutesConfig;