import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const CompanyList = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await api.get('/companies');
        setCompanies(response.data.companies || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching companies:', error);
        setError('Failed to load companies');
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading companies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Companies</h1>
        <Link to="/admin/company" className="btn btn-primary">+ Add Company</Link>
      </header>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-message">No companies found. Create your first company!</td>
              </tr>
            ) : (
              companies.map(company => (
                <tr key={company._id}>
                  <td>{company.name}</td>
                  <td>{company.email}</td>
                  <td>{company.phone}</td>
                  <td>{company.address}</td>
                  <td>
                    <span className={`status-badge status-${company.status}`}>
                      {company.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/admin/company/${company._id}`} className="btn btn-secondary btn-sm">Edit</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompanyList;