import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const InternshipList = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const isCreatePage = location.pathname === '/hr/internship';
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({ role_name: '', start_date: '', end_date: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInternships = async () => {
      try {
        const response = await api.get('/internships');
        setInternships(response.data.internships || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading internships:', error);
        setError(error.response?.status === 403
          ? 'You do not have permission to view these internships.'
          : error.response?.data?.message || 'Failed to load internships');
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

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/internships', {
        role_name: formData.role_name,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined
      });
      navigate('/hr/internships');
    } catch (error) {
      setError(error.response?.status === 403
        ? 'You can only create internships for your own company.'
        : error.response?.data?.message || 'Failed to create internship');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCreatePage) {
    if (!isAdmin) return <div className="page-error"><p>You do not have permission to create internships.</p></div>;
    const companyName = user?.company_name || user?.company?.name || 'your company';
    return (
      <div className="page">
        <header className="page-header">
          <h1>Create Internship</h1>
          <button onClick={() => navigate('/hr/internships')} className="btn btn-secondary">Cancel</button>
        </header>
        <p>Creating this internship for {companyName}.</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleCreate} className="form-container">
          <div className="form-group">
            <label>Role or title *</label>
            <input className="form-control" value={formData.role_name} onChange={(e) => setFormData({ ...formData, role_name: e.target.value })} required maxLength="100" />
          </div>
          <div className="form-group">
            <label>Start date *</label>
            <input className="form-control" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>End date</label>
            <input className="form-control" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} min={formData.start_date || undefined} />
          </div>
          <button type="submit" className="btn btn-success" disabled={submitting}>{submitting ? 'Creating...' : 'Create Internship'}</button>
        </form>
      </div>
    );
  }

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
        {isAdmin && <Link to="/hr/internship" className="btn btn-primary">+ Create Internship</Link>}
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
          {isAdmin && <Link to="/hr/internship" className="btn btn-primary">Create Internship</Link>}
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
                <tr key={internship.id || internship._id}>
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
                    <span className="text-muted">Company internship</span>
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