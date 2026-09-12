import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MentorDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ interns: 0, tasks: 0, pendingEvaluations: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [internsRes, tasksRes, evaluationsRes] = await Promise.all([
          api.get('/users?role=INTERN'),
          api.get('/tasks/my-assigned-tasks'),
          api.get('/evaluations/pending')
        ]);
        setStats({
          interns: internsRes.data.users?.length || 0,
          tasks: tasksRes.data.tasks?.length || 0,
          pendingEvaluations: evaluationsRes.data.pending || 0
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
            <p className="stat-number">{stats.interns}</p>
          </div>
        </div>

        <div className="stat-card stat-tasks">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Tasks Assigned</h3>
            <p className="stat-number">{stats.tasks}</p>
          </div>
        </div>

        <div className="stat-card stat-evaluations">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>Pending Evaluations</h3>
            <p className="stat-number">{stats.pendingEvaluations}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/mentor/task" className="btn btn-primary">Create Task</Link>
            <Link to="/mentor/evaluation" className="btn btn-success">Create Evaluation</Link>
            <Link to="/mentor/tasks" className="btn btn-secondary">View My Tasks</Link>
            <Link to="/mentor/evaluations" className="btn btn-warning">View Evaluations</Link>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>My Tasks</h2>
          <div className="task-list">
            <div className="empty-state">
              <p>No tasks assigned yet. Create your first task!</p>
              <Link to="/mentor/task" className="btn btn-primary">Create Task</Link>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">📊</div>
              <div className="activity-content">
                <p>Welcome to your mentor dashboard</p>
                <small>Track interns and evaluations</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MentorDashboard;