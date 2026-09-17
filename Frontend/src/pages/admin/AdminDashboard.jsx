import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ companies: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const companiesRes = await api.get('/companies');
        setStats({
          companies: companiesRes.data.count || companiesRes.data.companies?.length || 0
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
        <h1>Platform Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.name || 'Admin'}</span>
          <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card stat-companies">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>Companies</h3>
            <p className="stat-number">{stats.companies}</p>
          </div>
        </div>

      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/admin/companies" className="btn btn-primary">Manage Companies</Link>
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