import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const DailyUpdateForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    task_id: '',
    update_date: new Date().toISOString().split('T')[0],
    description: '',
    progress: 0,
    hours_worked: 0,
    status: 'COMPLETED'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const isWeekend = [0, 6].includes(new Date().getDay());

  useEffect(() => {
    const loadTasks = async () => {
      if (isWeekend) {
        setTasksLoading(false);
        return;
      }
      try {
        const response = await api.get('/tasks/my-tasks');
        setTasks(response.data.tasks || []);
      } catch (err) {
        console.error('Error loading tasks:', err);
        setTasksError(err.response?.data?.message || 'Failed to load tasks');
      } finally {
        setTasksLoading(false);
      }
    };
    loadTasks();
  }, [isWeekend]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const progress = Number(formData.progress);
    const hoursWorked = Number(formData.hours_worked);

    if (!formData.task_id) {
      setError('Select a task before submitting the update');
      return;
    }
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      setError('Progress must be between 0 and 100');
      return;
    }
    if (!Number.isFinite(hoursWorked) || hoursWorked < 0 || hoursWorked > 24) {
      setError('Hours worked must be between 0 and 24');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/daily-updates', {
        ...formData,
        progress,
        hours_worked: hoursWorked,
        // The auth payload exposes the user id as `id` (backend login/register
        // responses), so `_id` would send undefined and fail validation.
        intern_id: user?.id
      });
      navigate('/intern/updates');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create daily update');
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Daily Update</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
      </header>

      {isWeekend && <div className="empty-state"><h3>Weekend / No task</h3><p>Saturday and Sunday are off days.</p></div>}

      <form onSubmit={handleSubmit} className="form-container">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Task *</label>
          {tasksLoading ? (
            <div className="loading-select">
              <select className="form-control" disabled>
                <option value="">Loading tasks...</option>
              </select>
            </div>
          ) : tasksError ? (
            <div className="error-message">{tasksError}</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks assigned to you yet.</p>
              <p className="text-muted">Ask your mentor to assign a task first.</p>
            </div>
          ) : (
            <select
              name="task_id"
              value={formData.task_id}
              onChange={handleChange}
              className="form-control"
              required
            >
              <option value="">Select a task</option>
              {tasks.map(task => (
                <option key={task.id || task._id} value={task.id || task._id}>
                  {task.task_name} ({task.status})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            name="update_date"
            value={formData.update_date}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-control"
            rows="4"
            placeholder="Describe your work today..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Progress (%) *</label>
            <input
              type="number"
              name="progress"
              value={formData.progress}
              onChange={handleChange}
              className="form-control"
              required
              min="0"
              max="100"
            />
          </div>
          <div className="form-group">
            <label>Hours Worked *</label>
            <input
              type="number"
              name="hours_worked"
              value={formData.hours_worked}
              onChange={handleChange}
              className="form-control"
              required
              min="0"
              max="24"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-control"
            >
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-success" disabled={submitting || isWeekend}>
          {submitting ? 'Saving...' : 'Save Update'}
        </button>
      </form>
    </div>
  );
};

export default DailyUpdateForm;