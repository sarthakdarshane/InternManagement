import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const HRDashboard = () => {
  const [stats, setStats] = useState({ interns: 0, mentors: 0, companies: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, companiesRes] = await Promise.all([
          api.get('/users'),
          api.get('/companies')
        ]);
        const users = usersRes.data.users || [];
        setStats({
          interns: users.filter(u => u.role === 'INTERN').length,
          mentors: users.filter(u => u.role === 'MENTOR').length,
          companies: companiesRes.data.count || 0
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="dashboard">
      <h1>HR Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card"><h3>Interns</h3><p>{stats.interns}</p></div>
        <div className="stat-card"><h3>Mentors</h3><p>{stats.mentors}</p></div>
        <div className="stat-card"><h3>Companies</h3><p>{stats.companies}</p></div>
      </div>
    </div>
  );
};

export default HRDashboard;