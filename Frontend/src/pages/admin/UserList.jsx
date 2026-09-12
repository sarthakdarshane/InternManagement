import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get('/users');
        setUsers(response.data.users || response.data.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading users:', error);
        setError('Failed to load users');
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    if (!filterRole) return true;
    return user.role === filterRole;
  });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  const roleCounts = {
    ADMIN: users.filter(u => u.role === 'ADMIN').length,
    HR: users.filter(u => u.role === 'HR').length,
    MENTOR: users.filter(u => u.role === 'MENTOR').length,
    INTERN: users.filter(u => u.role === 'INTERN').length
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>User Management</h1>
        <Link to="/admin/users?role=ADMIN" className="btn btn-primary">Admins</Link>
        <Link to="/admin/users?role=HR" className="btn btn-secondary">HR</Link>
        <Link to="/admin/users?role=MENTOR" className="btn btn-success">Mentors</Link>
        <Link to="/admin/users?role=INTERN" className="btn btn-warning">Interns</Link>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{users.length}</p>
        </div>
        <div className="stat-card">
          <h3>Admins</h3>
          <p className="stat-number">{roleCounts.ADMIN}</p>
        </div>
        <div className="stat-card">
          <h3>HR</h3>
          <p className="stat-number">{roleCounts.HR}</p>
        </div>
        <div className="stat-card">
          <h3>Mentors</h3>
          <p className="stat-number">{roleCounts.MENTOR}</p>
        </div>
      </div>

      <div className="filter-bar">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="form-control"
          style={{ marginBottom: '20px', maxWidth: '200px' }}
        >
          <option value="">All Users</option>
          <option value="ADMIN">Admins</option>
          <option value="HR">HR</option>
          <option value="MENTOR">Mentors</option>
          <option value="INTERN">Interns</option>
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <h3>👥 No Users</h3>
          <p>No users found matching the selected criteria.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user._id}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.company_id?.name || user.company?.name || 'N/A'}</td>
                  <td>
                    <span className={`status-badge status-${user.status?.toLowerCase() || 'active'}`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserList;