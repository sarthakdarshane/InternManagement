import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const SentimentView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSentiment = async () => {
      try {
        const response = await api.get('/sentiment/my-sentiment');
        setSentimentData(response.data.sentiment || null);
        setLoading(false);
      } catch (error) {
        console.error('Error loading sentiment:', error);
        setError('Failed to load sentiment analysis');
        setLoading(false);
      }
    };
    loadSentiment();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading sentiment analysis...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Sentiment Analysis</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {!sentimentData ? (
        <div className="empty-state">
          <h3>😊 No Sentiment Data</h3>
          <p>Sentiment analysis is performed on your daily update descriptions.</p>
          <p>Once you start creating daily updates, sentiment trends will be tracked here.</p>
        </div>
      ) : (
        <div className="sentiment-container">
          <div className="card">
            <h3>Sentiment Summary</h3>
            <div className="sentiment-stats">
              <div className="stat-item positive">
                <span className="stat-label">Positive</span>
                <span className="stat-value">{sentimentData.positive || 0}</span>
              </div>
              <div className="stat-item negative">
                <span className="stat-label">Negative</span>
                <span className="stat-value">{sentimentData.negative || 0}</span>
              </div>
              <div className="stat-item neutral">
                <span className="stat-label">Neutral</span>
                <span className="stat-value">{sentimentData.neutral || 0}</span>
              </div>
            </div>
            <div className="sentiment-average">
              <h4>Average Sentiment Score</h4>
              <p className="score-value">{sentimentData.average_score?.toFixed(2) || 'N/A'}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h3>About Sentiment Analysis</h3>
            <p>
              Sentiment analysis uses natural language processing to analyze the tone of your daily updates.
              This helps track your work satisfaction and engagement levels over time.
            </p>
            <p className="text-muted">
              Note: Sentiment scores are based on text analysis and are not a medical or psychological diagnosis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SentimentView;