import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const EvaluationView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadEvaluations = async () => {
      try {
        const response = await api.get('/evaluations/my-evaluations');
        setEvaluations(response.data.evaluations || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading evaluations:', error);
        setError('Failed to load evaluations');
        setLoading(false);
      }
    };
    loadEvaluations();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading evaluations...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Mentor Evaluations</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {evaluations.length === 0 ? (
        <div className="empty-state">
          <h3>⭐ No Evaluations Yet</h3>
          <p>Your mentor will evaluate your performance based on:</p>
          <ul>
            <li>Communication Skills (15%)</li>
            <li>Technical Skill (30%)</li>
            <li>Punctuality (15%)</li>
            <li>Task Completion (25%)</li>
            <li>Teamwork (15%)</li>
          </ul>
          <p>Evaluations are completed by your assigned mentor periodically.</p>
        </div>
      ) : (
        <div className="evaluations-container">
          {evaluations.map(evaluation => (
            <div key={evaluation._id} className="evaluation-card">
              <h4>Evaluation by {evaluation.mentor_id?.name || 'Mentor'}</h4>
              <p className="text-muted">{new Date(evaluation.created_at).toLocaleDateString()}</p>
              
              <div className="eval-grid">
                <div className="eval-item">
                  <label>Communication</label>
                  <span className="eval-score">{evaluation.communication || 'N/A'}/10</span>
                </div>
                <div className="eval-item">
                  <label>Technical Skill</label>
                  <span className="eval-score">{evaluation.technical_skill || 'N/A'}/10</span>
                </div>
                <div className="eval-item">
                  <label>Punctuality</label>
                  <span className="eval-score">{evaluation.punctuality || 'N/A'}/10</span>
                </div>
                <div className="eval-item">
                  <label>Task Completion</label>
                  <span className="eval-score">{evaluation.task_completion || 'N/A'}/10</span>
                </div>
                <div className="eval-item">
                  <label>Teamwork</label>
                  <span className="eval-score">{evaluation.teamwork || 'N/A'}/10</span>
                </div>
              </div>

              <div className="eval-final">
                <h5>Final Score</h5>
                <p className="final-score">{evaluation.final_score || 'N/A'}/10</p>
                <p className="eval-comment">{evaluation.comments || 'No comments'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EvaluationView;