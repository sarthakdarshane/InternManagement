import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TaskForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    internship_id: '',
    intern_id: '',
    mentor_id: user?._id || '',
    task_name: '',
    description: '',
    assigned_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'PENDING',
    progress: 0,
    hours_worked: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/tasks', formData);
      navigate('/mentor/tasks');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create task');
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
        <h1>Create Task</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
      </header>

      <form onSubmit={handleSubmit} className="form-container">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Task Name *</label>
          <input
            type="text"
            name="task_name"
            value={formData.task_name}
            onChange={handleChange}
            className="form-control"
            required
            placeholder="Enter task name"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-control"
            rows="3"
            placeholder="Enter task description"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Assigned Date *</label>
            <input
              type="date"
              name="assigned_date"
              value={formData.assigned_date}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="form-control"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="form-control"
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="DELAYED">Delayed</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Progress (%)</label>
            <input
              type="number"
              name="progress"
              value={formData.progress}
              onChange={handleChange}
              className="form-control"
              min="0"
              max="100"
            />
          </div>
          <div className="form-group">
            <label>Hours Worked</label>
            <input
              type="number"
              name="hours_worked"
              value={formData.hours_worked}
              onChange={handleChange}
              className="form-control"
              min="0"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-success" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;