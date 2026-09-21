import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const InternDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ tasks: 0, completedTasks: 0, pendingTasks: 0, hours: 0, updates: 0 });
  const [tasks, setTasks] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [internship, setInternship] = useState(null);
  const [availableInternships, setAvailableInternships] = useState([]);
  const [showAvailable, setShowAvailable] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const todaysTasks = tasks.filter((task) => {
    const taskDate = task.task_date || task.assigned_date;
    return taskDate && new Date(taskDate).toDateString() === today.toDateString();
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const results = await Promise.allSettled([
          api.get('/tasks/my-tasks'),
          api.get('/daily-updates/my-updates'),
          api.get('/internships/my-internship'),
          api.get('/internships/available')
        ]);

        let authError = null;
        let backendMessage = null;

        const tasksResult = results[0];
        const updatesResult = results[1];
        const internshipResult = results[2];
        const availableResult = results[3];

        const tasks = (tasksResult.status === 'fulfilled' && tasksResult.value?.data?.tasks) || [];
        const updates = (updatesResult.status === 'fulfilled' && updatesResult.value?.data?.dailyUpdates) || [];
        const internshipApiResponse = (internshipResult.status === 'fulfilled' && internshipResult.value?.data) || null;

        setTasks(tasks);
        setUpdates(updates);

        setStats({
          tasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
          pendingTasks: tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
          hours: updates.reduce((sum, u) => sum + (u.hours_worked || 0), 0),
          updates: updates.length
        });

        let internshipApiError = null;

        if (internshipApiResponse) {
          if (internshipApiResponse.success === false) {
            internshipApiError = internshipApiResponse.message || 'Failed to load internship data';
          }
          setInternship(internshipApiResponse.internship || null);
        }
        if (availableResult.status === 'fulfilled') {
          const available = availableResult.value?.data?.internships || [];
          setAvailableInternships(available);
          if (available.some((item) => item.my_request_status === 'PENDING')) {
            setRequestStatus('PENDING');
          }
        }

        for (const result of results) {
          if (result.status === 'rejected') {
            const error = result.reason;
            if (error?.response) {
              const status = error.response.status;
              const data = error.response.data;
              if (status === 401) {
                authError = 'Session expired. Please log in again.';
              } else if (data && data.message) {
                backendMessage = data.message;
              }
            } else {
              backendMessage = error?.message || 'Failed to load dashboard data';
            }
          }
        }

        setLoading(false);

        if (authError) {
          setError(authError);
          logout();
          return;
        }

        if (internshipApiError) {
          setError(internshipApiError);
          return;
        }

        if (backendMessage) {
          setError(backendMessage);
          return;
        }

        if (results.every(r => r.status === 'fulfilled') === false && !authError) {
          setError(backendMessage || 'Failed to load dashboard data');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    loadData();
  }, [logout]);

  const loadAvailableInternships = async () => {
    setRequestError('');
    setShowAvailable(true);
    try {
      const response = await api.get('/internships/available');
      setAvailableInternships(response.data.internships || []);
    } catch (error) {
      setRequestError(error.response?.status === 403
        ? 'Only interns can browse available internships.'
        : error.response?.data?.message || 'Unable to load available internships.');
    }
  };

  const refreshInternshipState = async () => {
    const response = await api.get('/internships/my-internship');
    setInternship(response.data.internship || null);
    return response.data.internship || null;
  };

  const requestInternship = async (internshipId) => {
    setRequestingId(internshipId);
    setRequestError('');
    try {
      await api.post(`/internships/${internshipId}/request`);
      setRequestStatus('PENDING');
      setShowAvailable(false);
      await refreshInternshipState();
    } catch (error) {
      if (error.response?.status === 409) {
        setRequestStatus('PENDING');
        setRequestError('You already have a pending or active internship request.');
        await refreshInternshipState();
      } else {
        setRequestError(error.response?.data?.message || 'Unable to request this internship.');
      }
    } finally {
      setRequestingId(null);
    }
  };

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
                    <Link to={`/intern/offer-letter/${internship.id || internship._id}`} className="btn btn-primary">View/Manage</Link>
                  </div>
                ) : (
                  <div className="offer-letter-info">
                    <p className="warning-text">📝 No offer letter uploaded yet</p>
                    <Link to={`/intern/offer-letter/${internship.id || internship._id}`} className="btn btn-success">Upload Offer Letter</Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No Active Internship</h3>
              {requestStatus === 'PENDING' ? (
                <p>Internship Request<br />Status: Pending Approval</p>
              ) : (
                <>
                  <p>You don't currently have an internship.</p>
                  <button className="btn btn-primary" onClick={loadAvailableInternships}>Add Internship</button>
                </>
              )}
            </div>
          )}
          {requestError && <div className="error-message">{requestError}</div>}
          {showAvailable && !internship && requestStatus !== 'PENDING' && (
            <div className="available-internships">
              <h3>Available Internships</h3>
              {availableInternships.length === 0 ? <p>No internships are currently available.</p> : availableInternships.map((available) => (
                <div className="internship-card" key={available.id || available._id}>
                  <h4>{available.company?.name || available.company_id?.name || 'Company'}</h4>
                  <p><strong>Role:</strong> {available.role_name}</p>
                  <p><strong>Start Date:</strong> {new Date(available.start_date).toLocaleDateString()}</p>
                  {available.end_date && <p><strong>End Date:</strong> {new Date(available.end_date).toLocaleDateString()}</p>}
                  {available.description && <p>{available.description}</p>}
                  <button className="btn btn-success" onClick={() => requestInternship(available.id || available._id)} disabled={requestingId !== null}>
                    {requestingId === (available.id || available._id) ? 'Requesting...' : 'Request Internship'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/intern/daily-update" className="btn btn-success">Daily Update</Link>
            <Link to="/intern/tasks" className="btn btn-secondary">View My Tasks</Link>
            <Link to="/intern/updates" className="btn btn-warning">View Updates</Link>
          </div>
        </section>

        <section className="dashboard-section">
          <h2>Today's Task</h2>
          {isWeekend ? (
            <div className="empty-state"><p>Weekend / No task</p><p className="text-muted">Saturday and Sunday are off days.</p></div>
          ) : todaysTasks.length === 0 ? (
            <div className="empty-state"><p>No task scheduled for today.</p></div>
          ) : (
            todaysTasks.slice(0, 1).map((task) => (
              <div className="task-item" key={task.id || task._id}>
                <div className="task-item-main"><p className="task-name">{task.task_name}</p><p className="task-meta">{task.description || 'No description'}</p></div>
                <span className={`status-badge status-${task.status}`}>{task.status}</span>
              </div>
            ))
          )}
        </section>

        <section className="dashboard-section">
          <h2>My Tasks</h2>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks assigned yet.</p>
              <Link to="/intern/tasks" className="btn btn-primary">View Tasks</Link>
            </div>
          ) : (
            <div className="task-list">
              {tasks.slice(0, 5).map(task => (
                <div className="task-item" key={task.id || task._id}>
                  <div className="task-item-main">
                    <p className="task-name">{task.task_name}</p>
                    <p className="task-meta">Assigned: {new Date(task.assigned_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`status-badge status-${task.status}`}>{task.status}</span>
                </div>
              ))}
              {tasks.length > 5 && (
                <div className="empty-state" style={{ marginTop: '12px' }}>
                  <p>And {tasks.length - 5} more task{tasks.length - 5 !== 1 ? 's' : ''}.</p>
                  <Link to="/intern/tasks" className="btn btn-secondary">View All Tasks</Link>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <h2>Recent Daily Updates</h2>
          {updates.length === 0 ? (
            <div className="empty-state">
              <p>No daily updates yet.</p>
              <Link to="/intern/daily-update" className="btn btn-success">Add Daily Update</Link>
            </div>
          ) : (
            <div className="task-list">
              {updates.slice(0, 5).map(update => (
                <div className="task-item" key={update.id || update._id}>
                  <div className="task-item-main">
                    <p className="task-name">{update.task_id?.task_name || 'Daily Update'}</p>
                    <p className="task-meta">{new Date(update.update_date).toLocaleDateString()} • {update.hours_worked || 0}h</p>
                  </div>
                  <span className={`status-badge status-${update.task_id?.status || 'PENDING'}`}>{update.task_id?.status || 'PENDING'}</span>
                </div>
              ))}
              {updates.length > 5 && (
                <div className="empty-state" style={{ marginTop: '12px' }}>
                  <p>And {updates.length - 5} more update{updates.length - 5 !== 1 ? 's' : ''}.</p>
                  <Link to="/intern/updates" className="btn btn-warning">View All Updates</Link>
                </div>
              )}
            </div>
          )}
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