import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MentorDashboard = () => {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState({ interns: [], pending: 0 });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [summaryResponse, requestsResponse] = await Promise.all([
          api.get('/mentor/dashboard-summary'),
          api.get('/mentor/internship-requests')
        ]);
        const data = summaryResponse.data || {};
        setSummary({
          interns: data.interns || data.internships || data.data?.interns || [],
          pending: data.pending || data.pendingEvaluations || 0
        });
        setRequests(requestsResponse.data?.requests || []);
      } catch (error) {
        if (error.response?.status === 401) {
          logout();
          return;
        }
        setError(error.response?.data?.message || 'Unable to load data.');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [logout]);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Mentor Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.name || 'Mentor'}</span>
          <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card stat-interns">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <h3>Interns Assigned</h3>
            <p className="stat-number">{summary.interns.length}</p>
          </div>
        </div>

        <div className="stat-card stat-tasks">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Tasks Assigned</h3>
            <p className="stat-number">{summary.interns.reduce((total, intern) => total + (intern.pending_tasks || intern.pending || 0), 0)}</p>
          </div>
        </div>

        <div className="stat-card stat-evaluations">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>Pending Evaluations</h3>
            <p className="stat-number">{summary.pending}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2>Internship Requests</h2>
          {requests.length === 0 ? <p>No internship requests.</p> : (
            <div className="table-container"><table className="data-table"><thead><tr><th>Intern</th><th>Internship</th><th>Status</th></tr></thead><tbody>
              {requests.map((request) => <tr key={request.id || request._id}><td>{request.intern_id?.name || request.intern?.name || 'Intern'}</td><td>{request.internship_id?.role_name || request.internship?.role_name || 'Internship'}</td><td>{request.status || 'PENDING'}</td></tr>)}
            </tbody></table></div>
          )}
        </section>

        <section className="dashboard-section">
          <h2>My Interns</h2>
          {summary.interns.length === 0 ? <p>No interns assigned yet.</p> : (
            <div className="table-container"><table className="data-table"><thead><tr><th>Intern</th><th>Internship</th><th>Performance</th><th>Sentiment</th><th>Report</th></tr></thead><tbody>
              {summary.interns.map((intern) => <tr key={intern.id || intern._id}><td>{intern.name || intern.intern?.name || 'Intern'}</td><td>{intern.internship?.role_name || intern.role_name || 'N/A'}</td><td>{intern.performance_score ?? intern.performance?.overall_score ?? 'N/A'}</td><td>{intern.sentiment?.sentiment || intern.sentiment_result || 'N/A'}</td><td>{intern.report_id || intern.report ? 'Available' : 'N/A'}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MentorDashboard;