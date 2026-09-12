import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ users: 0, companies: 0, internships: 0, tasks: 0, pendingTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, companiesRes, internshipsRes, tasksRes] = await Promise.all([
          api.get('/users'),
          api.get('/companies'),
          api.get('/internships'),
          api.get('/tasks')
        ]);
        setStats({
          users: usersRes.data.count || usersRes.data.length || 0,
          companies: companiesRes.data.count || companiesRes.data.length || 0,
          internships: internshipsRes.data.count || internshipsRes.data.length || 0,
          tasks: tasksRes.data.count || tasksRes.data.length || 0,
          pendingTasks: tasksRes.data.pending || 0
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading stats:', error);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    loadStats();
  }, []);

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
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.name || 'Admin'}</span>
          <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card stat-users">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.users}</p>
          </div>
        </div>

        <div className="stat-card stat-companies">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>Companies</h3>
            <p className="stat-number">{stats.companies}</p>
          </div>
        </div>

        <div className="stat-card stat-internships">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <h3>Internships</h3>
            <p className="stat-number">{stats.internships}</p>
          </div>
        </div>

        <div className="stat-card stat-tasks">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Total Tasks</h3>
            <p className="stat-number">{stats.tasks}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/admin/companies" className="btn btn-primary">Manage Companies</Link>
            <Link to="/admin/users" className="btn btn-secondary">Manage Users</Link>
            <Link to="/admin/internships" className="btn btn-success">View Internships</Link>
            <Link to="/admin/tasks" className="btn btn-warning">View Tasks</Link>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>Quick Links</h2>
          <div className="quick-links">
            <Link to="/admin/reports" className="link-card">
              <span className="link-icon">📊</span>
              <span className="link-text">View Reports</span>
            </Link>
            <Link to="/admin/evaluations" className="link-card">
              <span className="link-icon">⭐</span>
              <span className="link-text">View Evaluations</span>
            </Link>
            <Link to="/admin/daily-updates" className="link-card">
              <span className="link-icon">📝</span>
              <span className="link-text">View Daily Updates</span>
            </Link>
            <Link to="/admin/sentiment" className="link-card">
              <span className="link-icon">😊</span>
              <span className="link-text">View Sentiment Analysis</span>
            </Link>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">📊</div>
              <div className="activity-content">
                <p>System is active and monitoring</p>
                <small>Real-time dashboard</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;