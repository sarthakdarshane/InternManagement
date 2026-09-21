import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const HRDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ interns: 0, mentors: 0, companies: 0 });
  const [mentors, setMentors] = useState([]);
  const [mentorForm, setMentorForm] = useState({ name: '', email: '', password: '' });
  const [mentorMessage, setMentorMessage] = useState('');
  const [mentorError, setMentorError] = useState('');
  const [creatingMentor, setCreatingMentor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, internshipsRes] = await Promise.all([
          api.get('/users'),
          api.get('/internships')
        ]);
        const users = usersRes.data.users || [];
        setStats({
          interns: users.filter(u => u.role === 'INTERN').length,
          mentors: users.filter(u => u.role === 'MENTOR').length,
          companies: user?.company_id ? 1 : 0,
          internships: internshipsRes.data.count || internshipsRes.data.internships?.length || 0
        });
      } catch (error) {
        setError(error.response?.data?.message || 'Unable to load data.');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    api.get('/users/mentors')
      .then((response) => setMentors(response.data.mentors || []))
      .catch(() => setMentors([]));
  }, [user?.role]);

  const companyName = user?.company_name || user?.company?.name || 'your company';

  const handleMentorSubmit = async (event) => {
    event.preventDefault();
    setCreatingMentor(true);
    setMentorError('');
    setMentorMessage('');
    try {
      const response = await api.post('/users/mentor', mentorForm);
      setMentors((current) => [response.data.user, ...current]);
      setMentorForm({ name: '', email: '', password: '' });
      setMentorMessage('Mentor created successfully.');
    } catch (error) {
      setMentorError(error.response?.status === 409
        ? 'This email/login ID is already registered.'
        : error.response?.data?.message || 'Unable to create mentor.');
    } finally {
      setCreatingMentor(false);
    }
  };

  return (
    <div className="dashboard">
      <h1>{loading ? 'Loading company dashboard...' : `${companyName} Dashboard`}</h1>
      {loading && <p>Loading...</p>}
      {error && <div className="error-message">{error}</div>}
      <div className="stats-grid">
        <div className="stat-card"><h3>Interns</h3><p>{stats.interns}</p></div>
        <div className="stat-card"><h3>Mentors</h3><p>{stats.mentors}</p></div>
        <div className="stat-card"><h3>Companies</h3><p>{stats.companies}</p></div>
        <div className="stat-card"><h3>Internships</h3><p>{stats.internships || 0}</p></div>
      </div>
      <div className="dashboard-sections">
        {user?.role === 'ADMIN' && <section className="dashboard-section">
          <h2>Company management</h2>
          <div className="action-buttons">
            <Link to="/hr/internships" className="btn btn-primary">Manage Internships</Link>
            <Link to="/hr/internship" className="btn btn-secondary">Create Internship</Link>
          </div>
        </section>}
        <section className="dashboard-section">
          <h2>Create Mentor</h2>
          <p>New mentors will be assigned to {companyName}.</p>
          {mentorError && <div className="error-message">{mentorError}</div>}
          {mentorMessage && <div className="success-message">{mentorMessage}</div>}
          <form onSubmit={handleMentorSubmit} className="form-container">
            <input className="form-control" placeholder="Mentor name" value={mentorForm.name} onChange={(e) => setMentorForm({ ...mentorForm, name: e.target.value })} required />
            <input className="form-control" type="email" placeholder="Email/login ID" value={mentorForm.email} onChange={(e) => setMentorForm({ ...mentorForm, email: e.target.value })} required />
            <input className="form-control" type="password" placeholder="Temporary password" value={mentorForm.password} onChange={(e) => setMentorForm({ ...mentorForm, password: e.target.value })} minLength="6" required />
            <button className="btn btn-success" type="submit" disabled={creatingMentor}>{creatingMentor ? 'Creating...' : 'Create Mentor'}</button>
          </form>
          {mentors.length > 0 && <p className="text-muted">{mentors.length} mentor{mentors.length === 1 ? '' : 's'} in this company.</p>}
        </section>
      </div>
    </div>
  );
};

export default HRDashboard;