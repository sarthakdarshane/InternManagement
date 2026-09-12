import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PerformanceView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Performance Metrics</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
      </header>

      <div className="page-content">
        <h2>Your Performance Overview</h2>
        <p>Performance metrics are calculated based on:</p>
        <ul>
          <li>Task completion and progress (30%)</li>
          <li>Daily activity and hours logged (20%)</li>
          <li>Mentor evaluation scores (40%)</li>
          <li>Sentiment analysis (10%)</li>
        </ul>
        
        <div className="performance-cards">
          <div className="card">
            <h3>Task Performance</h3>
            <p>Track your task completion and progress</p>
            <Link to="/intern/tasks" className="btn btn-primary">View Tasks</Link>
          </div>
          
          <div className="card">
            <h3>Daily Activity</h3>
            <p>Monitor your daily updates and hours</p>
            <Link to="/intern/updates" className="btn btn-success">View Updates</Link>
          </div>
          
          <div className="card">
            <h3>Evaluation Scores</h3>
            <p>View mentor evaluation ratings</p>
            <Link to="/intern/evaluation" className="btn btn-warning">View Evaluation</Link>
          </div>
          
          <div className="card">
            <h3>Sentiment Analysis</h3>
            <p>Track your work sentiment trends</p>
            <Link to="/intern/sentiment" className="btn btn-secondary">View Sentiment</Link>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Overall Performance</h3>
          <p>Your overall performance will be calculated from all sources above.</p>
          <p className="text-muted">This feature connects to the backend performance calculation endpoint.</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceView;