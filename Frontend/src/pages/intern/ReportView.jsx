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
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Status</th>
                <th>Performance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report._id}>
                  <td>{report.report_period || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${report.status?.toLowerCase() || 'active'}`}>
                      {report.status || 'Active'}
                    </span>
                  </td>
                  <td>{report.overall_performance || 'N/A'}</td>
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

export default ReportView;