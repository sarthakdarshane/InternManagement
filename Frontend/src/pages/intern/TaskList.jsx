import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TaskList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await api.get('/tasks/my-tasks');
        setTasks(response.data.tasks || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading tasks:', error);
        setError('Failed to load tasks');
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>My Tasks</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {tasks.length === 0 ? (
        <div className="empty-state">
          <h3>📋 No Tasks Assigned</h3>
          <p>Tasks will be assigned by your mentor.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Hours</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task._id}>
                  <td><strong>{task.task_name}</strong></td>
                  <td className="text-truncate">{task.description || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${task.status?.replace('_', '-')}`}>
                      {task.status || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${task.progress || 0}%` }}></div>
                    </div>
                    <span className="progress-text">{task.progress || 0}%</span>
                  </td>
                  <td>{task.hours_worked || 0} hrs</td>
                  <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TaskList;