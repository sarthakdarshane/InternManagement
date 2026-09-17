import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PerformanceView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPerformance = async () => {
      try {
        const response = await api.get('/evaluations/performance/my-performance');
        setPerformance(response.data.performance || null);
        setLoading(false);
      } catch (error) {
        console.error('Error loading performance:', error);
        setError('Failed to load performance data');
        setLoading(false);
      }
    };
    loadPerformance();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading performance metrics...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Performance Metrics</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {!performance ? (
        <div className="empty-state">
          <h3>📊 No Performance Data</h3>
          <p>Performance metrics are calculated from your tasks, daily updates, evaluations, and sentiment analysis.</p>
          <p>Once you have tasks, daily updates, and evaluations, your performance will appear here.</p>
        </div>
      ) : (
        <div className="page-content">
          <div className="performance-cards">
            <div className="card">
              <h3>Overall Performance</h3>
              <p className="performance-score">{performance.overall_performance || 'N/A'}</p>
              <p>Score: {performance.overall_score || 0}</p>
            </div>

            <div className="card">
              <h3>Tasks</h3>
              <p>Total: {performance.total_tasks || 0}</p>
              <p>Completed: {performance.completed_tasks || 0}</p>
              <p>Avg Progress: {performance.average_task_progress || 0}%</p>
            </div>

            <div className="card">
              <h3>Daily Activity</h3>
              <p>Updates: {performance.total_daily_updates || 0}</p>
              <p>Hours Logged: {performance.total_hours_worked || 0}</p>
              <p>Avg Activity: {performance.average_daily_activity || 0}%</p>
            </div>

            <div className="card">
              <h3>Evaluations</h3>
              <p>Count: {performance.evaluation_count || 0}</p>
              <p>Avg Score: {performance.average_evaluation_score || 0}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Sentiment Summary</h3>
            <p>Positive: {performance.sentiment_summary?.positive_count || 0}</p>
            <p>Neutral: {performance.sentiment_summary?.neutral_count || 0}</p>
            <p>Negative: {performance.sentiment_summary?.negative_count || 0}</p>
            <p>Average Score: {performance.sentiment_summary?.average_score || 0}</p>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h3>More</h3>
            <Link to="/intern/tasks" className="btn btn-primary">View Tasks</Link>{' '}
            <Link to="/intern/updates" className="btn btn-success">View Updates</Link>{' '}
            <Link to="/intern/evaluation" className="btn btn-warning">View Evaluations</Link>{' '}
            <Link to="/intern/sentiment" className="btn btn-secondary">View Sentiment</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceView;