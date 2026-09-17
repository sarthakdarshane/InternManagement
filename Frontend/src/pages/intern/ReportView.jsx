import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ReportView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await api.get('/reports/my-reports');
        setReports(response.data.reports || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading reports:', error);
        setError('Failed to load reports');
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  const renderSentiment = (sentiment) => {
    if (!sentiment) return 'N/A';
    return `Pos: ${sentiment.positive_count || 0} | Neu: ${sentiment.neutral_count || 0} | Neg: ${sentiment.negative_count || 0} | Avg Score: ${sentiment.average_score || 0}`;
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Monthly Reports</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">Back</button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {reports.length === 0 ? (
        <div className="empty-state">
          <h3>📄 No Reports Yet</h3>
          <p>Monthly reports are generated automatically or can be created manually.</p>
          <p>Reports combine data from your tasks, daily updates, evaluations, and sentiment analysis.</p>
          <div className="card" style={{ marginTop: '20px' }}>
            <h4>Report Information</h4>
            <ul>
              <li>Generated monthly (1st of each month for previous month)</li>
              <li>Contains task statistics</li>
              <li>Daily activity summary</li>
              <li>Sentiment analysis</li>
              <li>Evaluation scores</li>
              <li>Overall performance rating</li>
            </ul>
          </div>
        </div>
      ) : selectedReport ? (
        <div className="card" style={{ marginTop: '20px' }}>
          <header className="page-header">
            <h3>Report: {selectedReport.report_period || 'N/A'}</h3>
            <button onClick={() => setSelectedReport(null)} className="btn btn-secondary">Back to list</button>
          </header>
          <div className="report-details">
            <p><strong>Overall Performance:</strong> {selectedReport.overall_performance || 'N/A'}</p>
            <p><strong>Duration (days):</strong> {selectedReport.duration_days || 0}</p>
            <p><strong>Expected Working Days:</strong> {selectedReport.expected_working_days || 0}</p>
            <p><strong>Expected Tasks:</strong> {selectedReport.expected_tasks || 0}</p>
            <p><strong>Completed Tasks:</strong> {selectedReport.completed_tasks || 0}</p>
            <p><strong>Pending Tasks:</strong> {selectedReport.pending_tasks || 0}</p>
            <p><strong>Delayed Tasks:</strong> {selectedReport.delayed_tasks || 0}</p>
            <p><strong>Completion Percentage:</strong> {selectedReport.completion_percentage || 0}%</p>
            <p><strong>Total Hours:</strong> {selectedReport.total_hours || 0}</p>
            <p><strong>Overtime Hours:</strong> {selectedReport.overtime_hours || 0}</p>
            <p><strong>Evaluation Score:</strong> {selectedReport.evaluation_score || 'N/A'}</p>
            <p><strong>Sentiment Summary:</strong> {renderSentiment(selectedReport.sentiment_summary)}</p>
            <p className="text-muted">Generated: {new Date(selectedReport.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Performance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td>{report.report_period || 'N/A'}</td>
                  <td>{report.overall_performance || 'N/A'}</td>
                  <td>
                    <button onClick={() => setSelectedReport(report)} className="btn btn-secondary btn-sm">View</button>
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

export default ReportView;