import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const InternDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ tasks: 0, completedTasks: 0, pendingTasks: 0, hours: 0, updates: 0 });
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksRes, updatesRes, internshipRes] = await Promise.all([
          api.get('/tasks/my-tasks'),
          api.get('/daily-updates/my-updates'),
          api.get('/internships/my-internship')
        ]);
        const tasks = tasksRes.data.tasks || [];
        const updates = updatesRes.data.dailyUpdates || [];
        setStats({
          tasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
          pendingTasks: tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
          hours: updates.reduce((sum, u) => sum + (u.hours_worked || 0), 0),
          updates: updates.length
        });
        setInternship(internshipRes.data.internship || null);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    loadData();
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
        <h1>Intern Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.name || 'Intern'}</span>
          <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card stat-tasks">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Total Tasks</h3>
            <p className="stat-number">{stats.tasks}</p>
          </div>
        </div>

        <div className="stat-card stat-completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Completed</h3>
            <p className="stat-number">{stats.completedTasks}</p>
          </div>
        </div>

        <div className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending</h3>
            <p className="stat-number">{stats.pendingTasks}</p>
          </div>
        </div>

        <div className="stat-card stat-hours">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>Hours Logged</h3>
            <p className="stat-number">{stats.hours}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2>My Internship</h2>
          {internship ? (
            <div className="internship-card">
              <h4>Internship: {internship.role_name}</h4>
              <p><strong>Company:</strong> {internship.company_id?.name || 'N/A'}</p>
              <p><strong>Status:</strong> <span className={`status-badge status-${internship.status}`}>{internship.status}</span></p>
              <p><strong>Start Date:</strong> {new Date(internship.start_date).toLocaleDateString()}</p>
              {internship.end_date && <p><strong>End Date:</strong> {new Date(internship.end_date).toLocaleDateString()}</p>}
              
              <div className="offer-letter-section">
                <h5>📄 Offer Letter</h5>
                {internship.offer_letter?.url ? (
                  <div className="offer-letter-info">
                    <p className="success-text">✅ Offer letter uploaded</p>
                    <Link to={`/intern/offer-letter/${internship._id}`} className="btn btn-primary">View/Manage</Link>
                  </div>
                ) : (
                  <div className="offer-letter-info">
                    <p className="warning-text">📝 No offer letter uploaded yet</p>
                    <Link to={`/intern/offer-letter/${internship._id}`} className="btn btn-success">Upload Offer Letter</Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No active internship found.</p>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/intern/task" className="btn btn-primary">Create Task</Link>
            <Link to="/intern/daily-update" className="btn btn-success">Daily Update</Link>
            <Link to="/intern/tasks" className="btn btn-secondary">View My Tasks</Link>
            <Link to="/intern/updates" className="btn btn-warning">View Updates</Link>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>My Tasks</h2>
          <div className="task-list">
            <div className="empty-state">
              <p>No tasks assigned yet.</p>
              <Link to="/intern/tasks" className="btn btn-primary">View Tasks</Link>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>Quick Links</h2>
          <div className="quick-links">
            <Link to="/intern/evaluation" className="link-card">
              <span className="link-icon">⭐</span>
              <span className="link-text">View Evaluation</span>
            </Link>
            <Link to="/intern/performance" className="link-card">
              <span className="link-icon">📊</span>
              <span className="link-text">View Performance</span>
            </Link>
            <Link to="/intern/report" className="link-card">
              <span className="link-icon">📄</span>
              <span className="link-text">View Reports</span>
            </Link>
            <Link to="/intern/sentiment" className="link-card">
              <span className="link-icon">😊</span>
              <span className="link-text">Sentiment Analysis</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InternDashboard;