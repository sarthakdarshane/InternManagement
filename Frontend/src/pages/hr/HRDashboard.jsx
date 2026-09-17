import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const HRDashboard = () => {
  const [stats, setStats] = useState({ interns: 0, mentors: 0, companies: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, companiesRes, internshipsRes] = await Promise.all([
          api.get('/users'),
          api.get('/companies'),
          api.get('/internships')
        ]);
        const users = usersRes.data.users || [];
        setStats({
          interns: users.filter(u => u.role === 'INTERN').length,
          mentors: users.filter(u => u.role === 'MENTOR').length,
          companies: companiesRes.data.count || companiesRes.data.companies?.length || 0,
          internships: internshipsRes.data.count || internshipsRes.data.internships?.length || 0
        });
      } catch (error) {
        setError(error.response?.data?.message || 'Unable to load data.');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="dashboard">
      <h1>Company Dashboard</h1>
      {loading && <p>Loading...</p>}
      {error && <div className="error-message">{error}</div>}
      <div className="stats-grid">
        <div className="stat-card"><h3>Interns</h3><p>{stats.interns}</p></div>
        <div className="stat-card"><h3>Mentors</h3><p>{stats.mentors}</p></div>
        <div className="stat-card"><h3>Companies</h3><p>{stats.companies}</p></div>
        <div className="stat-card"><h3>Internships</h3><p>{stats.internships || 0}</p></div>
      </div>
      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2>Company management</h2>
          <div className="action-buttons">
            <Link to="/hr/internships" className="btn btn-primary">Manage Internships</Link>
            <Link to="/hr/company" className="btn btn-secondary">Company Details</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HRDashboard;