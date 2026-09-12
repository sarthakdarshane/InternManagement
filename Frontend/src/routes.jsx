import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AdminDashboard from "./pages/admin/AdminDashboard";
import HRDashboard from "./pages/hr/HRDashboard";
import MentorDashboard from "./pages/mentor/MentorDashboard";
import InternDashboard from "./pages/intern/InternDashboard";
import CompanyList from "./pages/admin/CompanyList";
import CompanyForm from "./pages/admin/CompanyForm";
import InternshipList from "./pages/admin/InternshipList";
import UserList from "./pages/admin/UserList";
import TaskForm from "./pages/mentor/TaskForm";
import InternTaskForm from "./pages/intern/TaskForm";
import DailyUpdateForm from "./pages/intern/DailyUpdateForm";
import DailyUpdateList from "./pages/intern/DailyUpdateList";
import TaskList from "./pages/intern/TaskList";
import OfferLetterUpload from "./pages/intern/OfferLetterUpload";
import EvaluationView from "./pages/intern/EvaluationView";
import PerformanceView from "./pages/intern/PerformanceView";
import ReportView from "./pages/intern/ReportView";
import SentimentView from "./pages/intern/SentimentView";
import Login from "./pages/Login";
import Register from "./pages/Register";

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
  const roleRoutes = { ADMIN: "/admin/dashboard", HR: "/hr/dashboard", MENTOR: "/mentor/dashboard", INTERN: "/intern/dashboard" };
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
      
      {/* Admin Routes */}
      <Route path="/admin/*" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/companies" element={<ProtectedRoute allowedRoles={["ADMIN"]}><CompanyList /></ProtectedRoute>} />
      <Route path="/admin/company" element={<ProtectedRoute allowedRoles={["ADMIN"]}><CompanyForm /></ProtectedRoute>} />
      <Route path="/admin/company/:id" element={<ProtectedRoute allowedRoles={["ADMIN"]}><CompanyForm /></ProtectedRoute>} />
      
      {/* HR Routes */}
      <Route path="/hr/*" element={<ProtectedRoute allowedRoles={["ADMIN", "HR"]}><HRDashboard /></ProtectedRoute>} />
      <Route path="/hr/company" element={<ProtectedRoute allowedRoles={["ADMIN", "HR"]}><CompanyForm /></ProtectedRoute>} />
      <Route path="/hr/internship" element={<ProtectedRoute allowedRoles={["ADMIN", "HR"]}><EmptyPage title="Create Internship" message="Internship form coming soon..." /></ProtectedRoute>} />
      <Route path="/hr/internships" element={<ProtectedRoute allowedRoles={["ADMIN", "HR"]}><EmptyPage title="Internships" message="Internships list coming soon..." /></ProtectedRoute>} />
      <Route path="/hr/tasks" element={<ProtectedRoute allowedRoles={["ADMIN", "HR"]}><EmptyPage title="Tasks" message="Tasks list coming soon..." /></ProtectedRoute>} />
      
      {/* Mentor Routes */}
      <Route path="/mentor/*" element={<ProtectedRoute allowedRoles={["ADMIN", "MENTOR"]}><MentorDashboard /></ProtectedRoute>} />
      <Route path="/mentor/task" element={<ProtectedRoute allowedRoles={["ADMIN", "MENTOR"]}><TaskForm /></ProtectedRoute>} />
      <Route path="/mentor/tasks" element={<ProtectedRoute allowedRoles={["ADMIN", "MENTOR"]}><EmptyPage title="My Tasks" message="My tasks list coming soon..." /></ProtectedRoute>} />
      <Route path="/mentor/evaluation" element={<ProtectedRoute allowedRoles={["ADMIN", "MENTOR"]}><EmptyPage title="Create Evaluation" message="Evaluation form coming soon..." /></ProtectedRoute>} />
      <Route path="/mentor/evaluations" element={<ProtectedRoute allowedRoles={["ADMIN", "MENTOR"]}><EmptyPage title="Evaluations" message="Evaluations list coming soon..." /></ProtectedRoute>} />
      
      {/* Intern Routes */}
      <Route path="/intern/*" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><InternDashboard /></ProtectedRoute>} />
      <Route path="/intern/task" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><InternTaskForm /></ProtectedRoute>} />
      <Route path="/intern/tasks" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><EmptyPage title="My Tasks" message="My tasks list coming soon..." /></ProtectedRoute>} />
      <Route path="/intern/daily-update" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><DailyUpdateForm /></ProtectedRoute>} />
      <Route path="/intern/updates" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><EmptyPage title="My Updates" message="Daily updates list coming soon..." /></ProtectedRoute>} />
      <Route path="/intern/evaluation" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><EmptyPage title="My Evaluation" message="View your evaluation here..." /></ProtectedRoute>} />
      <Route path="/intern/performance" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><EmptyPage title="My Performance" message="View your performance metrics here..." /></ProtectedRoute>} />
      <Route path="/intern/report" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><EmptyPage title="My Reports" message="View your reports here..." /></ProtectedRoute>} />
      <Route path="/intern/sentiment" element={<ProtectedRoute allowedRoles={["ADMIN", "INTERN"]}><EmptyPage title="Sentiment Analysis" message="View your sentiment analysis here..." /></ProtectedRoute>} />
      
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default RoutesConfig;