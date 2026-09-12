import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const DailyUpdateList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUpdates = async () => {
      try {
        const response = await api.get('/daily-updates/my-updates');
        setUpdates(response.data.dailyUpdates || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading updates:', error);
        setError('Failed to load daily updates');
        setLoading(false);
      }
    };
    loadUpdates();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading daily updates...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>My Daily Updates</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
        <Link to="/intern/daily-update" className="btn btn-success" style={{ marginLeft: '10px' }}>+ New Update</Link>
      </header>

      {error && <div className="error-message">{error}</div>}

      {updates.length === 0 ? (
        <div className="empty-state">
          <h3>📝 No Daily Updates</h3>
          <p>Track your daily work by creating daily updates.</p>
          <Link to="/intern/daily-update" className="btn btn-success">Create First Update</Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Task</th>
                <th>Description</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {updates.map(update => (
                <tr key={update._id}>
                  <td>{new Date(update.update_date).toLocaleDateString()}</td>
                  <td>{update.task_id?.task_name || 'N/A'}</td>
                  <td className="text-truncate">{update.description || 'N/A'}</td>
                  <td>{update.hours_worked || 0} hrs</td>
                  <td>
                    <span className={`status-badge status-${update.status?.replace('_', '-')}`}>
                      {update.status || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DailyUpdateList;