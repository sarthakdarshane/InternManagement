import React, { useState } from 'react';
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
    hours_worked: 0,
    status: 'COMPLETED'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/daily-updates', {
        ...formData,
        intern_id: user?._id
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

      <form onSubmit={handleSubmit} className="form-container">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label>Task *</label>
          <select
            name="task_id"
            value={formData.task_id}
            onChange={handleChange}
            className="form-control"
            required
          >
            <option value="">Select a task</option>
          </select>
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
          />
        </div>

        <div className="form-row">
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

        <button type="submit" className="btn btn-success" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Update'}
        </button>
      </form>
    </div>
  );
};

export default DailyUpdateForm;