import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const InternshipList = () => {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const loadInternships = async () => {
      try {
        const response = await api.get('/internships');
        setInternships(response.data.internships || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading internships:', error);
        setError('Failed to load internships');
        setLoading(false);
      }
    };
    loadInternships();
  }, []);

  const filteredInternships = internships.filter(internship => {
    if (!filter) return true;
    const search = filter.toLowerCase();
    return (
      internship.role_name?.toLowerCase().includes(search) ||
      internship.status?.toLowerCase().includes(search) ||
      internship.company_id?.name?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading internships...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Internships</h1>
        <Link to="/admin/internship" className="btn btn-primary">+ Create Internship</Link>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter by role, status, or company..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="form-control"
          style={{ maxWidth: '300px', marginBottom: '20px' }}
        />
      </div>

      {filteredInternships.length === 0 ? (
        <div className="empty-state">
          <h3>🎓 No Internships</h3>
          <p>Create your first internship to get started.</p>
          <Link to="/admin/internship" className="btn btn-primary">Create Internship</Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Intern</th>
                <th>Company</th>
                <th>Mentor</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInternships.map(internship => (
                <tr key={internship._id}>
                  <td><strong>{internship.role_name}</strong></td>
                  <td>{internship.intern_id?.name || internship.intern?.name || 'N/A'}</td>
                  <td>{internship.company_id?.name || 'N/A'}</td>
                  <td>{internship.mentor_id?.name || internship.mentor?.name || 'Not assigned'}</td>
                  <td>{new Date(internship.start_date).toLocaleDateString()}</td>
                  <td>{internship.end_date ? new Date(internship.end_date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${internship.status}`}>
                      {internship.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/admin/internship/${internship._id}`} className="btn btn-secondary btn-sm">Edit</Link>
                    <Link to={`/intern/offer-letter/${internship._id}`} className="btn btn-primary btn-sm" target="_blank">
                      View Offer Letter
                    </Link>
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

export default InternshipList;